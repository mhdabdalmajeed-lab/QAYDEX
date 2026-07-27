import "server-only";

import { and, eq, sql as sqlOp } from "drizzle-orm";
import { nanoid } from "nanoid";
import type OpenAI from "openai";
import { z } from "zod";

import { db } from "@/db";
import {
  approvedModels,
  auditInputs,
  auditJobStages,
  auditJobs,
  auditRevisions,
  audits,
  clients,
  entities,
  evidenceRefs,
  findings,
  inputDocuments,
  outputBlocks,
  workspaces,
} from "@/db/schema";
import type {
  AuditPlan,
  InputSnapshotEntry,
  InstructionSnapshotEntry,
  QualityReviewResult,
  ToolCallRecord,
} from "@/db/schema";
import { auditBlockSchema, type AuditBlock } from "@/lib/ai/blocks/schemas";
import { generateStructured, openai } from "@/lib/ai/client";
import { renderInstructions, resolveInstructions } from "@/lib/ai/instructions";
import {
  describeSkippedImages,
  imageContentParts,
  loadImageEvidence,
} from "@/lib/ai/vision";
import { BLOCK_SCHEMA_VERSION, FALLBACK_MODEL_ID, PROMPT_VERSION } from "@/lib/ai/models";
import {
  auditContextBlock,
  analystSystemPrompt,
  interfaceSystemPrompt,
  plannerSystemPrompt,
  qualityReviewSystemPrompt,
} from "@/lib/ai/prompts";
import { AUDIT_TOOLS, executeToolCall } from "@/lib/ai/tools";
import { logActivity } from "@/lib/activity";

/**
 * The nine-stage audit pipeline (PRD §22).
 *
 * Each stage is a separate, independently retryable row in `audit_job_stages`, so a failure
 * in (say) quality review does not force re-parsing or re-analysing everything (PRD §26.1).
 * Stages that already completed are skipped on retry, which is what makes a retry cheap.
 *
 * The revision is the immutable unit of record: nothing is written back onto a published
 * revision, and re-running always means a new one (PRD §23, §26.3).
 */

export const STAGES = [
  "intake",
  "parsing",
  "context",
  "planning",
  "analysis",
  "evidence_review",
  "interface_generation",
  "quality_review",
  "publication",
] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  intake: "Reading inputs",
  parsing: "Parsing evidence",
  context: "Organising context",
  planning: "Planning the audit",
  analysis: "Investigating",
  evidence_review: "Checking evidence",
  interface_generation: "Building the audit",
  quality_review: "Quality review",
  publication: "Publishing",
};

const planSchema = z.object({
  objective: z.string(),
  audience: z.string(),
  approach: z.array(z.string()).describe("The steps you will take, in order."),
  investigationTargets: z.array(
    z.object({
      id: z.string(),
      area: z.string(),
      rationale: z.string().describe("Why this is worth investigating for THIS audit."),
      instructionRefs: z.array(z.string()).describe("Which instructions drive this target."),
      evidenceNeeded: z.array(z.string()),
    }),
  ),
  missingEvidence: z.array(z.string()).describe("Evidence you want but do not have."),
  clarifyingQuestions: z
    .array(z.string())
    .describe("Only questions whose answers would genuinely change the audit. Usually empty."),
  plannedComparisons: z.array(z.string()),
});

const analysisSchema = z.object({
  summary: z.string().describe("What you found, in a few sentences."),
  reliability: z
    .string()
    .describe("Whether the population could be relied on, and what caps your conclusions."),
  investigated: z.array(
    z.object({
      area: z.string(),
      whatYouDid: z.string(),
      whatYouFound: z.string(),
      evidence: z.array(z.string()).describe("documentId + row/page references you actually read."),
    }),
  ),
  couldNotCheck: z.array(z.string()),
});

const interfaceSchema = z.object({
  summary: z.string().describe("The audit's overall summary, 2-4 sentences."),
  overallRisk: z.enum(["critical", "high", "medium", "low", "none"]),
  blocks: z.array(auditBlockSchema).describe("The audit, in reading order."),
});

