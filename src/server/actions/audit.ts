"use server";

import { and, desc, eq, isNull } from "drizzle-orm";
import { after } from "next/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import type { PreviousAuditOption } from "@/components/audit/new-audit-form";
import {
  auditInputs,
  auditRevisions,
  audits,
  blockStates,
  clients,
  comments,
  entities,
  findingStates,
  findings,
  workspaces,
} from "@/db/schema";
import { queueAuditRun } from "@/lib/ai/engine";
import { logActivity } from "@/lib/activity";
import { requireCanRunAudit, requireMember, requirePermission, roleHas } from "@/lib/auth/guards";
import { startJob } from "@/lib/jobs/runner";

/**
 * Audit mutations.
 *
 * Every action re-establishes authorisation itself: Server Functions are reachable by direct
 * POST, not only through our UI, and drizzle bypasses RLS — so the guard here is the only
 * thing standing between a crafted request and another tenant's data.
 */

async function workspaceBySlug(slug: string) {
  const [workspace] = await db.select().from(workspaces).where(eq(workspaces.slug, slug)).limit(1);
  if (!workspace) throw new Error("Workspace not found");
  return workspace;
}

/** Guards an audit by id and confirms it belongs to the workspace the caller claims. */
async function loadAudit(auditId: string, permission: Parameters<typeof requirePermission>[1]) {
  const [audit] = await db.select().from(audits).where(eq(audits.id, auditId)).limit(1);
  if (!audit) throw new Error("Audit not found");
  const { user, membership } = await requirePermission(audit.workspaceId, permission);
  return { audit, user, membership };
}

const createSchema = z.object({
  workspaceSlug: z.string().min(1),
  name: z.string().min(1, "Give the audit a name.").max(200),
  domain: z.enum(["general", "ledger", "budgets", "cash", "customers", "suppliers"]),
  objective: z.string().max(4000).nullable(),
  scope: z.string().max(4000).nullable(),
  periodStart: z.string().nullable(),
  periodEnd: z.string().nullable(),
  periodLabel: z.string().max(120).nullable(),
  entityId: z.string().uuid().nullable(),
  clientId: z.string().uuid().nullable(),
  fromAuditId: z.string().uuid().nullable(),
});

export type CreateAuditState = { error?: string; auditId?: string };

export async function createAudit(
  _prev: CreateAuditState,
  formData: FormData,
): Promise<CreateAuditState> {
  const raw = {
    workspaceSlug: String(formData.get("workspaceSlug") ?? ""),
    name: String(formData.get("name") ?? "").trim(),
    domain: (formData.get("domain") as string) || "general",
    objective: (formData.get("objective") as string) || null,
    scope: (formData.get("scope") as string) || null,
    periodStart: (formData.get("periodStart") as string) || null,
    periodEnd: (formData.get("periodEnd") as string) || null,
    periodLabel: (formData.get("periodLabel") as string) || null,
    entityId: (formData.get("entityId") as string) || null,
    clientId: (formData.get("clientId") as string) || null,
    fromAuditId: (formData.get("fromAuditId") as string) || null,
  };

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Those details are not valid." };
  }
  const input = parsed.data;

  const workspace = await workspaceBySlug(input.workspaceSlug);
  const { user } = await requirePermission(workspace.id, "audits.create");

  const domain = input.domain;
  const objective = input.objective;

  const auditId = await db.transaction(async (tx) => {
    const [audit] = await tx
      .insert(audits)
      .values({
        workspaceId: workspace.id,
        name: input.name,
        objective,
        scope: input.scope,
        domain,
        entityId: input.entityId,
        clientId: input.clientId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        periodLabel: input.periodLabel,
        status: "draft",
        creatorId: user.id,
      })
      .returning({ id: audits.id });

    // "Create from a previous audit" (PRD §8.1) copies the setup, never the results —
    // findings belong to the revision that produced them.
    if (input.fromAuditId) {
      const [source] = await tx
        .select()
        .from(audits)
        .where(and(eq(audits.id, input.fromAuditId), eq(audits.workspaceId, workspace.id)))
        .limit(1);

      if (source) {
        await tx
          .update(audits)
          .set({ customInstructions: source.customInstructions })
          .where(eq(audits.id, audit.id));

      }
    }

    return audit.id;
  });

  await logActivity({
    workspaceId: workspace.id,
    action: "audit.created",
    targetType: "audit",
    targetId: auditId,
    auditId,
    metadata: { name: input.name, domain },
  });

  // No redirect: the dialog stays open on its evidence step, which needs the id it just
  // created. Navigation happens when the run starts, not when the record exists.
  return { auditId };
}

