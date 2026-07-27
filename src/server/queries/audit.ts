import "server-only";

import { and, asc, desc, eq, inArray, isNull } from "drizzle-orm";
import { notFound } from "next/navigation";
import { cache } from "react";
import { authUsers } from "drizzle-orm/supabase";

import { db } from "@/db";
import {
  auditInputs,
  auditJobStages,
  auditJobs,
  auditRevisions,
  audits,
  clients,
  conversationAudits,
  conversations,
  entities,
  evidenceRefs,
  findings,
  inputDocuments,
  workspaceMembers,
  workspaces,
} from "@/db/schema";
import type { Permission } from "@/lib/auth/guards";
import { AccessDenied, requireMember, roleHas } from "@/lib/auth/guards";

/**
 * Reads for the audit detail page.
 *
 * Drizzle connects as a role that bypasses RLS, so the database will happily hand over another
 * tenant's rows if asked. Every query below therefore carries its own `workspaceId` predicate,
 * and `getAuditContext` is the only place a caller is allowed to learn the workspace id from —
 * it establishes membership first.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type AuditContext = Awaited<ReturnType<typeof getAuditContext>>;

/**
 * Resolves the workspace, asserts membership, and loads the audit — in that order.
 *
 * Deduped per request with `cache` because the page, its Suspense children and
 * `generateMetadata` all need it and each call is a Supabase round-trip.
 */
export const getAuditContext = cache(async (slug: string, auditId: string) => {
  // A malformed id would otherwise reach Postgres and raise a 22P02 rather than a 404.
  if (!UUID.test(auditId)) notFound();

  const [workspace] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      baseCurrency: workspaces.baseCurrency,
    })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  if (!workspace) notFound();

  // Answering a non-member with 404 rather than 403 keeps "this workspace exists" private.
  let membership;
  let user;
  try {
    ({ membership, user } = await requireMember(workspace.id));
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }

  const [row] = await db
    .select({
      audit: audits,
      entityName: entities.legalName,
      clientName: clients.name,
    })
    .from(audits)
    .leftJoin(entities, eq(entities.id, audits.entityId))
    .leftJoin(clients, eq(clients.id, audits.clientId))
    .where(and(eq(audits.id, auditId), eq(audits.workspaceId, workspace.id)))
    .limit(1);
  if (!row) notFound();

  return {
    workspace,
    user,
    membership,
    audit: row.audit,
    entityName: row.entityName,
    clientName: row.clientName,
    recommendedInputs: [] as { name: string; description: string; formats: string[]; required: boolean }[],
    requiredEvidence: [] as string[],
    can: (permission: Permission) => roleHas(membership.role, permission),
  };
});

/** Every revision of an audit, newest first. Completed ones are immutable by contract. */
export const listRevisions = cache(async (workspaceId: string, auditId: string) => {
  return db
    .select({
      id: auditRevisions.id,
      revision: auditRevisions.revision,
      status: auditRevisions.status,
      summary: auditRevisions.summary,
      overallRisk: auditRevisions.overallRisk,
      reason: auditRevisions.reason,
      modelId: auditRevisions.modelId,
      promptVersion: auditRevisions.promptVersion,
      schemaVersion: auditRevisions.schemaVersion,
      immutable: auditRevisions.immutable,
      qualityReview: auditRevisions.qualityReview,
      instructionSnapshot: auditRevisions.instructionSnapshot,
      inputSnapshot: auditRevisions.inputSnapshot,
      plan: auditRevisions.plan,
      createdAt: auditRevisions.createdAt,
      completedAt: auditRevisions.completedAt,
      approvedAt: auditRevisions.approvedAt,
      createdByEmail: authUsers.email,
    })
    .from(auditRevisions)
    .leftJoin(authUsers, eq(authUsers.id, auditRevisions.createdBy))
    .where(
      and(eq(auditRevisions.workspaceId, workspaceId), eq(auditRevisions.auditId, auditId)),
    )
    .orderBy(desc(auditRevisions.revision));
});

export type RevisionRow = Awaited<ReturnType<typeof listRevisions>>[number];

/**
 * The revision the page should show: an explicit one if asked for, otherwise the audit's
 * current pointer, otherwise the newest. Returns null while an audit has never been run.
 */
export async function resolveRevision(
  workspaceId: string,
  auditId: string,
  currentRevisionId: string | null,
  requested?: string,
): Promise<RevisionRow | null> {
  const revisions = await listRevisions(workspaceId, auditId);
  if (revisions.length === 0) return null;
  if (requested && UUID.test(requested)) {
    const match = revisions.find((r) => r.id === requested);
    if (match) return match;
  }
  return revisions.find((r) => r.id === currentRevisionId) ?? revisions[0];
}