const qualityReviewSchema = z.object({
  passed: z.boolean(),
  score: z.number().min(0).max(100),
  summary: z.string(),
  checks: z.array(
    z.object({
      key: z.enum([
        "instruction_compliance",
        "evidence_coverage",
        "unsupported_conclusions",
        "numerical_consistency",
        "internal_contradictions",
        "missing_sections",
        "presentation_quality",
      ]),
      label: z.string(),
      passed: z.boolean(),
      severity: z.enum(["critical", "high", "medium", "low", "info"]),
      detail: z.string().describe("Cite the specific block or finding. Be concrete."),
    }),
  ),
});

function toBulletList(items: string[]): string | null {
  if (!items || items.length === 0) return null;
  return items.map((item) => `• ${item}`).join("\n");
}

type StageRunner = (ctx: EngineContext) => Promise<Record<string, unknown>>;

type EngineContext = {
  jobId: string;
  auditId: string;
  revisionId: string;
  workspaceId: string;
  modelId: string;
  effort: "none" | "low" | "medium" | "high" | "xhigh";
  /** Carried between stages within one run; re-read from the DB on a retry. */
  memo: Record<string, unknown>;
};

async function setStage(
  jobId: string,
  stage: Stage,
  patch: Partial<typeof auditJobStages.$inferInsert>,
) {
  await db
    .update(auditJobStages)
    .set(patch)
    .where(and(eq(auditJobStages.jobId, jobId), eq(auditJobStages.stage, stage)));
}

export async function resolveModel(workspaceId: string): Promise<{ modelId: string; effort: "none" | "low" | "medium" | "high" | "xhigh" }> {
  // Workspace-approved default wins; otherwise the platform default. Never "whatever is
  // newest" — that is exactly what PRD §23 forbids.
  const rows = await db
    .select()
    .from(approvedModels)
    .where(eq(approvedModels.status, "approved"));

  const scoped = rows.filter((r) => r.workspaceId === workspaceId);
  const global = rows.filter((r) => r.workspaceId === null);
  const chosen =
    scoped.find((r) => r.isDefault) ?? global.find((r) => r.isDefault) ?? global[0] ?? null;

  if (!chosen) return { modelId: FALLBACK_MODEL_ID, effort: "medium" };
  const effort = (chosen.params?.reasoningEffort as EngineContext["effort"]) ?? "medium";
  return { modelId: chosen.modelId, effort };
}

async function loadAuditContext(auditId: string) {
  const [audit] = await db.select().from(audits).where(eq(audits.id, auditId)).limit(1);
  if (!audit) throw new Error(`Audit ${auditId} not found`);

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, audit.workspaceId))
    .limit(1);

  const entity = audit.entityId
    ? (await db.select().from(entities).where(eq(entities.id, audit.entityId)).limit(1))[0]
    : null;
  const client = audit.clientId
    ? (await db.select().from(clients).where(eq(clients.id, audit.clientId)).limit(1))[0]
    : null;

  return { audit, workspace, entity, client };
}

function renderAuditHeader(ctx: Awaited<ReturnType<typeof loadAuditContext>>): string {
  return auditContextBlock({
    name: ctx.audit.name,
    objective: ctx.audit.objective,
    scope: ctx.audit.scope,
    domain: ctx.audit.domain,
    periodLabel: ctx.audit.periodLabel,
    periodStart: ctx.audit.periodStart,
    periodEnd: ctx.audit.periodEnd,
    entityName: ctx.entity?.legalName ?? null,
    clientName: ctx.client?.name ?? null,
    workspaceType: ctx.workspace?.type ?? "internal",
    baseCurrency: ctx.workspace?.baseCurrency ?? "USD",
    accountingStandards: ctx.workspace?.accountingStandards ?? null,
  });
}

