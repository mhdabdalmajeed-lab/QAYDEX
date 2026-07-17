import "server-only";

import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { authUsers } from "drizzle-orm/supabase";

import { db } from "@/db";
import {
  activityLog,
  auditInputs,
  auditRevisions,
  audits,
  blockStates,
  clients,
  comments,
  entities,
  evidenceRefs,
  findingStates,
  findings,
  inputDocuments,
  outputBlocks,
  templateVersions,
  templates,
  workspaces,
} from "@/db/schema";
import type { EvidenceLocator } from "@/db/schema";
import { auditBlockSchema } from "@/lib/ai/blocks/schemas";
import { isBlockType } from "@/lib/ai/blocks/types";
import type { BlockType } from "@/lib/ai/blocks/types";
import {
  DEFAULT_EXPORT_OPTIONS,
  type ExportActivityEntry,
  type ExportBlock,
  type ExportBranding,
  type ExportComment,
  type ExportEvidence,
  type ExportFinding,
  type ExportInput,
  type ExportKind,
  type ExportOptions,
  type ExportPayload,
  SEVERITY_ORDER,
} from "@/lib/export/types";

/**
 * Loads everything every export format needs, once.
 *
 * Two rules this file exists to enforce:
 *
 *  1. **Every query carries its own `workspaceId` predicate.** Drizzle connects as `postgres`,
 *     which bypasses row level security, so the `and(eq(x.workspaceId, workspaceId), …)` on each
 *     query below *is* the tenant boundary. Filtering by `auditId` alone would be a cross-tenant
 *     read waiting to happen the moment an id leaks.
 *  2. **`block_states` is honoured here, not per renderer.** A block the reviewer hid or excluded
 *     from the report is dropped before any renderer sees it, so no format can accidentally ship
 *     content the reviewer withheld.
 *
 * This function does not authorise anything. Callers must have already established the right to
 * read the workspace — it takes a `workspaceId` it trusts the caller to have proven.
 */

export type LoadExportPayloadArgs = {
  workspaceId: string;
  auditId: string;
  revisionId: string;
  kind: ExportKind;
  options?: Partial<ExportOptions>;
};

export class ExportDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExportDataError";
  }
}

/** Which block types each deliverable is made of. `null` means "every included block". */
const KIND_BLOCK_TYPES: Record<ExportKind, readonly BlockType[] | null> = {
  full_report: null,
  executive_summary: [
    "executive_summary",
    "audit_scope",
    "overall_risk_rating",
    "audit_conclusion",
    "limitation_box",
  ],
  findings: ["finding_card"],
  management_letter: ["management_letter_section"],
  remediation_plan: ["recommendation_card", "action_plan", "control_recommendation"],
  // These three are rendered from the finding/evidence/instruction lists, not from blocks.
  evidence_appendix: [],
  activity: [],
  instructions: [],
  input_list: [],
  // "blocks" is driven entirely by options.blockIds.
  blocks: null,
};

function brandingOf(value: {
  primaryColor?: string;
  logoUrl?: string;
  footer?: string;
} | null | undefined): ExportBranding {
  return {
    primaryColor: value?.primaryColor ?? null,
    logoUrl: value?.logoUrl ?? null,
    footer: value?.footer ?? null,
  };
}

/** The locator as an auditor would write it in a working paper. */
export function describeLocator(locator: EvidenceLocator): string {
  const parts: string[] = [];
  if (locator.sheet) parts.push(`sheet ${locator.sheet}`);
  if (typeof locator.page === "number") parts.push(`p.${locator.page}`);
  if (locator.cell) parts.push(`cell ${locator.cell}`);
  else if (typeof locator.rowFrom === "number") {
    parts.push(
      typeof locator.rowTo === "number" && locator.rowTo !== locator.rowFrom
        ? `rows ${locator.rowFrom}-${locator.rowTo}`
        : `row ${locator.rowFrom}`,
    );
  }
  if (locator.columns && locator.columns.length > 0) {
    parts.push(`cols ${locator.columns.join(", ")}`);
  }
  if (locator.section) parts.push(locator.section);
  if (locator.recordId) parts.push(`record ${locator.recordId}`);
  return parts.join(" · ");
}