/** The most recent run of this audit, with per-stage progress (PRD §22, §26.1). */
export const getLatestJob = cache(async (workspaceId: string, auditId: string) => {
  const [job] = await db
    .select()
    .from(auditJobs)
    .where(and(eq(auditJobs.workspaceId, workspaceId), eq(auditJobs.auditId, auditId)))
    .orderBy(desc(auditJobs.createdAt))
    .limit(1);
  if (!job) return null;

  const stages = await db
    .select()
    .from(auditJobStages)
    .where(and(eq(auditJobStages.workspaceId, workspaceId), eq(auditJobStages.jobId, job.id)))
    .orderBy(asc(auditJobStages.createdAt));

  return { job, stages };
});

export type PanelDocument = {
  id: string;
  kind: "table" | "text" | "page" | "sheet" | "image";
  name: string;
  sheetName: string | null;
  pageNumber: number | null;
  rowCount: number | null;
  colCount: number | null;
  columns: { key: string; label: string; type: string }[];
  summary: string | null;
  excerpt: string | null;
  truncated: boolean;
};

export type PanelReference = {
  kind: "finding" | "block" | "revision";
  id: string;
  label: string;
  locator: string | null;
};

export type PanelInput = {
  id: string;
  kind: "file" | "text" | "integration";
  name: string;
  description: string | null;
  status: "pending" | "parsing" | "parsed" | "failed" | "unsupported";
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  textExcerpt: string | null;
  warnings: { code: string; message: string; severity: string }[];
  periods: { start?: string; end?: string; label?: string }[];
  currencies: string[];
  entities: string[];
  detectedRowCount: number | null;
  freshness: string | null;
  parseError: string | null;
  parsedAt: string | null;
  createdAt: string;
  removedAt: string | null;
  version: number;
  addedByEmail: string | null;
  documents: PanelDocument[];
  references: PanelReference[];
  usedInRevision: boolean;
};

const EXCERPT_CHARS = 1200;

function describe(locator: Record<string, unknown> | null): string | null {
  if (!locator) return null;
  const parts: string[] = [];
  const sheet = locator.sheet;
  const page = locator.page;
  const cell = locator.cell;
  const rowFrom = locator.rowFrom;
  const rowTo = locator.rowTo;
  const section = locator.section;
  if (typeof sheet === "string") parts.push(`sheet ${sheet}`);
  if (typeof page === "number") parts.push(`p.${page}`);
  if (typeof cell === "string") parts.push(`cell ${cell}`);
  else if (typeof rowFrom === "number") {
    parts.push(
      typeof rowTo === "number" && rowTo !== rowFrom ? `rows ${rowFrom}-${rowTo}` : `row ${rowFrom}`,
    );
  }
  if (typeof section === "string") parts.push(section);
  return parts.length > 0 ? parts.join(" · ") : null;
}

/**
 * Everything the left panel shows about this audit's inputs (PRD §19.1).
 *
 * `inputDocuments.rows` is deliberately never selected: a parsed ledger can be tens of
 * megabytes of jsonb and the panel only ever shows shape, not data. The preview shows the
 * columns the parser actually found — never a fabricated sample.
 */
