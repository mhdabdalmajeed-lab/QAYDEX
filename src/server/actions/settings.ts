"use server";

import { and, eq, isNull, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import {
  AI_PROVIDER_VALUES,
  AI_REGION_VALUES,
  FILE_TYPE_VALUES,
  isMemberRole,
} from "@/components/settings/options";
import { db } from "@/db";
import {
  approvedModels,
  modelStatusEnum,
  workspaceMembers,
  workspaceTypeEnum,
  workspaces,
  type WorkspaceSettings,
} from "@/db/schema";
import { logActivity } from "@/lib/activity";
import { requirePermission, type MemberRole } from "@/lib/auth/guards";
import { INTEGRATION_PROVIDER_KEYS } from "@/lib/integrations/catalog";
import {
  ACCOUNTING_STANDARD_VALUES,
  BASE_CURRENCIES,
  standardFieldName,
  type AccountingStandard,
} from "@/lib/workspace-options";

/**
 * The Settings mutations (PRD §21.1, §23, §25.2).
 *
 * Three rules govern this file.
 *
 * 1. **Every function re-authorises.** A Server Function is a POST endpoint: it answers a
 *    hand-rolled request exactly as happily as it answers our own form. The page that
 *    rendered the form proves nothing about the request that arrives here.
 * 2. **Drizzle bypasses RLS.** `requirePermission` establishes the tenant, and every
 *    statement below then carries a `workspace_id` predicate of its own. A missing
 *    predicate here is a cross-tenant write, not a slow query.
 * 3. **The workspace is resolved from its slug, never from a posted id.** The slug is just
 *    as forgeable, but the id it resolves to is the id the guard checks.
 *
 * Each function ends by redirecting back to the page it came from with `?saved=` or
 * `?error=`. The Settings pages are Server Components, so there is no `useActionState`
 * hook to hand a result to — the URL is the channel, and it has the useful property that
 * the outcome survives a reload and can be quoted in a support thread.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function checked(formData: FormData, key: string): boolean {
  return formData.get(key) !== null;
}

/** Checkbox groups submit one entry per ticked box, and nothing at all when none are. */
function many(formData: FormData, key: string): string[] {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

/** Resolves the slug to the workspace whose id the guard will then check. */
async function workspaceFromSlug(slug: string): Promise<{ id: string; settings: WorkspaceSettings }> {
  if (!slug) throw new Error("The workspace could not be identified.");
  const [workspace] = await db
    .select({ id: workspaces.id, settings: workspaces.settings })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  if (!workspace) throw new Error("That workspace does not exist.");
  return workspace;
}

function back(slug: string, section: string, params: Record<string, string>): never {
  const search = new URLSearchParams(params);
  const suffix = section ? `/${section}` : "";
  redirect(`/w/${slug}/settings${suffix}?${search}`);
}

// ── Workspace details ────────────────────────────────────────────────────────

const detailsSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Give the workspace a name of at least 2 characters.")
    .max(80, "Keep the name under 80 characters."),
  type: z.enum(workspaceTypeEnum.enumValues, {
    error: "Choose whether this workspace audits your own company or clients.",
  }),
  industry: z.string().trim().max(80, "Keep the industry under 80 characters."),
  baseCurrency: z.enum(BASE_CURRENCIES, { error: "Choose a base currency." }),
  fiscalYearStartMonth: z
    .number()
    .int()
    .min(1, "Choose the month the fiscal year starts.")
    .max(12, "Choose the month the fiscal year starts."),
});

/**
 * Workspace details.
 *
 * The slug is deliberately not editable: it is in every link anyone has ever shared, and a
 * renamed workspace whose old links 404 is a worse outcome than a stale slug.
 */