export async function updateAuditDetails(formData: FormData) {
  const auditId = String(formData.get("auditId"));
  const { audit } = await loadAudit(auditId, "audits.edit");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("An audit needs a name.");

  await db
    .update(audits)
    .set({
      name,
      objective: (formData.get("objective") as string) || null,
      scope: (formData.get("scope") as string) || null,
      periodStart: (formData.get("periodStart") as string) || null,
      periodEnd: (formData.get("periodEnd") as string) || null,
      periodLabel: (formData.get("periodLabel") as string) || null,
      customInstructions: (formData.get("customInstructions") as string) || null,
      updatedAt: new Date(),
    })
    .where(eq(audits.id, auditId));

  await logActivity({
    workspaceId: audit.workspaceId,
    action: "audit.updated",
    targetType: "audit",
    targetId: auditId,
    auditId,
  });

  revalidatePath(`/w/[slug]/audits/${auditId}`, "page");
}

export async function addTextInput(formData: FormData) {
  const auditId = String(formData.get("auditId"));
  const { audit, user } = await loadAudit(auditId, "audits.edit");

  const name = String(formData.get("name") ?? "").trim() || "Written context";
  const content = String(formData.get("content") ?? "").trim();
  if (!content) throw new Error("Write something first.");

  await db.insert(auditInputs).values({
    workspaceId: audit.workspaceId,
    auditId,
    kind: "text",
    name,
    description: (formData.get("description") as string) || null,
    // Written context needs no parsing, so it is usable immediately.
    status: "parsed",
    textContent: content,
    parsedAt: new Date(),
    createdBy: user.id,
  });

  await logActivity({
    workspaceId: audit.workspaceId,
    action: "input.added",
    targetType: "audit_input",
    auditId,
    metadata: { kind: "text", name },
  });

  revalidatePath(`/w/[slug]/audits/${auditId}`, "page");
}

export async function removeInput(formData: FormData) {
  const inputId = String(formData.get("inputId"));
  const [input] = await db.select().from(auditInputs).where(eq(auditInputs.id, inputId)).limit(1);
  if (!input) throw new Error("Input not found.");
  const { audit } = await loadAudit(input.auditId, "audits.edit");

  const [latestRevision] = await db
    .select()
    .from(auditRevisions)
    .where(eq(auditRevisions.auditId, input.auditId))
    .limit(1);

  if (latestRevision) {
    // An input a published revision was run against is never deleted — it is marked removed
    // so it stops feeding new revisions while the old one stays reproducible (PRD §19.1).
    await db.update(auditInputs).set({ removedAt: new Date() }).where(eq(auditInputs.id, inputId));
  } else {
    await db.delete(auditInputs).where(eq(auditInputs.id, inputId));
  }

  await logActivity({
    workspaceId: audit.workspaceId,
    action: "input.removed",
    targetType: "audit_input",
    targetId: inputId,
    auditId: input.auditId,
    metadata: { name: input.name, soft: Boolean(latestRevision) },
  });

  revalidatePath(`/w/[slug]/audits/${input.auditId}`, "page");
}

export type RunAuditState = { error?: string; ok?: boolean };

/** Starts a run. Always a new revision — an existing one is never overwritten (PRD §23). */
export async function runAudit(_prev: RunAuditState, formData: FormData): Promise<RunAuditState> {
  const auditId = String(formData.get("auditId"));
  const slug = String(formData.get("workspaceSlug"));
  const reason = (formData.get("reason") as string) || null;

  const [audit] = await db.select().from(audits).where(eq(audits.id, auditId)).limit(1);
  if (!audit) return { error: "Audit not found." };

  const { user } = await requireCanRunAudit(audit.workspaceId);

  const { jobId } = await queueAuditRun({
    auditId,
    workspaceId: audit.workspaceId,
    userId: user.id,
    reason: reason ?? undefined,
  });

  await logActivity({
    workspaceId: audit.workspaceId,
    action: "audit.run_started",
    targetType: "audit",
    targetId: auditId,
    auditId,
    metadata: { jobId, reason },
  });

  // after() lets the response return now and the pipeline continue in this process; the
  // audit page polls stage progress. Job state lives in the DB, so a lost process is
  // resumable rather than fatal.
  after(() => startJob(jobId));

  redirect(`/w/${slug}/audits/${auditId}`);
}

export async function retryAudit(formData: FormData) {
  const auditId = String(formData.get("auditId"));
  const jobId = String(formData.get("jobId"));
  const { audit } = await loadAudit(auditId, "audits.run");

  await logActivity({
    workspaceId: audit.workspaceId,
    action: "audit.run_retried",
    targetType: "audit",
    targetId: auditId,
    auditId,
    metadata: { jobId },
  });

  // Completed stages are skipped, so a retry resumes rather than restarts (PRD §26.1).
  after(() => startJob(jobId));
  revalidatePath(`/w/[slug]/audits/${auditId}`, "page");
}