/** A compact manifest so the model knows what exists before it starts calling tools. */
async function renderInputManifest(auditId: string): Promise<string> {
  const inputs = await db
    .select()
    .from(auditInputs)
    .where(eq(auditInputs.auditId, auditId));

  if (inputs.length === 0) return "## Evidence\n\nNo inputs were provided for this audit.";

  const docs = await db
    .select()
    .from(inputDocuments)
    .where(
      sqlOp`${inputDocuments.inputId} in ${sqlOp.raw(`(${inputs.map((i) => `'${i.id}'`).join(",")})`)}`,
    );

  const lines = inputs.map((input) => {
    const mine = docs.filter((d) => d.inputId === input.id);
    const docLines = mine.map(
      (d) =>
        `    - documentId=${d.id} · ${d.kind}${d.sheetName ? ` · sheet "${d.sheetName}"` : ""}` +
        `${d.pageNumber ? ` · page ${d.pageNumber}` : ""} · ${d.rowCount ?? 0} rows` +
        `${d.truncated ? " (TRUNCATED)" : ""}` +
        `${d.columns.length ? ` · columns: ${d.columns.map((c) => c.label).join(", ")}` : ""}`,
    );

    const warnings = input.warnings.length
      ? `\n    ! warnings: ${input.warnings.map((w) => w.message).join("; ")}`
      : "";

    const text =
      input.kind === "text" && input.textContent
        ? `\n    text: ${input.textContent.slice(0, 4000)}`
        : "";

    return `  - inputId=${input.id} · "${input.name}" · ${input.kind} · status=${input.status}${warnings}${text}\n${docLines.join("\n")}`;
  });

  return `## Evidence available\n\n${lines.join("\n")}\n\nUse the tools to read any of this. The ids above are the ones to cite.`;
}