export async function updateWorkspaceDetails(formData: FormData): Promise<void> {
  const slug = str(formData, "workspaceSlug");
  const workspace = await workspaceFromSlug(slug);
  const { user } = await requirePermission(workspace.id, "workspace.manage");

  const parsed = detailsSchema.safeParse({
    name: str(formData, "name"),
    type: str(formData, "type"),
    industry: str(formData, "industry"),
    baseCurrency: str(formData, "baseCurrency"),
    fiscalYearStartMonth: Number.parseInt(str(formData, "fiscalYearStartMonth"), 10),
  });

  if (!parsed.success) {
    back(slug, "", { error: parsed.error.issues[0]?.message ?? "Those details are not valid." });
  }

  const standards: AccountingStandard[] = ACCOUNTING_STANDARD_VALUES.filter(
    (standard) => formData.get(standardFieldName(standard)) !== null,
  );

  await db
    .update(workspaces)
    .set({
      name: parsed.data.name,
      type: parsed.data.type,
      industry: parsed.data.industry || null,
      baseCurrency: parsed.data.baseCurrency,
      accountingStandards: standards.length > 0 ? standards : null,
      fiscalYearStartMonth: parsed.data.fiscalYearStartMonth,
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, workspace.id));

  await logActivity({
    workspaceId: workspace.id,
    action: "workspace.updated",
    targetType: "workspace",
    targetId: workspace.id,
    actorId: user.id,
    actorEmail: user.email,
    metadata: {
      name: parsed.data.name,
      type: parsed.data.type,
      industry: parsed.data.industry || null,
      baseCurrency: parsed.data.baseCurrency,
      fiscalYearStartMonth: parsed.data.fiscalYearStartMonth,
      accountingStandards: standards,
    },
  });

  // The name shows in the sidebar and the switcher, which the layout renders.
  revalidatePath("/", "layout");
  back(slug, "", { saved: "details" });
}

// ── Members and roles ────────────────────────────────────────────────────────

/**
 * A workspace with no owner can never be administered again — no one left could restore
 * `members.manage` to anyone. Both role changes and removals check this, and the check is
 * a read of the *other* members rather than of a counter that could drift.
 */
async function ownersBesides(workspaceId: string, userId: string): Promise<number> {
  const rows = await db
    .select({ userId: workspaceMembers.userId })
    .from(workspaceMembers)
    .where(
      and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.role, "owner"),
        ne(workspaceMembers.userId, userId),
      ),
    );
  return rows.length;
}

export async function changeMemberRole(formData: FormData): Promise<void> {
  const slug = str(formData, "workspaceSlug");
  const workspace = await workspaceFromSlug(slug);
  const { user } = await requirePermission(workspace.id, "members.manage");

  const memberId = str(formData, "memberId");
  const role = str(formData, "role");

  if (!UUID_RE.test(memberId) || !isMemberRole(role)) {
    back(slug, "members", { error: "That is not a role this workspace recognises." });
  }

  const [member] = await db
    .select({
      id: workspaceMembers.id,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.id, memberId), eq(workspaceMembers.workspaceId, workspace.id)))
    .limit(1);

  if (!member) {
    back(slug, "members", { error: "That member is not in this workspace." });
  }
  if (member.role === role) {
    back(slug, "members", { saved: "role" });
  }
  if (member.role === "owner" && (await ownersBesides(workspace.id, member.userId)) === 0) {
    back(slug, "members", {
      error:
        "This is the last owner. Make someone else an owner first — a workspace with none can never be administered again.",
    });
  }

  await db
    .update(workspaceMembers)
    .set({ role })
    .where(and(eq(workspaceMembers.id, member.id), eq(workspaceMembers.workspaceId, workspace.id)));

  await logActivity({
    workspaceId: workspace.id,
    action: "member.role_changed",
    targetType: "workspace_member",
    targetId: member.id,
    actorId: user.id,
    actorEmail: user.email,
    metadata: { memberUserId: member.userId, from: member.role, to: role },
  });

  revalidatePath(`/w/${slug}/settings/members`);
  back(slug, "members", { saved: "role" });
}

export async function removeMember(formData: FormData): Promise<void> {
  const slug = str(formData, "workspaceSlug");
  const workspace = await workspaceFromSlug(slug);
  const { user } = await requirePermission(workspace.id, "members.manage");

  const memberId = str(formData, "memberId");
  if (!UUID_RE.test(memberId)) {
    back(slug, "members", { error: "That member could not be identified." });
  }

  const [member] = await db
    .select({
      id: workspaceMembers.id,
      userId: workspaceMembers.userId,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.id, memberId), eq(workspaceMembers.workspaceId, workspace.id)))
    .limit(1);

  if (!member) {
    back(slug, "members", { error: "That member is not in this workspace." });
  }
  if (member.userId === user.id) {
    back(slug, "members", {
      error: "You cannot remove yourself. Ask another administrator to do it.",
    });
  }
  if (member.role === "owner" && (await ownersBesides(workspace.id, member.userId)) === 0) {
    back(slug, "members", {
      error: "This is the last owner, so they cannot be removed. Appoint another owner first.",
    });
  }

  await db
    .delete(workspaceMembers)
    .where(and(eq(workspaceMembers.id, member.id), eq(workspaceMembers.workspaceId, workspace.id)));

  // The audit trail keeps `actor_email` on every entry, so the removed member's history
  // stays readable even though `actor_id` will now resolve to nobody.
  await logActivity({
    workspaceId: workspace.id,
    action: "member.removed",
    targetType: "workspace_member",
    targetId: member.id,
    actorId: user.id,
    actorEmail: user.email,
    metadata: { memberUserId: member.userId, role: member.role },
  });

  revalidatePath(`/w/${slug}/settings/members`);
  back(slug, "members", { saved: "removed" });
}