export async function setFindingState(formData: FormData) {
  const findingId = String(formData.get("findingId"));
  const [finding] = await db.select().from(findings).where(eq(findings.id, findingId)).limit(1);
  if (!finding) throw new Error("Finding not found.");

  const status = formData.get("status") as
    | "open"
    | "in_progress"
    | "accepted"
    | "disputed"
    | "resolved"
    | null;
  const managementResponse = (formData.get("managementResponse") as string) || null;
  const ownerId = (formData.get("ownerId") as string) || null;
  const dueDate = (formData.get("dueDate") as string) || null;

  // Responding to a finding is a different right from re-assigning it, which is what lets a
  // client user answer without being able to re-triage the audit.
  const permission = managementResponse && !status ? "findings.respond" : "findings.assign";
  const { user } = await requirePermission(finding.workspaceId, permission);

  const patch = {
    status: status ?? undefined,
    managementResponse: managementResponse ?? undefined,
    ownerId: ownerId ?? undefined,
    dueDate: dueDate ?? undefined,
    updatedBy: user.id,
    updatedAt: new Date(),
  };

  await db
    .insert(findingStates)
    .values({ findingId, workspaceId: finding.workspaceId, ...patch })
    .onConflictDoUpdate({ target: findingStates.findingId, set: patch });

  await logActivity({
    workspaceId: finding.workspaceId,
    action: "finding.state_changed",
    targetType: "finding",
    targetId: findingId,
    auditId: finding.auditId,
    metadata: { status, hasResponse: Boolean(managementResponse) },
  });

  revalidatePath(`/w/[slug]/audits/${finding.auditId}`, "page");
}

export async function setBlockState(formData: FormData) {
  const blockId = String(formData.get("blockId"));
  const auditId = String(formData.get("auditId"));
  const { audit, user } = await loadAudit(auditId, "audits.edit");

  const hidden = formData.get("hidden") === "true";
  const includeInReport = formData.get("includeInReport") !== "false";
  const narrativeOverride = (formData.get("narrativeOverride") as string) || null;

  const patch = {
    hidden,
    includeInReport,
    narrativeOverride,
    updatedBy: user.id,
    updatedAt: new Date(),
  };

  // Block state lives outside the revision on purpose — hiding a block is a reader's
  // preference, not an edit to what the model published.
  await db
    .insert(blockStates)
    .values({ blockId, workspaceId: audit.workspaceId, ...patch })
    .onConflictDoUpdate({ target: blockStates.blockId, set: patch });

  revalidatePath(`/w/[slug]/audits/${auditId}`, "page");
}

export async function addComment(formData: FormData) {
  const auditId = String(formData.get("auditId"));
  const { audit, user } = await loadAudit(auditId, "comments.create");
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return;

  await db.insert(comments).values({
    workspaceId: audit.workspaceId,
    auditId,
    findingId: (formData.get("findingId") as string) || null,
    blockId: (formData.get("blockId") as string) || null,
    authorId: user.id,
    body,
  });

  await logActivity({
    workspaceId: audit.workspaceId,
    action: "comment.added",
    targetType: "audit",
    targetId: auditId,
    auditId,
  });

  revalidatePath(`/w/[slug]/audits/${auditId}`, "page");
}

export async function setAuditStatus(formData: FormData) {
  const auditId = String(formData.get("auditId"));
  const status = String(formData.get("status"));

  const permission =
    status === "approved" ? "audits.approve" : status === "archived" ? "audits.delete" : "audits.review";
  const { audit, user } = await loadAudit(auditId, permission as Parameters<typeof requirePermission>[1]);

  if (status === "approved") {
    const revisionId = audit.currentRevisionId;
    if (!revisionId) throw new Error("There is nothing to approve yet.");
    await db
      .update(auditRevisions)
      .set({ status: "approved", approvedAt: new Date(), approvedBy: user.id })
      .where(eq(auditRevisions.id, revisionId));
  }

  await db
    .update(audits)
    .set({
      status: status as typeof audits.$inferInsert.status,
      reviewerId: status === "review_needed" ? user.id : audit.reviewerId,
      archivedAt: status === "archived" ? new Date() : null,
      updatedAt: new Date(),
    })
    .where(eq(audits.id, auditId));

  await logActivity({
    workspaceId: audit.workspaceId,
    action: `audit.${status}`,
    targetType: "audit",
    targetId: auditId,
    auditId,
  });

  revalidatePath(`/w/[slug]/audits/${auditId}`, "page");
}

export async function deleteAudit(formData: FormData) {
  const auditId = String(formData.get("auditId"));
  const slug = String(formData.get("workspaceSlug"));
  const { audit } = await loadAudit(auditId, "audits.delete");

  await logActivity({
    workspaceId: audit.workspaceId,
    action: "audit.deleted",
    targetType: "audit",
    targetId: auditId,
    metadata: { name: audit.name },
  });

  await db.delete(audits).where(eq(audits.id, auditId));
  redirect(`/w/${slug}`);
}