export async function getPanelInputs(
  workspaceId: string,
  auditId: string,
  revisionId: string | null,
): Promise<PanelInput[]> {
  const inputRows = await db
    .select({
      input: auditInputs,
      addedByEmail: authUsers.email,
    })
    .from(auditInputs)
    .leftJoin(authUsers, eq(authUsers.id, auditInputs.createdBy))
    .where(and(eq(auditInputs.workspaceId, workspaceId), eq(auditInputs.auditId, auditId)))
    .orderBy(asc(auditInputs.createdAt));

  if (inputRows.length === 0) return [];
  const inputIds = inputRows.map((r) => r.input.id);

  const documents = await db
    .select({
      id: inputDocuments.id,
      inputId: inputDocuments.inputId,
      kind: inputDocuments.kind,
      name: inputDocuments.name,
      sheetName: inputDocuments.sheetName,
      pageNumber: inputDocuments.pageNumber,
      rowCount: inputDocuments.rowCount,
      colCount: inputDocuments.colCount,
      columns: inputDocuments.columns,
      summary: inputDocuments.summary,
      textContent: inputDocuments.textContent,
      truncated: inputDocuments.truncated,
    })
    .from(inputDocuments)
    .where(
      and(
        eq(inputDocuments.workspaceId, workspaceId),
        inArray(inputDocuments.inputId, inputIds),
      ),
    )
    .orderBy(asc(inputDocuments.seq));

  // "Where was this input used?" — only meaningful against a revision, because evidence is
  // recorded per revision (PRD §19.1).
  const refs = revisionId
    ? await db
        .select({
          inputId: evidenceRefs.inputId,
          findingId: evidenceRefs.findingId,
          blockId: evidenceRefs.blockId,
          label: evidenceRefs.label,
          locator: evidenceRefs.locator,
          findingTitle: findings.title,
        })
        .from(evidenceRefs)
        .leftJoin(findings, eq(findings.id, evidenceRefs.findingId))
        .where(
          and(
            eq(evidenceRefs.workspaceId, workspaceId),
            eq(evidenceRefs.revisionId, revisionId),
            inArray(evidenceRefs.inputId, inputIds),
          ),
        )
    : [];

  return inputRows.map(({ input, addedByEmail }) => {
    const detected = input.detected ?? {};
    const inputRefs: PanelReference[] = [];
    const seen = new Set<string>();
    for (const ref of refs) {
      if (ref.inputId !== input.id) continue;
      const target = ref.findingId ?? ref.blockId;
      if (!target) continue;
      const key = `${target}:${describe(ref.locator) ?? ""}`;
      if (seen.has(key)) continue;
      seen.add(key);
      inputRefs.push({
        kind: ref.findingId ? "finding" : "block",
        id: target,
        label: ref.findingTitle ?? ref.label ?? "Referenced in the audit output",
        locator: describe(ref.locator),
      });
    }

    return {
      id: input.id,
      kind: input.kind,
      name: input.name,
      description: input.description,
      status: input.status,
      fileName: input.fileName,
      fileSize: input.fileSize,
      mimeType: input.mimeType,
      textExcerpt: input.textContent ? input.textContent.slice(0, EXCERPT_CHARS) : null,
      warnings: input.warnings ?? [],
      periods: detected.periods ?? [],
      currencies: detected.currencies ?? [],
      entities: detected.entities ?? [],
      detectedRowCount: detected.rowCount ?? null,
      freshness: detected.freshness ?? null,
      parseError: input.parseError,
      parsedAt: input.parsedAt?.toISOString() ?? null,
      createdAt: input.createdAt.toISOString(),
      removedAt: input.removedAt?.toISOString() ?? null,
      version: input.version,
      addedByEmail: addedByEmail ?? null,
      documents: documents
        .filter((d) => d.inputId === input.id)
        .map((d) => ({
          id: d.id,
          kind: d.kind,
          name: d.name,
          sheetName: d.sheetName,
          pageNumber: d.pageNumber,
          rowCount: d.rowCount,
          colCount: d.colCount,
          columns: d.columns ?? [],
          summary: d.summary,
          excerpt: d.textContent ? d.textContent.slice(0, EXCERPT_CHARS) : null,
          truncated: d.truncated,
        })),
      references: inputRefs,
      usedInRevision: inputRefs.length > 0,
    };
  });
}

/** Workspace members, for assigning a finding to a person (PRD §21.2). */
export const listAssignees = cache(async (workspaceId: string) => {
  return db
    .select({
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
      title: workspaceMembers.title,
      email: authUsers.email,
    })
    .from(workspaceMembers)
    .leftJoin(authUsers, eq(authUsers.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(asc(authUsers.email));
});

/** Audit-grounded conversations, newest first (PRD §19.3). */
export const listAuditConversations = cache(
  async (workspaceId: string, auditId: string, limit = 5) => {
    return db
      .select({
        id: conversations.id,
        title: conversations.title,
        updatedAt: conversations.updatedAt,
      })
      .from(conversationAudits)
      .innerJoin(conversations, eq(conversations.id, conversationAudits.conversationId))
      .where(
        and(
          eq(conversationAudits.workspaceId, workspaceId),
          eq(conversationAudits.auditId, auditId),
          eq(conversations.archived, false),
        ),
      )
      .orderBy(desc(conversations.updatedAt))
      .limit(limit);
  },
);

/** Inputs still feeding new revisions — used by the "add evidence" empty states. */
export const countLiveInputs = cache(async (workspaceId: string, auditId: string) => {
  const rows = await db
    .select({ id: auditInputs.id })
    .from(auditInputs)
    .where(
      and(
        eq(auditInputs.workspaceId, workspaceId),
        eq(auditInputs.auditId, auditId),
        isNull(auditInputs.removedAt),
      ),
    );
  return rows.length;
});