function iso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export async function loadExportPayload(args: LoadExportPayloadArgs): Promise<ExportPayload> {
  const { workspaceId, auditId, revisionId, kind } = args;
  const options: ExportOptions = { ...DEFAULT_EXPORT_OPTIONS, ...args.options };

  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  if (!workspace) throw new ExportDataError("Workspace not found.");

  const [auditRow] = await db
    .select({
      audit: audits,
      clientName: clients.name,
      clientId: clients.id,
      clientIndustry: clients.industry,
      clientBranding: clients.branding,
      entityName: entities.legalName,
      creatorEmail: authUsers.email,
    })
    .from(audits)
    .leftJoin(clients, and(eq(clients.id, audits.clientId), eq(clients.workspaceId, workspaceId)))
    .leftJoin(entities, and(eq(entities.id, audits.entityId), eq(entities.workspaceId, workspaceId)))
    .leftJoin(authUsers, eq(authUsers.id, audits.creatorId))
    .where(and(eq(audits.id, auditId), eq(audits.workspaceId, workspaceId)))
    .limit(1);
  if (!auditRow) throw new ExportDataError("Audit not found in this workspace.");
  const audit = auditRow.audit;

  const [revision] = await db
    .select()
    .from(auditRevisions)
    .where(
      and(
        eq(auditRevisions.id, revisionId),
        eq(auditRevisions.auditId, auditId),
        eq(auditRevisions.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  if (!revision) throw new ExportDataError("That revision does not belong to this audit.");

  const [reviewer] = audit.reviewerId
    ? await db
        .select({ email: authUsers.email })
        .from(authUsers)
        .where(eq(authUsers.id, audit.reviewerId))
        .limit(1)
    : [];

  const [revisionAuthor] = revision.createdBy
    ? await db
        .select({ email: authUsers.email })
        .from(authUsers)
        .where(eq(authUsers.id, revision.createdBy))
        .limit(1)
    : [];

  const [approver] = revision.approvedBy
    ? await db
        .select({ email: authUsers.email })
        .from(authUsers)
        .where(eq(authUsers.id, revision.approvedBy))
        .limit(1)
    : [];

  const [templateRow] = revision.templateVersionId
    ? await db
        .select({ name: templates.name, version: templateVersions.version })
        .from(templateVersions)
        .leftJoin(templates, eq(templates.id, templateVersions.templateId))
        .where(eq(templateVersions.id, revision.templateVersionId))
        .limit(1)
    : [];

  /* ---------------------------------------------------------------- evidence */

  const evidenceRows = await db
    .select({
      ref: evidenceRefs,
      inputName: auditInputs.name,
      inputKind: auditInputs.kind,
      inputFileName: auditInputs.fileName,
      inputChecksum: auditInputs.checksum,
      documentName: inputDocuments.name,
      documentSheet: inputDocuments.sheetName,
    })
    .from(evidenceRefs)
    .innerJoin(
      auditInputs,
      and(eq(auditInputs.id, evidenceRefs.inputId), eq(auditInputs.workspaceId, workspaceId)),
    )
    .leftJoin(inputDocuments, eq(inputDocuments.id, evidenceRefs.documentId))
    .where(
      and(eq(evidenceRefs.revisionId, revisionId), eq(evidenceRefs.workspaceId, workspaceId)),
    )
    .orderBy(asc(evidenceRefs.createdAt));

  const allEvidence: ExportEvidence[] = evidenceRows.map((row) => ({
    id: row.ref.id,
    label: row.ref.label ?? row.inputName,
    excerpt: row.ref.excerpt,
    locator: row.ref.locator,
    locatorText: describeLocator(row.ref.locator),
    inputId: row.ref.inputId,
    inputName: row.inputName,
    inputKind: row.inputKind,
    inputFileName: row.inputFileName,
    inputChecksum: row.inputChecksum,
    documentId: row.ref.documentId,
    documentName: row.documentName ?? row.documentSheet ?? null,
    findingId: row.ref.findingId,
    blockId: row.ref.blockId,
  }));

  const evidenceByBlock = new Map<string, ExportEvidence[]>();
  const evidenceByFinding = new Map<string, ExportEvidence[]>();
  for (const item of allEvidence) {
    if (item.blockId) {
      const list = evidenceByBlock.get(item.blockId) ?? [];
      list.push(item);
      evidenceByBlock.set(item.blockId, list);
    }
    if (item.findingId) {
      const list = evidenceByFinding.get(item.findingId) ?? [];
      list.push(item);
      evidenceByFinding.set(item.findingId, list);
    }
  }

  /* ------------------------------------------------------------------ blocks */

  const blockRows = await db
    .select({
      block: outputBlocks,
      hidden: blockStates.hidden,
      includeInReport: blockStates.includeInReport,
      narrativeOverride: blockStates.narrativeOverride,
    })
    .from(outputBlocks)
    .leftJoin(blockStates, eq(blockStates.blockId, outputBlocks.id))
    .where(
      and(eq(outputBlocks.revisionId, revisionId), eq(outputBlocks.workspaceId, workspaceId)),
    )
    .orderBy(asc(outputBlocks.position));

  // A block with no state row is included: `include_in_report` defaults to true and `hidden`
  // to false, and a missing row must mean the same thing as an untouched one.
  const publishable = blockRows.filter(
    (row) => row.hidden !== true && row.includeInReport !== false,
  );
  const excludedBlockCount = blockRows.length - publishable.length;

  const wantedTypes = KIND_BLOCK_TYPES[kind];
  const wantedIds = kind === "blocks" ? new Set(options.blockIds ?? []) : null;

  const blocks: ExportBlock[] = publishable
    .filter((row) => {
      if (wantedIds) return wantedIds.has(row.block.id);
      if (wantedTypes === null) return true;
      return isBlockType(row.block.type) && wantedTypes.includes(row.block.type);
    })
    .map((row) => {
      // The revision is immutable but the block schema is versioned, so content written by an
      // older schema can fail to parse. That is reported, not hidden: a reader must know a
      // block could not be rendered rather than silently receive a shorter report.
      const parsed = auditBlockSchema.safeParse(row.block.content);
      const evidence = options.includeEvidence ? (evidenceByBlock.get(row.block.id) ?? []) : [];

      return {
        id: row.block.id,
        type: row.block.type,
        position: row.block.position,
        title: row.block.title ?? (parsed.success ? parsed.data.title : row.block.type),
        block: parsed.success ? parsed.data : null,
        invalidReason: parsed.success
          ? null
          : (parsed.error.issues[0]?.message ?? "The stored block does not match its schema."),
        error: row.block.error,
        narrativeOverride: options.includeInternalNotes ? row.narrativeOverride : null,
        evidence,
      } satisfies ExportBlock;
    });

  /* ---------------------------------------------------------------- findings */

  const findingRows = await db
    .select({
      finding: findings,
      status: findingStates.status,
      dueDate: findingStates.dueDate,
      managementResponse: findingStates.managementResponse,
      ownerEmail: authUsers.email,
    })
    .from(findings)
    .leftJoin(findingStates, eq(findingStates.findingId, findings.id))
    .leftJoin(authUsers, eq(authUsers.id, findingStates.ownerId))
    .where(and(eq(findings.revisionId, revisionId), eq(findings.workspaceId, workspaceId)))
    .orderBy(asc(findings.position));

  const exportFindings: ExportFinding[] = findingRows
    .map((row) => ({
      id: row.finding.id,
      key: row.finding.key,
      title: row.finding.title,
      summary: row.finding.summary,
      detail: row.finding.detail,
      riskCategory: row.finding.riskCategory,
      severity: row.finding.severity,
      confidence: row.finding.confidence,
      confidenceNote: row.finding.confidenceNote,
      claimType: row.finding.claimType,
      // numeric() comes back as a string so that large decimals survive the trip; parse it
      // here rather than in five renderers.
      financialImpact:
        row.finding.financialImpact === null ? null : Number(row.finding.financialImpact),
      financialImpactCurrency: row.finding.financialImpactCurrency,
      impactBasis: row.finding.impactBasis,
      affectedPeriods: row.finding.affectedPeriods ?? [],
      affectedEntities: row.finding.affectedEntities ?? [],
      affectedAccounts: row.finding.affectedAccounts ?? [],
      potentialExplanations: row.finding.potentialExplanations,
      recommendedFollowup: row.finding.recommendedFollowup,
      recommendedRemediation: row.finding.recommendedRemediation,
      instructionsReferenced: row.finding.instructionsReferenced,
      position: row.finding.position,
      status: row.status ?? "open",
      ownerName: row.ownerEmail ?? null,
      dueDate: row.dueDate,
      managementResponse: row.managementResponse,
      evidence: options.includeEvidence ? (evidenceByFinding.get(row.finding.id) ?? []) : [],
    }))
    .sort(
      (a, b) =>
        SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] || a.position - b.position,
    );

  /* ------------------------------------------------------------------ inputs */

  const needInputs = options.includeInputList || kind === "input_list" || kind === "full_report";
  const inputRows = needInputs
    ? await db
        .select()
        .from(auditInputs)
        .where(and(eq(auditInputs.auditId, auditId), eq(auditInputs.workspaceId, workspaceId)))
        .orderBy(asc(auditInputs.createdAt))
    : [];

  const documentCounts = new Map<string, number>();
  if (inputRows.length > 0) {
    const docs = await db
      .select({ inputId: inputDocuments.inputId, id: inputDocuments.id })
      .from(inputDocuments)
      .where(
        and(
          eq(inputDocuments.workspaceId, workspaceId),
          inArray(
            inputDocuments.inputId,
            inputRows.map((i) => i.id),
          ),
        ),
      );
    for (const doc of docs) {
      documentCounts.set(doc.inputId, (documentCounts.get(doc.inputId) ?? 0) + 1);
    }
  }

  const snapshotInputIds = new Set(revision.inputSnapshot.map((entry) => entry.inputId));

  const exportInputs: ExportInput[] = inputRows.map((row) => ({
    id: row.id,
    kind: row.kind,
    name: row.name,
    description: row.description,
    status: row.status,
    fileName: row.fileName,
    fileSize: row.fileSize,
    mimeType: row.mimeType,
    checksum: row.checksum,
    periods: (row.detected.periods ?? [])
      .map((p) => p.label ?? [p.start, p.end].filter(Boolean).join(" – "))
      .filter((label): label is string => Boolean(label)),
    currencies: row.detected.currencies ?? [],
    entities: row.detected.entities ?? [],
    rowCount: row.detected.rowCount ?? null,
    warnings: row.warnings,
    documentCount: documentCounts.get(row.id) ?? 0,
    addedAt: row.createdAt.toISOString(),
    removedAt: iso(row.removedAt),
    usedInRevision: snapshotInputIds.has(row.id),
  }));

  /* ---------------------------------------------------------------- activity */

  const activityRows =
    options.includeActivity || kind === "activity"
      ? await db
          .select()
          .from(activityLog)
          .where(and(eq(activityLog.auditId, auditId), eq(activityLog.workspaceId, workspaceId)))
          .orderBy(desc(activityLog.createdAt))
          .limit(500)
      : [];

  const activity: ExportActivityEntry[] = activityRows.map((row) => ({
    id: row.id,
    at: row.createdAt.toISOString(),
    actorEmail: row.actorEmail,
    action: row.action,
    targetType: row.targetType,
    metadata: row.metadata,
  }));

  /* ---------------------------------------------------------------- comments */

  const commentRows = options.includeInternalNotes
    ? await db
        .select({ comment: comments, authorEmail: authUsers.email })
        .from(comments)
        .leftJoin(authUsers, eq(authUsers.id, comments.authorId))
        .where(and(eq(comments.auditId, auditId), eq(comments.workspaceId, workspaceId)))
        .orderBy(asc(comments.createdAt))
    : [];

  const exportComments: ExportComment[] = commentRows.map((row) => ({
    id: row.comment.id,
    authorEmail: row.authorEmail ?? null,
    body: row.comment.body,
    at: row.comment.createdAt.toISOString(),
    resolved: row.comment.resolved,
    findingId: row.comment.findingId,
    blockId: row.comment.blockId,
  }));

  /* ----------------------------------------------------------------- payload */

  const instructions =
    options.includeInstructions || kind === "instructions" ? revision.instructionSnapshot : [];

  // The evidence appendix resolves what the export actually cites. For the full report that is
  // every citation in the revision; for a narrower kind it is only the citations the included
  // blocks and findings carry, so the appendix cannot advertise sources the reader never sees.
  const citedIds = new Set<string>();
  for (const block of blocks) for (const e of block.evidence) citedIds.add(e.id);
  for (const finding of exportFindings) for (const e of finding.evidence) citedIds.add(e.id);

  const evidence = !options.includeEvidence
    ? []
    : kind === "full_report" || kind === "evidence_appendix"
      ? allEvidence
      : allEvidence.filter((e) => citedIds.has(e.id));

  return {
    kind,
    options,
    organisation: {
      id: workspace.id,
      name: workspace.name,
      type: workspace.type,
      baseCurrency: workspace.baseCurrency,
      branding: brandingOf(workspace.settings.branding),
    },
    client: auditRow.clientId
      ? {
          id: auditRow.clientId,
          name: auditRow.clientName ?? "Client",
          industry: auditRow.clientIndustry,
          branding: brandingOf(auditRow.clientBranding),
        }
      : null,
    audit: {
      id: audit.id,
      name: audit.name,
      objective: audit.objective,
      scope: audit.scope,
      domain: audit.domain,
      subcategory: audit.subcategory,
      periodLabel: audit.periodLabel,
      periodStart: audit.periodStart,
      periodEnd: audit.periodEnd,
      status: audit.status,
      overallRisk: revision.overallRisk ?? audit.overallRisk,
      entityName: auditRow.entityName,
      creatorEmail: auditRow.creatorEmail ?? null,
      reviewerEmail: reviewer?.email ?? null,
      createdAt: audit.createdAt.toISOString(),
    },
    provenance: {
      modelId: revision.modelId,
      promptVersion: revision.promptVersion,
      schemaVersion: revision.schemaVersion,
      templateName: templateRow?.name ?? null,
      templateVersion: templateRow?.version ?? null,
      revisionNumber: revision.revision,
      revisionStatus: revision.status,
      generatedAt: (revision.completedAt ?? revision.createdAt).toISOString(),
      generatedByEmail: revisionAuthor?.email ?? null,
      approvedAt: iso(revision.approvedAt),
      approvedByEmail: approver?.email ?? null,
      qualityScore: revision.qualityReview?.score ?? null,
      qualityPassed: revision.qualityReview?.passed ?? null,
    },
    summary: revision.summary,
    blocks,
    excludedBlockCount,
    findings: exportFindings,
    evidence,
    inputs: exportInputs,
    instructions,
    activity,
    comments: exportComments,
  };
}
