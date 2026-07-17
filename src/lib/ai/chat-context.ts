import "server-only";

import { and, asc, eq, inArray } from "drizzle-orm";

import { db } from "@/db";
import {
  approvedModels,
  auditInputs,
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
import type { EvidenceLocator, InstructionSnapshotEntry } from "@/db/schema";
import { renderInstructions, resolveInstructions } from "@/lib/ai/instructions";
import { FALLBACK_MODEL_ID, MODEL_SEEDS, type ReasoningEffort } from "@/lib/ai/models";
import { auditContextBlock } from "@/lib/ai/prompts";

/**
 * The grounding pack for an audit-linked chat (PRD §10.2).
 *
 * "When launched from an audit, the chat automatically receives: audit instructions, audit
 * inputs, parsed data, audit findings, generated output blocks, evidence references." That
 * list is built here, server-side, and prepended to the conversation. The model never gets
 * to *recall* what an audit said — the instruction snapshot and findings are handed to it
 * verbatim, and the raw numbers stay behind the tools so answers are computed from evidence
 * rather than remembered (PRD §6.3).
 *
 * The audit's own conversation history is not folded in here: each conversation carries its
 * own messages, and pulling another chat's turns into this one would quietly widen what the
 * model treats as established fact.
 */

/** Beyond these the context stops being useful and starts crowding out the actual question. */
const MAX_FINDINGS_PER_AUDIT = 40;
const MAX_BLOCKS_PER_AUDIT = 60;
const MAX_EVIDENCE_REFS_PER_AUDIT = 120;
const MAX_BLOCK_JSON_CHARS = 1_200;
const MAX_TEXT_INPUT_CHARS = 4_000;

export type GroundedAudit = {
  id: string;
  name: string;
  domain: string;
  status: string;
  periodLabel: string | null;
  findingCount: number;
  /** False when the audit has never completed a revision — there is nothing to ground on yet. */
  hasResults: boolean;
};

export type ChatGrounding = {
  audits: GroundedAudit[];
  /** Rendered context, ready to be the first user turn. Empty when nothing is attached. */
  text: string;
};

function describeLocator(locator: EvidenceLocator): string {
  const parts: string[] = [];
  if (locator.sheet) parts.push(`sheet "${locator.sheet}"`);
  if (locator.page !== undefined) parts.push(`page ${locator.page}`);
  if (locator.rowFrom !== undefined) {
    parts.push(
      locator.rowTo !== undefined && locator.rowTo !== locator.rowFrom
        ? `rows ${locator.rowFrom}-${locator.rowTo}`
        : `row ${locator.rowFrom}`,
    );
  }
  if (locator.cell) parts.push(`cell ${locator.cell}`);
  if (locator.columns?.length) parts.push(`columns ${locator.columns.join(", ")}`);
  if (locator.section) parts.push(`section "${locator.section}"`);
  return parts.length > 0 ? parts.join(" · ") : "whole document";
}

/**
 * The evidence manifest. Mirrors the audit engine's: the model needs the real input and
 * document ids before it can call a tool, and those ids are what it must cite.
 */
async function renderInputs(auditId: string): Promise<string> {
  const inputs = await db
    .select()
    .from(auditInputs)
    .where(eq(auditInputs.auditId, auditId))
    .orderBy(asc(auditInputs.createdAt));

  if (inputs.length === 0) return "### Inputs\n\nNo inputs are attached to this audit.";

  const docs = await db
    .select()
    .from(inputDocuments)
    .where(
      inArray(
        inputDocuments.inputId,
        inputs.map((input) => input.id),
      ),
    );

  const lines = inputs.map((input) => {
    const mine = docs.filter((doc) => doc.inputId === input.id);
    const docLines = mine.map(
      (doc) =>
        `    - documentId=${doc.id} · ${doc.kind}` +
        `${doc.sheetName ? ` · sheet "${doc.sheetName}"` : ""}` +
        `${doc.pageNumber !== null ? ` · page ${doc.pageNumber}` : ""}` +
        ` · ${doc.rowCount ?? 0} rows${doc.truncated ? " (TRUNCATED)" : ""}` +
        `${doc.columns.length ? ` · columns: ${doc.columns.map((c) => c.label).join(", ")}` : ""}`,
    );

    const removed = input.removedAt ? " · REMOVED from later revisions" : "";
    const warnings = input.warnings.length
      ? `\n    ! warnings: ${input.warnings.map((w) => w.message).join("; ")}`
      : "";
    // Written context is data, not instruction — the safety prompt already says so, and it
    // is inlined here because there is no document to page through.
    const text =
      input.kind === "text" && input.textContent
        ? `\n    text: ${input.textContent.slice(0, MAX_TEXT_INPUT_CHARS)}`
        : "";

    return (
      `  - inputId=${input.id} · "${input.name}" · ${input.kind} · status=${input.status}${removed}` +
      `${warnings}${text}${docLines.length ? `\n${docLines.join("\n")}` : ""}`
    );
  });

  return `### Inputs\n\n${lines.join("\n")}`;
}

async function renderFindings(revisionId: string): Promise<string> {
  const rows = await db
    .select()
    .from(findings)
    .where(eq(findings.revisionId, revisionId))
    .orderBy(asc(findings.position))
    .limit(MAX_FINDINGS_PER_AUDIT);

  if (rows.length === 0) return "### Findings\n\nThis revision produced no findings.";

  const lines = rows.map(
    (finding) =>
      `- findingId=${finding.id} · [${finding.severity}/${finding.confidence}/${finding.claimType}] ` +
      `${finding.title}\n  ${finding.summary}\n  Risk area: ${finding.riskCategory}` +
      `${finding.financialImpact ? `\n  Impact: ${finding.financialImpact} ${finding.financialImpactCurrency ?? ""} (${finding.impactBasis ?? "basis not stated"})` : ""}` +
      `${finding.potentialExplanations.length ? `\n  Innocent explanations considered: ${finding.potentialExplanations.join("; ")}` : ""}`,
  );

  return `### Findings\n\n${lines.join("\n")}`;
}

async function renderBlocks(revisionId: string): Promise<string> {
  const rows = await db
    .select()
    .from(outputBlocks)
    .where(eq(outputBlocks.revisionId, revisionId))
    .orderBy(asc(outputBlocks.position))
    .limit(MAX_BLOCKS_PER_AUDIT);

  if (rows.length === 0) return "### Generated blocks\n\nThis revision produced no blocks.";

  const lines = rows.map((block) => {
    const json = JSON.stringify(block.content);
    const truncated = json.length > MAX_BLOCK_JSON_CHARS;
    return (
      `- blockId=${block.id} · ${block.type} · "${block.title ?? "untitled"}"` +
      `${block.error ? ` · FAILED TO GENERATE: ${block.error}` : ""}\n` +
      `  ${json.slice(0, MAX_BLOCK_JSON_CHARS)}${truncated ? " …(truncated — re-read the underlying data with your tools if you need the rest)" : ""}`
    );
  });

  return `### Generated blocks (what the user is looking at)\n\n${lines.join("\n")}`;
}

async function renderEvidence(revisionId: string): Promise<string> {
  const rows = await db
    .select()
    .from(evidenceRefs)
    .where(eq(evidenceRefs.revisionId, revisionId))
    .limit(MAX_EVIDENCE_REFS_PER_AUDIT);

  if (rows.length === 0) {
    return "### Evidence references\n\nThis revision recorded no evidence references.";
  }

  const lines = rows.map(
    (ref) =>
      `- ${ref.label ?? "reference"} → inputId=${ref.inputId}` +
      `${ref.documentId ? ` documentId=${ref.documentId}` : ""} · ${describeLocator(ref.locator)}` +
      `${ref.findingId ? ` · supports findingId=${ref.findingId}` : ""}` +
      `${ref.excerpt ? `\n  "${ref.excerpt.slice(0, 300)}"` : ""}`,
  );

  return `### Evidence references\n\n${lines.join("\n")}`;
}

async function renderOneAudit(auditId: string, workspaceId: string): Promise<{
  audit: GroundedAudit;
  text: string;
} | null> {
  // The workspace predicate is on the query, not on a later check: drizzle bypasses RLS, so
  // this is the only thing keeping another tenant's audit out of this prompt.
  const [audit] = await db
    .select()
    .from(audits)
    .where(and(eq(audits.id, auditId), eq(audits.workspaceId, workspaceId)))
    .limit(1);
  if (!audit) return null;

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  const entity = audit.entityId
    ? (await db.select().from(entities).where(eq(entities.id, audit.entityId)).limit(1))[0]
    : undefined;
  const client = audit.clientId
    ? (await db.select().from(clients).where(eq(clients.id, audit.clientId)).limit(1))[0]
    : undefined;

  const revision = audit.currentRevisionId
    ? (
        await db
          .select()
          .from(auditRevisions)
          .where(
            and(
              eq(auditRevisions.id, audit.currentRevisionId),
              eq(auditRevisions.workspaceId, workspaceId),
            ),
          )
          .limit(1)
      )[0]
    : undefined;

  // The snapshot is the instruction set the results were actually produced under. Falling
  // back to the live set for an unrun audit is correct — there is no snapshot yet — but the
  // two are never conflated, because a snapshot is what makes an answer reproducible (§23).
  const instructionSnapshot: InstructionSnapshotEntry[] =
    revision && revision.instructionSnapshot.length > 0
      ? revision.instructionSnapshot
      : await resolveInstructions(audit.id);

  const header = auditContextBlock({
    name: audit.name,
    objective: audit.objective,
    scope: audit.scope,
    domain: audit.domain,
    periodLabel: audit.periodLabel,
    periodStart: audit.periodStart,
    periodEnd: audit.periodEnd,
    entityName: entity?.legalName ?? null,
    clientName: client?.name ?? null,
    workspaceType: workspace?.type ?? "internal",
    baseCurrency: workspace?.baseCurrency ?? "USD",
    accountingStandards: workspace?.accountingStandards ?? null,
  });

  const sections: string[] = [
    `## Attached audit — auditId=${audit.id}`,
    header.replace(/^## This audit$/m, "### Audit details"),
    `### Instruction snapshot (highest authority first)\n\n${
      instructionSnapshot.length > 0
        ? renderInstructions(instructionSnapshot)
        : "No instructions are attached to this audit."
    }`,
    await renderInputs(audit.id),
  ];

  if (revision) {
    sections.push(
      `### Revision\n\n- revision ${revision.revision} · status ${revision.status} · model ${revision.modelId ?? "unknown"} · prompt ${revision.promptVersion ?? "unknown"}\n- Summary: ${revision.summary ?? "none recorded"}\n- Overall risk: ${revision.overallRisk ?? "not rated"}` +
        `${revision.qualityReview ? `\n- Quality review: ${revision.qualityReview.passed ? "passed" : "FAILED"} (${revision.qualityReview.score}/100) — ${revision.qualityReview.summary}` : ""}`,
      await renderFindings(revision.id),
      await renderBlocks(revision.id),
      await renderEvidence(revision.id),
    );
  } else {
    sections.push(
      "### Results\n\nThis audit has not produced a revision yet — there are no findings, blocks or evidence references. Say so rather than implying results exist.",
    );
  }

  return {
    audit: {
      id: audit.id,
      name: audit.name,
      domain: audit.domain,
      status: audit.status,
      periodLabel: audit.periodLabel,
      findingCount: audit.findingCount,
      hasResults: Boolean(revision),
    },
    text: sections.join("\n\n"),
  };
}

/** Builds the §10.2 grounding pack for every audit attached to a conversation. */
export async function buildChatGrounding(
  auditIds: string[],
  workspaceId: string,
): Promise<ChatGrounding> {
  if (auditIds.length === 0) return { audits: [], text: "" };

  const rendered = await Promise.all(
    auditIds.map((auditId) => renderOneAudit(auditId, workspaceId)),
  );
  const found = rendered.filter((entry): entry is NonNullable<typeof entry> => entry !== null);
  if (found.length === 0) return { audits: [], text: "" };

  const preamble =
    found.length === 1
      ? "The following audit is attached to this conversation. Your tools read its evidence directly — use them to verify rather than quoting the summaries below from memory."
      : `${found.length} audits are attached to this conversation. Every tool call takes an \`auditId\`, so you can read each audit's evidence separately — but you must never merge their populations without saying so. Whenever you state a number, say which audit it came from.`;

  return {
    audits: found.map((entry) => entry.audit),
    text: `# Conversation context\n\n${preamble}\n\n${found.map((entry) => entry.text).join("\n\n---\n\n")}`,
  };
}

export type ChatModelInfo = {
  modelId: string;
  effort: ReasoningEffort;
  label: string;
  status: "approved" | "candidate" | "deprecated";
  contextWindow: number;
};

const REASONING_EFFORTS: ReasoningEffort[] = ["none", "low", "medium", "high", "xhigh"];

/** `params` is free-form jsonb, so a stored effort is validated rather than trusted. */
function toEffort(value: unknown): ReasoningEffort {
  return REASONING_EFFORTS.find((effort) => effort === value) ?? "medium";
}

/**
 * The model the workspace has approved, plus the metadata the chat header shows. Chat runs on
 * the same pinned, approved model as audits (PRD §23) — never "whatever is newest".
 */
export async function resolveChatModel(workspaceId: string): Promise<ChatModelInfo> {
  const rows = await db.select().from(approvedModels).where(eq(approvedModels.status, "approved"));

  const scoped = rows.filter((row) => row.workspaceId === workspaceId);
  const global = rows.filter((row) => row.workspaceId === null);
  const chosen =
    scoped.find((row) => row.isDefault) ?? global.find((row) => row.isDefault) ?? global[0] ?? null;

  const seedFor = (modelId: string) => MODEL_SEEDS.find((seed) => seed.modelId === modelId);

  if (!chosen) {
    const seed = seedFor(FALLBACK_MODEL_ID);
    return {
      modelId: FALLBACK_MODEL_ID,
      effort: "medium",
      label: seed?.label ?? FALLBACK_MODEL_ID,
      status: "approved",
      contextWindow: seed?.contextWindow ?? 400_000,
    };
  }

  return {
    modelId: chosen.modelId,
    effort: toEffort(chosen.params.reasoningEffort),
    label: chosen.label,
    status: chosen.status,
    contextWindow:
      chosen.contextWindow ?? seedFor(chosen.modelId)?.contextWindow ?? 400_000,
  };
}
