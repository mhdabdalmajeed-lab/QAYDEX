"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { templateVersions, templates, workspaces } from "@/db/schema";
import { logActivity } from "@/lib/activity";
import { requirePermission } from "@/lib/auth/guards";

/**
 * Template mutations (PRD §17.1: templates must be duplicable and customizable).
 *
 * Every action re-establishes authorisation itself. Server Functions answer a direct POST
 * just as happily as they answer our own form, and drizzle bypasses RLS — so the guard
 * here is the whole boundary.
 */

async function workspaceBySlug(slug: string) {
  const [workspace] = await db
    .select({ id: workspaces.id, slug: workspaces.slug })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  if (!workspace) throw new Error("Workspace not found");
  return workspace;
}

function slugify(value: string): string {
  return (
    value
      // NFKD first so "Réconciliation" folds to "reconciliation" rather than losing the é.
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48)
      .replace(/-+$/g, "") || "template"
  );
}

const duplicateSchema = z.object({
  workspaceSlug: z.string().min(1),
  templateId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
});

export type DuplicateTemplateState = { error?: string; ok?: boolean; slug?: string };

/**
 * Copies a template into this workspace as an editable copy.
 *
 * The copy starts at version 1 with its own body: a workspace template that shared rows
 * with the system library would change under audits that pinned it, which is exactly what
 * §9.4/§23 forbid. Source templates are readable if they are system templates
 * (`workspace_id IS NULL`) or already belong to this workspace — never another tenant's.
 */
export async function duplicateTemplate(
  _prev: DuplicateTemplateState,
  formData: FormData,
): Promise<DuplicateTemplateState> {
  const parsed = duplicateSchema.safeParse({
    workspaceSlug: String(formData.get("workspaceSlug") ?? ""),
    templateId: String(formData.get("templateId") ?? ""),
    name: String(formData.get("name") ?? "").trim(),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Give the copy a name." };
  }
  const input = parsed.data;

  const workspace = await workspaceBySlug(input.workspaceSlug);
  const { user } = await requirePermission(workspace.id, "templates.manage");

  const [source] = await db
    .select()
    .from(templates)
    .where(eq(templates.id, input.templateId))
    .limit(1);
  if (!source) return { error: "That template no longer exists." };
  if (source.workspaceId !== null && source.workspaceId !== workspace.id) {
    // Belongs to another tenant: answer as if it does not exist.
    return { error: "That template no longer exists." };
  }

  const [version] = await db
    .select()
    .from(templateVersions)
    .where(
      and(
        eq(templateVersions.templateId, source.id),
        eq(templateVersions.version, source.currentVersion),
      ),
    )
    .limit(1);
  if (!version) return { error: "That template has no body to copy." };

  const base = slugify(input.name);

  try {
    const created = await db.transaction(async (tx) => {
      // `templates_slug_key` is global, so the workspace slug is part of the key rather
      // than a nicety — two workspaces may both copy "General ledger audit".
      const [copy] = await tx
        .insert(templates)
        .values({
          workspaceId: workspace.id,
          slug: `${workspace.slug}-${base}-${Date.now().toString(36)}`,
          name: input.name,
          category: source.category,
          subcategory: source.subcategory,
          description: source.description,
          isSystem: false,
          visibility: "workspace",
          tags: source.tags,
          currentVersion: 1,
          createdBy: user.id,
        })
        .returning({ id: templates.id, slug: templates.slug });

      await tx.insert(templateVersions).values({
        templateId: copy.id,
        version: 1,
        defaultTitle: version.defaultTitle,
        auditDescription: version.auditDescription,
        instructions: version.instructions,
        recommendedInputs: version.recommendedInputs,
        requiredEvidence: version.requiredEvidence,
        suggestedPeriod: version.suggestedPeriod,
        expectedOutputStructure: version.expectedOutputStructure,
        suggestedFollowups: version.suggestedFollowups,
        relevantIntegrations: version.relevantIntegrations,
      });

      return copy;
    });

    await logActivity({
      workspaceId: workspace.id,
      action: "template.duplicated",
      targetType: "template",
      targetId: created.id,
      metadata: { from: source.slug, name: input.name },
    });

    revalidatePath(`/w/${input.workspaceSlug}/templates`);
    return { ok: true, slug: created.slug };
  } catch (error) {
    console.error("duplicateTemplate failed", error);
    return { error: "The template could not be copied. Please try again." };
  }
}