const RUNNERS: Record<Stage, StageRunner> = {
  async intake(ctx) {
    const instructionSet = await resolveInstructions(ctx.auditId);
    const inputs = await db.select().from(auditInputs).where(eq(auditInputs.auditId, ctx.auditId));

    // The snapshot is what makes the revision reproducible: editing an instruction or
    // removing an input later must not change what this audit was run against (PRD §9.4).
    const snapshot: InputSnapshotEntry[] = [];
    for (const input of inputs) {
      const docs = await db
        .select({ id: inputDocuments.id, rowCount: inputDocuments.rowCount })
        .from(inputDocuments)
        .where(eq(inputDocuments.inputId, input.id));
      snapshot.push({
        inputId: input.id,
        kind: input.kind,
        name: input.name,
        checksum: input.checksum ?? undefined,
        documentIds: docs.map((d) => d.id),
        rowCount: docs.reduce((n, d) => n + (d.rowCount ?? 0), 0),
        status: input.status,
      });
    }

    await db
      .update(auditRevisions)
      .set({ instructionSnapshot: instructionSet, inputSnapshot: snapshot })
      .where(eq(auditRevisions.id, ctx.revisionId));

    ctx.memo.instructions = instructionSet;
    return { instructionCount: instructionSet.length, inputCount: inputs.length };
  },

  async parsing(ctx) {
    // Files are parsed at upload time so the user sees status immediately (PRD §8.6). This
    // stage therefore verifies rather than re-parses, and refuses to pretend an unreadable
    // input was understood (PRD §26.3: inputs are never silently dropped).
    const inputs = await db.select().from(auditInputs).where(eq(auditInputs.auditId, ctx.auditId));
    const pending = inputs.filter((i) => i.status === "pending" || i.status === "parsing");
    const failed = inputs.filter((i) => i.status === "failed" || i.status === "unsupported");

    return {
      parsed: inputs.filter((i) => i.status === "parsed").length,
      pending: pending.length,
      unreadable: failed.map((f) => ({ name: f.name, status: f.status, error: f.parseError })),
    };
  },

  async context(ctx) {
    const manifest = await renderInputManifest(ctx.auditId);
    ctx.memo.manifest = manifest;
    const docCount = (manifest.match(/documentId=/g) ?? []).length;
    return { documents: docCount, manifestChars: manifest.length };
  },

  async planning(ctx) {
    const auditCtx = await loadAuditContext(ctx.auditId);
    const instructionSet =
      (ctx.memo.instructions as InstructionSnapshotEntry[]) ?? (await resolveInstructions(ctx.auditId));
    const manifest = (ctx.memo.manifest as string) ?? (await renderInputManifest(ctx.auditId));

    const plan = await generateStructured({
      model: ctx.modelId,
      effort: ctx.effort,
      schema: planSchema,
      schemaName: "audit_plan",
      system: plannerSystemPrompt(),
      context: {
        workspaceId: ctx.workspaceId,
        stage: "planning",
        jobId: ctx.jobId,
        revisionId: ctx.revisionId,
      },
      input: `${renderAuditHeader(auditCtx)}\n\n## Instructions (highest authority first)\n\n${renderInstructions(instructionSet)}\n\n${manifest}\n\nProduce the audit plan.`,
    });

    await db
      .update(auditRevisions)
      .set({ plan: plan as AuditPlan })
      .where(eq(auditRevisions.id, ctx.revisionId));

    ctx.memo.plan = plan;
    return { targets: plan.investigationTargets.length, questions: plan.clarifyingQuestions.length };
  },

  async analysis(ctx) {
    const auditCtx = await loadAuditContext(ctx.auditId);
    const instructionSet =
      (ctx.memo.instructions as InstructionSnapshotEntry[]) ?? (await resolveInstructions(ctx.auditId));
    const manifest = (ctx.memo.manifest as string) ?? (await renderInputManifest(ctx.auditId));
    const [revision] = await db
      .select()
      .from(auditRevisions)
      .where(eq(auditRevisions.id, ctx.revisionId))
      .limit(1);
    const plan = (ctx.memo.plan as AuditPlan | undefined) ?? revision?.plan ?? null;

    // Images carry no rows for the tools to return, so they travel in the message itself.
    const imageEvidence = await loadImageEvidence(ctx.auditId);
    ctx.memo.imageCount = imageEvidence.images.length;

    const toolRecords: ToolCallRecord[] = [];
    const history: OpenAI.Responses.ResponseInput = [
      {
        role: "user",
        content: [
          {
            type: "input_text",
            text: `${renderAuditHeader(auditCtx)}\n\n## Instructions (highest authority first)\n\n${renderInstructions(instructionSet)}\n\n${manifest}${describeSkippedImages(imageEvidence)}\n\n## Your plan\n\n${JSON.stringify(plan, null, 2)}\n\nInvestigate now. Use the tools for everything except the images below — the tools are your only access to the rest of the evidence.`,
          },
          ...imageContentParts(imageEvidence),
        ],
      },
    ];

    const client = openai();
    const MAX_TURNS = 24;
    let turns = 0;

    // Tool loop: the model drives, the platform computes. It ends when the model stops
    // asking for data.
    while (turns < MAX_TURNS) {
      turns += 1;
      const response = await client.responses.create({
        model: ctx.modelId,
        instructions: analystSystemPrompt(),
        input: history,
        reasoning: { effort: ctx.effort },
        text: { verbosity: "low" },
        tools: AUDIT_TOOLS,
        max_output_tokens: 32_000,
      });

      const calls = (response.output ?? []).filter(
        (item): item is OpenAI.Responses.ResponseFunctionToolCall => item.type === "function_call",
      );

      for (const item of response.output ?? []) {
        history.push(item as OpenAI.Responses.ResponseInputItem);
      }

      if (calls.length === 0) break;

      for (const call of calls) {
        const { result, record } = await executeToolCall(call.name, call.arguments, {
          auditId: ctx.auditId,
          workspaceId: ctx.workspaceId,
        });
        toolRecords.push(record);
        history.push({
          type: "function_call_output",
          call_id: call.call_id,
          output: JSON.stringify(result).slice(0, 120_000),
        });
      }
    }

    const findingsSummary = await generateStructured({
      model: ctx.modelId,
      effort: "low",
      schema: analysisSchema,
      schemaName: "analysis_summary",
      system: analystSystemPrompt(),
      context: {
        workspaceId: ctx.workspaceId,
        stage: "analysis",
        jobId: ctx.jobId,
        revisionId: ctx.revisionId,
      },
      toolCalls: toolRecords,
      input: [
        ...history,
        { role: "user", content: "Summarise your investigation: what you did, what you found, and what you could not check." },
      ],
    });

    ctx.memo.analysis = findingsSummary;
    ctx.memo.toolRecords = toolRecords;
    ctx.memo.history = history;

    return {
      toolCalls: toolRecords.length,
      turns,
      hitTurnLimit: turns >= MAX_TURNS,
      areas: findingsSummary.investigated.length,
    };
  },

  async evidence_review() {
    // Deterministic verification runs after interface generation, once there are blocks and
    // findings to check. Kept as its own stage so the pipeline order matches PRD §22.
    return { note: "Verification runs against generated blocks in interface_generation." };
  },

  async interface_generation(ctx) {
    const auditCtx = await loadAuditContext(ctx.auditId);
    const instructionSet =
      (ctx.memo.instructions as InstructionSnapshotEntry[]) ?? (await resolveInstructions(ctx.auditId));
    const manifest = (ctx.memo.manifest as string) ?? (await renderInputManifest(ctx.auditId));
    const analysis = ctx.memo.analysis;
    const history = (ctx.memo.history as OpenAI.Responses.ResponseInput) ?? [];

    const generated = await generateStructured({
      model: ctx.modelId,
      effort: ctx.effort,
      schema: interfaceSchema,
      schemaName: "audit_interface",
      maxOutputTokens: 64_000,
      system: interfaceSystemPrompt(),
      context: {
        workspaceId: ctx.workspaceId,
        stage: "interface_generation",
        jobId: ctx.jobId,
        revisionId: ctx.revisionId,
      },
      input: [
        ...history.slice(0, 1),
        {
          role: "user",
          content: `${renderAuditHeader(auditCtx)}\n\n## Instructions\n\n${renderInstructions(instructionSet)}\n\n${manifest}\n\n## Your investigation\n\n${JSON.stringify(analysis, null, 2)}\n\nNow build the audit. Choose and order the blocks yourself. Every id you cite in \`evidence\` must be a real inputId/documentId from the manifest above.`,
        },
      ],
    });

    // Verification is deterministic and happens before anything is stored: a citation that
    // does not resolve is not evidence, and a claim resting on it must not be presented as
    // supported (PRD §22.6).
    const validInputIds = new Set(
      (await db.select({ id: auditInputs.id }).from(auditInputs).where(eq(auditInputs.auditId, ctx.auditId))).map(
        (r) => r.id,
      ),
    );
    const validDocIds = new Set(
      (
        await db
          .select({ id: inputDocuments.id })
          .from(inputDocuments)
          .where(eq(inputDocuments.workspaceId, ctx.workspaceId))
      ).map((r) => r.id),
    );

    const problems: string[] = [];
    const blocks: AuditBlock[] = [];

    for (const block of generated.blocks) {
      const kept = block.evidence.filter((e) => {
        const inputOk = validInputIds.has(e.inputId);
        const docOk = e.documentId === null || validDocIds.has(e.documentId);
        if (!inputOk) problems.push(`${block.type} "${block.title}": cites unknown inputId ${e.inputId}`);
        else if (!docOk)
          problems.push(`${block.type} "${block.title}": cites unknown documentId ${e.documentId}`);
        return inputOk && docOk;
      });

      let claimType = block.claimType;
      // Demote rather than drop: the reader still sees the analysis, correctly labelled.
      if (claimType === "evidence_supported" && kept.length === 0) {
        claimType = "unverified_hypothesis";
        problems.push(
          `${block.type} "${block.title}": claimed evidence_supported with no resolvable citation — demoted to unverified_hypothesis`,
        );
      }

      blocks.push({ ...block, evidence: kept, claimType } as AuditBlock);
    }

    await db.transaction(async (tx) => {
      await tx.delete(outputBlocks).where(eq(outputBlocks.revisionId, ctx.revisionId));
      await tx.delete(findings).where(eq(findings.revisionId, ctx.revisionId));

      for (const [position, block] of blocks.entries()) {
        const [row] = await tx
          .insert(outputBlocks)
          .values({
            workspaceId: ctx.workspaceId,
            auditId: ctx.auditId,
            revisionId: ctx.revisionId,
            type: block.type,
            position,
            title: block.title,
            content: block as unknown as Record<string, unknown>,
            schemaVersion: BLOCK_SCHEMA_VERSION,
          })
          .returning({ id: outputBlocks.id });

        for (const e of block.evidence) {
          await tx.insert(evidenceRefs).values({
            workspaceId: ctx.workspaceId,
            revisionId: ctx.revisionId,
            blockId: row.id,
            inputId: e.inputId,
            documentId: e.documentId,
            locator: {
              sheet: e.sheet ?? undefined,
              page: e.page ?? undefined,
              rowFrom: e.rowFrom ?? undefined,
              rowTo: e.rowTo ?? undefined,
              columns: e.columns ?? undefined,
              cell: e.cell ?? undefined,
              section: e.section ?? undefined,
            },
            excerpt: e.excerpt,
            label: e.label,
          });
        }

        if (block.type === "finding_card") {
          const [finding] = await tx
            .insert(findings)
            .values({
              workspaceId: ctx.workspaceId,
              auditId: ctx.auditId,
              revisionId: ctx.revisionId,
              key: block.findingRef || nanoid(10),
              title: block.title,
              summary: block.summary,
              detail: block.detail,
              riskCategory: block.riskCategory,
              severity: block.severity,
              confidence: block.confidence,
              claimType: block.claimType,
              financialImpact:
                block.financialImpact ? String(block.financialImpact.amount) : null,
              financialImpactCurrency: block.financialImpact?.currency ?? null,
              impactBasis: block.impactBasis,
              affectedPeriods: block.affectedPeriods,
              affectedEntities: block.affectedEntities,
              affectedAccounts: block.affectedAccounts,
              potentialExplanations: block.potentialExplanations,
              // The block models these as lists; the finding row stores prose so that
              // exports and the findings table read naturally.
              recommendedFollowup: toBulletList(block.recommendedFollowup),
              recommendedRemediation: toBulletList(block.recommendedRemediation),
              instructionsReferenced: block.relevantInstructions,
              position,
            })
            .returning({ id: findings.id });

          for (const e of block.evidence) {
            await tx.insert(evidenceRefs).values({
              workspaceId: ctx.workspaceId,
              revisionId: ctx.revisionId,
              findingId: finding.id,
              inputId: e.inputId,
              documentId: e.documentId,
              locator: {
                sheet: e.sheet ?? undefined,
                page: e.page ?? undefined,
                rowFrom: e.rowFrom ?? undefined,
                rowTo: e.rowTo ?? undefined,
                cell: e.cell ?? undefined,
                section: e.section ?? undefined,
              },
              excerpt: e.excerpt,
              label: e.label,
            });
          }
        }
      }

      await tx
        .update(auditRevisions)
        .set({ summary: generated.summary, overallRisk: generated.overallRisk })
        .where(eq(auditRevisions.id, ctx.revisionId));
    });

    ctx.memo.blocks = blocks;

    await setStage(ctx.jobId, "evidence_review", {
      status: "completed",
      finishedAt: new Date(),
      detail: problems.length
        ? `${problems.length} citation problem(s) corrected`
        : "All citations resolved",
      output: { problems },
    });

    return {
      blocks: blocks.length,
      findings: blocks.filter((b) => b.type === "finding_card").length,
      citationProblems: problems,
    };
  },

  async quality_review(ctx) {
    const auditCtx = await loadAuditContext(ctx.auditId);
    const instructionSet =
      (ctx.memo.instructions as InstructionSnapshotEntry[]) ?? (await resolveInstructions(ctx.auditId));
    const blocks =
      (ctx.memo.blocks as AuditBlock[]) ??
      (
        await db
          .select()
          .from(outputBlocks)
          .where(eq(outputBlocks.revisionId, ctx.revisionId))
          .orderBy(outputBlocks.position)
      ).map((b) => b.content as unknown as AuditBlock);

    const review = await generateStructured({
      model: ctx.modelId,
      effort: ctx.effort,
      schema: qualityReviewSchema,
      schemaName: "quality_review",
      system: qualityReviewSystemPrompt(),
      context: {
        workspaceId: ctx.workspaceId,
        stage: "quality_review",
        jobId: ctx.jobId,
        revisionId: ctx.revisionId,
      },
      input: `${renderAuditHeader(auditCtx)}\n\n## Instructions the audit had to follow\n\n${renderInstructions(instructionSet)}\n\n## The audit that was produced\n\n${JSON.stringify(blocks, null, 2).slice(0, 400_000)}\n\nReview it.`,
    });

    const result: QualityReviewResult = {
      passed: review.passed,
      score: review.score,
      summary: review.summary,
      checks: review.checks,
      reviewedBlockCount: blocks.length,
      reviewedFindingCount: blocks.filter((b) => b.type === "finding_card").length,
    };

    await db
      .update(auditRevisions)
      .set({ qualityReview: result })
      .where(eq(auditRevisions.id, ctx.revisionId));

    return { passed: review.passed, score: review.score, failedChecks: review.checks.filter((c) => !c.passed).length };
  },

  async publication(ctx) {
    const [revision] = await db
      .select()
      .from(auditRevisions)
      .where(eq(auditRevisions.id, ctx.revisionId))
      .limit(1);

    const findingRows = await db
      .select({ id: findings.id })
      .from(findings)
      .where(eq(findings.revisionId, ctx.revisionId));

    const review = revision?.qualityReview;
    // A failed quality review must not masquerade as a finished audit — it lands in
    // "review needed" so a human looks before anyone trusts it (PRD §26.3).
    const status = review && !review.passed ? "review_needed" : "completed";

    await db.transaction(async (tx) => {
      await tx
        .update(auditRevisions)
        .set({ status: "completed", immutable: true, completedAt: new Date() })
        .where(eq(auditRevisions.id, ctx.revisionId));

      await tx
        .update(audits)
        .set({
          status,
          overallRisk: revision?.overallRisk ?? null,
          findingCount: findingRows.length,
          currentRevisionId: ctx.revisionId,
          updatedAt: new Date(),
        })
        .where(eq(audits.id, ctx.auditId));
    });

    await logActivity({
      workspaceId: ctx.workspaceId,
      action: "audit.published",
      targetType: "audit_revision",
      targetId: ctx.revisionId,
      auditId: ctx.auditId,
      // The job may outlive the request that started it, so attribute it to whoever
      // asked for the run rather than relying on an ambient session.
      actorId: revision?.createdBy ?? null,
      metadata: {
        revision: revision?.revision,
        modelId: ctx.modelId,
        promptVersion: PROMPT_VERSION,
        schemaVersion: BLOCK_SCHEMA_VERSION,
        findings: findingRows.length,
        qualityPassed: review?.passed ?? null,
        qualityScore: review?.score ?? null,
      },
    });

    return { status, findings: findingRows.length, immutable: true };
  },
};