export async function duplicateAudit(formData: FormData) {
  const auditId = String(formData.get("auditId"));
  const slug = String(formData.get("workspaceSlug"));
  const { audit, user } = await loadAudit(auditId, "audits.create");

  const newId = await db.transaction(async (tx) => {
    const [copy] = await tx
      .insert(audits)
      .values({
        workspaceId: audit.workspaceId,
        name: `${audit.name} (copy)`,
        objective: audit.objective,
        scope: audit.scope,
        domain: audit.domain,
        subcategory: audit.subcategory,
        entityId: audit.entityId,
        clientId: audit.clientId,
        periodStart: audit.periodStart,
        periodEnd: audit.periodEnd,
        periodLabel: audit.periodLabel,
        customInstructions: audit.customInstructions,
        status: "draft",
        creatorId: user.id,
      })
      .returning({ id: audits.id });

    // Text inputs copy cleanly; files are left behind deliberately rather than duplicating
    // storage objects the user did not ask to copy.
    const textInputs = await tx
      .select()
      .from(auditInputs)
      .where(and(eq(auditInputs.auditId, auditId), eq(auditInputs.kind, "text")));
    for (const input of textInputs) {
      await tx.insert(auditInputs).values({
        workspaceId: audit.workspaceId,
        auditId: copy.id,
        kind: "text",
        name: input.name,
        description: input.description,
        status: "parsed",
        textContent: input.textContent,
        parsedAt: new Date(),
        createdBy: user.id,
      });
    }

    return copy.id;
  });

  await logActivity({
    workspaceId: audit.workspaceId,
    action: "audit.duplicated",
    targetType: "audit",
    targetId: newId,
    auditId: newId,
    metadata: { from: auditId },
  });

  redirect(`/w/${slug}/audits/${newId}`);
}

/* -------------------------------------------------------------------------- */
/* New-audit options                                                          */
/* -------------------------------------------------------------------------- */

export type NewAuditOptions = {
  previousAudits: PreviousAuditOption[];
  entities: { id: string; legalName: string }[];
  clients: { id: string; name: string }[];
  /** 1–12. The form offers fiscal years and quarters that start here. */
  fiscalYearStartMonth: number;
};

export type NewAuditOptionsResult =
  | { ok: true; options: NewAuditOptions }
  | { ok: false; error: string };

/**
 * Everything the new-audit dialog needs to render.
 *
 * This is a read, not a mutation, and it deliberately does not run with the pages that host
 * the dialog: filling a form most visits never open should not cost every library page a
 * round of queries. The dialog asks for it the first time it is opened.
 *
 * It is still a Server Function, reachable by direct POST, so it re-establishes membership
 * and the create permission itself rather than trusting the caller.
 */
export async function loadNewAuditOptions(workspaceSlug: string): Promise<NewAuditOptionsResult> {
  const workspace = await workspaceBySlug(workspaceSlug);

  let role;
  try {
    const { membership } = await requireMember(workspace.id);
    role = membership.role;
  } catch {
    return { ok: false, error: "You do not have access to this workspace." };
  }

  if (!roleHas(role, "audits.create")) {
    return {
      ok: false,
      error: `Your role (${role.replace(/_/g, " ")}) can view audits but not start one. An owner or admin can change this in Settings › Members and roles.`,
    };
  }

  const [previousRows, entityRows, clientRows] = await Promise.all([
    db
      .select({
        id: audits.id,
        name: audits.name,
        domain: audits.domain,
        status: audits.status,
        periodLabel: audits.periodLabel,
        updatedAt: audits.updatedAt,
      })
      .from(audits)
      .where(and(eq(audits.workspaceId, workspace.id), isNull(audits.archivedAt)))
      .orderBy(desc(audits.updatedAt))
      .limit(40),

    db
      .select({ id: entities.id, legalName: entities.legalName })
      .from(entities)
      .where(eq(entities.workspaceId, workspace.id))
      .orderBy(entities.legalName),

    workspace.type === "firm"
      ? db
          .select({ id: clients.id, name: clients.name })
          .from(clients)
          .where(eq(clients.workspaceId, workspace.id))
          .orderBy(clients.name)
      : Promise.resolve([] as { id: string; name: string }[]),
  ]);

  const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

  return {
    ok: true,
    options: {
      previousAudits: previousRows.map((row) => ({
        id: row.id,
        name: row.name,
        domain: row.domain,
        periodLabel: row.periodLabel,
        status: row.status,
        updatedAt: dateFormat.format(row.updatedAt),
      })),
      entities: entityRows,
      clients: clientRows,
      fiscalYearStartMonth: workspace.fiscalYearStartMonth,
    },
  };
}