// ── AI data controls (PRD §25.2) ─────────────────────────────────────────────

/**
 * These are read by `requireCanRunAudit`, so they are enforcement and not a preference
 * sheet: switching external models off stops every run in the workspace, immediately.
 */
export async function updateAiControls(formData: FormData): Promise<void> {
  const slug = str(formData, "workspaceSlug");
  const workspace = await workspaceFromSlug(slug);
  const { user } = await requirePermission(workspace.id, "workspace.manage");

  // Widened to `string[]` only so `includes` will accept unvalidated input — the point of
  // the call is to test membership, and a narrower parameter type would forbid the test.
  const known = (list: readonly string[], value: string) => list.includes(value);

  const providers = many(formData, "provider").filter((value) => known(AI_PROVIDER_VALUES, value));
  const regions = many(formData, "region").filter((value) => known(AI_REGION_VALUES, value));
  const fileTypes = many(formData, "fileType").filter((value) => known(FILE_TYPE_VALUES, value));
  const integrations = many(formData, "integration").filter((value) =>
    INTEGRATION_PROVIDER_KEYS.includes(value),
  );
  const roles = many(formData, "runRole").filter((value): value is MemberRole =>
    isMemberRole(value),
  );

  const allowExternalModels = checked(formData, "allowExternalModels");

  if (allowExternalModels && providers.length === 0) {
    back(slug, "ai", {
      error:
        "External models are allowed but no provider is permitted, which would leave every audit unable to run. Permit a provider, or disallow external models.",
    });
  }

  const ai: NonNullable<WorkspaceSettings["ai"]> = {
    allowExternalModels,
    permittedProviders: providers,
    permittedRegions: regions,
    retainConversations: checked(formData, "retainConversations"),
    allowProductImprovement: checked(formData, "allowProductImprovement"),
    // Empty means "whatever the role permits" — `requireCanRunAudit` treats an empty list
    // as no extra restriction, so it must never be written to mean "nobody".
    rolesAllowedToRunAudits: roles,
    permittedIntegrations: integrations,
    permittedFileTypes: fileTypes,
  };

  await db
    .update(workspaces)
    // The column holds retention and branding too, so merge rather than replace.
    .set({ settings: { ...workspace.settings, ai }, updatedAt: new Date() })
    .where(eq(workspaces.id, workspace.id));

  await logActivity({
    workspaceId: workspace.id,
    action: "workspace.ai_controls_updated",
    targetType: "workspace",
    targetId: workspace.id,
    actorId: user.id,
    actorEmail: user.email,
    metadata: {
      allowExternalModels,
      permittedProviders: providers,
      permittedRegions: regions,
      retainConversations: ai.retainConversations,
      allowProductImprovement: ai.allowProductImprovement,
      rolesAllowedToRunAudits: roles,
      permittedIntegrations: integrations,
      permittedFileTypes: fileTypes,
    },
  });

  revalidatePath(`/w/${slug}/settings/ai`);
  back(slug, "ai", { saved: "ai" });
}

// ── Approved models (PRD §23) ────────────────────────────────────────────────

/**
 * The platform ships a registry of models with `workspace_id IS NULL`. A workspace never
 * edits those rows — it writes an override of its own keyed `(workspace_id, model_id)`,
 * which is what `resolveModel` prefers. That keeps one workspace's governance decision
 * from reaching every other workspace on the deployment.
 */
async function overrideRow(workspaceId: string, modelId: string) {
  const [scoped] = await db
    .select()
    .from(approvedModels)
    .where(and(eq(approvedModels.workspaceId, workspaceId), eq(approvedModels.modelId, modelId)))
    .limit(1);
  if (scoped) return scoped;

  const [platform] = await db
    .select()
    .from(approvedModels)
    .where(and(isNull(approvedModels.workspaceId), eq(approvedModels.modelId, modelId)))
    .limit(1);
  return platform ?? null;
}