/**
 * Runs (or resumes) a job. Completed stages are skipped, so a retry after a transient model
 * failure costs only the stages that actually failed (PRD §26.1).
 */
export async function runAuditJob(jobId: string): Promise<void> {
  const [job] = await db.select().from(auditJobs).where(eq(auditJobs.id, jobId)).limit(1);
  if (!job) throw new Error(`Job ${jobId} not found`);
  if (job.status === "running") return; // Another worker holds it.

  const [revision] = await db
    .select()
    .from(auditRevisions)
    .where(eq(auditRevisions.id, job.revisionId))
    .limit(1);
  if (!revision) throw new Error(`Revision ${job.revisionId} not found`);
  if (revision.immutable) throw new Error("This revision is published and cannot be re-run.");

  const model = await resolveModel(job.workspaceId);

  await db
    .update(auditJobs)
    .set({
      status: "running",
      startedAt: job.startedAt ?? new Date(),
      attempt: job.attempt + 1,
      heartbeatAt: new Date(),
      error: null,
    })
    .where(eq(auditJobs.id, jobId));

  await db
    .update(auditRevisions)
    .set({
      status: "processing",
      modelId: model.modelId,
      modelParams: { reasoningEffort: model.effort, verbosity: "low" },
      promptVersion: PROMPT_VERSION,
      schemaVersion: BLOCK_SCHEMA_VERSION,
    })
    .where(eq(auditRevisions.id, job.revisionId));

  await db.update(audits).set({ status: "processing" }).where(eq(audits.id, job.auditId));

  const ctx: EngineContext = {
    jobId,
    auditId: job.auditId,
    revisionId: job.revisionId,
    workspaceId: job.workspaceId,
    modelId: model.modelId,
    effort: model.effort,
    memo: {},
  };

  const existing = await db
    .select()
    .from(auditJobStages)
    .where(eq(auditJobStages.jobId, jobId));
  const statusByStage = new Map(existing.map((s) => [s.stage, s.status]));

  try {
    for (const [i, stage] of STAGES.entries()) {
      if (statusByStage.get(stage) === "completed") continue;

      await db.update(auditJobs).set({ currentStage: stage, heartbeatAt: new Date() }).where(eq(auditJobs.id, jobId));
      await setStage(jobId, stage, {
        status: "running",
        startedAt: new Date(),
        attempt: (existing.find((s) => s.stage === stage)?.attempt ?? 0) + 1,
        error: null,
      });

      try {
        const output = await RUNNERS[stage](ctx);
        await setStage(jobId, stage, {
          status: "completed",
          finishedAt: new Date(),
          progress: Math.round(((i + 1) / STAGES.length) * 100),
          output,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        await setStage(jobId, stage, { status: "failed", finishedAt: new Date(), error: message });
        throw error;
      }
    }

    await db
      .update(auditJobs)
      .set({ status: "completed", finishedAt: new Date(), currentStage: null })
      .where(eq(auditJobs.id, jobId));
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await db
      .update(auditJobs)
      .set({ status: "failed", finishedAt: new Date(), error: message })
      .where(eq(auditJobs.id, jobId));
    await db
      .update(auditRevisions)
      .set({ status: "failed", reason: message })
      .where(eq(auditRevisions.id, job.revisionId));
    await db.update(audits).set({ status: "failed" }).where(eq(audits.id, job.auditId));
    throw error;
  }
}

/**
 * Creates the next revision and queues it. Never mutates an existing revision — re-running
 * an audit always produces a new one so the old result stays readable (PRD §23).
 */
export async function queueAuditRun(params: {
  auditId: string;
  workspaceId: string;
  userId: string;
  reason?: string;
}): Promise<{ jobId: string; revisionId: string; revision: number }> {
  const [audit] = await db.select().from(audits).where(eq(audits.id, params.auditId)).limit(1);
  if (!audit) throw new Error("Audit not found");

  const previous = await db
    .select({ revision: auditRevisions.revision })
    .from(auditRevisions)
    .where(eq(auditRevisions.auditId, params.auditId));
  const next = Math.max(0, ...previous.map((p) => p.revision)) + 1;

  return db.transaction(async (tx) => {
    const [revision] = await tx
      .insert(auditRevisions)
      .values({
        workspaceId: params.workspaceId,
        auditId: params.auditId,
        revision: next,
        status: "processing",
        createdBy: params.userId,
        reason: params.reason ?? null,
      })
      .returning();

    const [job] = await tx
      .insert(auditJobs)
      .values({
        workspaceId: params.workspaceId,
        auditId: params.auditId,
        revisionId: revision.id,
        status: "queued",
        // Scoped to the revision so a double-submit cannot start the same work twice
        // (PRD §26.3), while a genuine re-run gets its own revision and its own key.
        idempotencyKey: `audit:${params.auditId}:rev:${next}`,
      })
      .returning();

    await tx.insert(auditJobStages).values(
      STAGES.map((stage) => ({
        workspaceId: params.workspaceId,
        jobId: job.id,
        stage,
        status: "pending" as const,
      })),
    );

    await tx.update(audits).set({ status: "queued", updatedAt: new Date() }).where(eq(audits.id, params.auditId));

    return { jobId: job.id, revisionId: revision.id, revision: next };
  });
}