export async function setModelStatus(formData: FormData): Promise<void> {
  const slug = str(formData, "workspaceSlug");
  const workspace = await workspaceFromSlug(slug);
  const { user } = await requirePermission(workspace.id, "models.approve");

  const modelId = str(formData, "modelId");
  const parsedStatus = z.enum(modelStatusEnum.enumValues).safeParse(str(formData, "status"));

  if (!parsedStatus.success) {
    back(slug, "models", { error: "That is not a model status." });
  }
  const nextStatus = parsedStatus.data;

  const source = await overrideRow(workspace.id, modelId);
  if (!source) {
    back(slug, "models", { error: "That model is not in the registry." });
  }

  // Deprecating the workspace default would leave `resolveModel` falling back to the
  // platform's choice without anyone having decided that. Make it an explicit step.
  if (nextStatus !== "approved" && source.workspaceId === workspace.id && source.isDefault) {
    back(slug, "models", {
      error:
        "This is the workspace default. Make another approved model the default first, so no audit silently changes model.",
    });
  }

  await db
    .insert(approvedModels)
    .values({
      workspaceId: workspace.id,
      modelId,
      label: source.label,
      status: nextStatus,
      isDefault: false,
      params: source.params,
      evalNotes: source.evalNotes,
      contextWindow: source.contextWindow,
      approvedBy: nextStatus === "approved" ? user.id : null,
      approvedAt: nextStatus === "approved" ? new Date() : null,
    })
    .onConflictDoUpdate({
      target: [approvedModels.workspaceId, approvedModels.modelId],
      set: {
        status: nextStatus,
        approvedBy: nextStatus === "approved" ? user.id : null,
        approvedAt: nextStatus === "approved" ? new Date() : null,
      },
    });

  await logActivity({
    workspaceId: workspace.id,
    action: `model.${nextStatus}`,
    targetType: "approved_model",
    actorId: user.id,
    actorEmail: user.email,
    metadata: { modelId, label: source.label, status: nextStatus },
  });

  revalidatePath(`/w/${slug}/settings/models`);
  back(slug, "models", { saved: "status" });
}

export async function setDefaultModel(formData: FormData): Promise<void> {
  const slug = str(formData, "workspaceSlug");
  const workspace = await workspaceFromSlug(slug);
  const { user } = await requirePermission(workspace.id, "models.approve");

  const modelId = str(formData, "modelId");
  const source = await overrideRow(workspace.id, modelId);

  if (!source) {
    back(slug, "models", { error: "That model is not in the registry." });
  }

  // The effective status is the workspace's own if it has one, the platform's otherwise.
  const scoped = source.workspaceId === workspace.id ? source : null;
  const status = scoped?.status ?? source.status;
  if (status !== "approved") {
    back(slug, "models", {
      error: "Only an approved model can be the default. Approve it first.",
    });
  }

  await db.transaction(async (tx) => {
    // One default per workspace: `resolveModel` takes the first it finds, so two would
    // make the choice depend on row order.
    await tx
      .update(approvedModels)
      .set({ isDefault: false })
      .where(eq(approvedModels.workspaceId, workspace.id));

    await tx
      .insert(approvedModels)
      .values({
        workspaceId: workspace.id,
        modelId,
        label: source.label,
        status: "approved",
        isDefault: true,
        params: source.params,
        evalNotes: source.evalNotes,
        contextWindow: source.contextWindow,
        approvedBy: user.id,
        approvedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [approvedModels.workspaceId, approvedModels.modelId],
        set: { isDefault: true, status: "approved", approvedBy: user.id, approvedAt: new Date() },
      });
  });

  await logActivity({
    workspaceId: workspace.id,
    action: "model.default_set",
    targetType: "approved_model",
    actorId: user.id,
    actorEmail: user.email,
    // Audits already completed keep the model they recorded; this only moves future runs.
    metadata: { modelId, label: source.label, appliesTo: "future runs" },
  });

  revalidatePath(`/w/${slug}/settings/models`);
  back(slug, "models", { saved: "default" });
}

/** Hands the choice back to the platform registry by dropping the workspace's override. */
export async function clearModelOverride(formData: FormData): Promise<void> {
  const slug = str(formData, "workspaceSlug");
  const workspace = await workspaceFromSlug(slug);
  const { user } = await requirePermission(workspace.id, "models.approve");

  const modelId = str(formData, "modelId");

  const deleted = await db
    .delete(approvedModels)
    .where(and(eq(approvedModels.workspaceId, workspace.id), eq(approvedModels.modelId, modelId)))
    .returning({ id: approvedModels.id, label: approvedModels.label });

  if (deleted.length === 0) {
    back(slug, "models", { error: "This workspace has no decision recorded for that model." });
  }

  await logActivity({
    workspaceId: workspace.id,
    action: "model.override_cleared",
    targetType: "approved_model",
    actorId: user.id,
    actorEmail: user.email,
    metadata: { modelId, label: deleted[0]?.label },
  });

  revalidatePath(`/w/${slug}/settings/models`);
  back(slug, "models", { saved: "cleared" });
}
