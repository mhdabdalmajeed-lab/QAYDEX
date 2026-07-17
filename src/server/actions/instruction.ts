"use server";

import { and, count, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import {
  auditInstructionLinks,
  instructionCategoryEnum,
  instructionVersions,
  instructions,
  workspaces,
} from "@/db/schema";
import { logActivity } from "@/lib/activity";
import { requirePermission } from "@/lib/auth/guards";

/**
 * The instructions library (PRD §9).
 *
 * The single rule that shapes this whole file: **editing the text of an instruction must
 * never change an audit that already used it** (§9.4). So `instructions` holds the
 * metadata and a `current_version` pointer, `instruction_versions` holds immutable text,
 * and an audit pins an `instruction_version_id`. Saving new text therefore *appends* a
 * version — it never rewrites one. Metadata edits (name, priority, tags…) do not cut a
 * version because they do not change what the model was told.
 *
 * Every action re-authorises: Server Functions answer direct POSTs, and drizzle bypasses
 * RLS, so the guard here is the tenant boundary.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const MODULES = ["general", "ledger", "budgets", "cash", "customers", "suppliers"] as const;

/** `system` is the platform's own, not something a user may award themselves. */
const USER_VISIBILITIES = ["workspace", "private", "client"] as const;

const fieldsSchema = z.object({
  name: z.string().trim().min(2, "Give the instruction a name.").max(160),
  description: z.string().trim().max(2000).nullable(),
  text: z
    .string()
    .trim()
    .min(10, "An instruction needs text the model can actually follow.")
    .max(20000),
  category: z.enum(instructionCategoryEnum.enumValues, {
    error: "Choose a category.",
  }),
  visibility: z.enum(USER_VISIBILITIES, { error: "Choose who can see this." }),
  priority: z.number().int().min(1, "Priority starts at 1.").max(1000),
  mandatory: z.boolean(),
  status: z.enum(["draft", "active", "archived"]),
  clientId: z.string().regex(UUID).nullable(),
  applicableModules: z.array(z.enum(MODULES)),
  applicableEntityIds: z.array(z.string().regex(UUID)),
  applicableTemplateIds: z.array(z.string().regex(UUID)),
  effectiveDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  expirationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
  tags: z.array(z.string().trim().min(1).max(40)),
  changelog: z.string().trim().max(500).nullable(),
});

export type InstructionFormState = {
  error?: string;
  fieldErrors?: Partial<Record<string, string>>;
};

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function optional(formData: FormData, key: string): string | null {
  const value = str(formData, key).trim();
  return value.length > 0 ? value : null;
}

function many(formData: FormData, key: string): string[] {
  return formData.getAll(key).flatMap((value) => (typeof value === "string" ? [value] : []));
}

function readFields(formData: FormData) {
  return fieldsSchema.safeParse({
    name: str(formData, "name"),
    description: optional(formData, "description"),
    text: str(formData, "text"),
    category: str(formData, "category"),
    visibility: str(formData, "visibility"),
    priority: Number.parseInt(str(formData, "priority") || "100", 10),
    mandatory: formData.get("mandatory") !== null,
    status: str(formData, "status") || "active",
    clientId: optional(formData, "clientId"),
    applicableModules: many(formData, "applicableModules"),
    applicableEntityIds: many(formData, "applicableEntityIds"),
    applicableTemplateIds: many(formData, "applicableTemplateIds"),
    effectiveDate: optional(formData, "effectiveDate"),
    expirationDate: optional(formData, "expirationDate"),
    tags: str(formData, "tags")
      .split(",")
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0),
    changelog: optional(formData, "changelog"),
  });
}

function toFieldErrors(issues: readonly z.core.$ZodIssue[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors[key]) errors[key] = issue.message;
  }
  return errors;
}

async function workspaceBySlug(slug: string) {
  const [workspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  if (!workspace) throw new Error("Workspace not found");
  return workspace;
}

export async function createInstruction(
  _prev: InstructionFormState,
  formData: FormData,
): Promise<InstructionFormState> {
  const slug = str(formData, "workspaceSlug");
  const parsed = readFields(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error.issues) };
  const input = parsed.data;

  const workspace = await workspaceBySlug(slug);
  const { user } = await requirePermission(workspace.id, "instructions.manage");

  if (input.expirationDate && input.effectiveDate && input.expirationDate < input.effectiveDate) {
    return { fieldErrors: { expirationDate: "The expiry date is before the effective date." } };
  }

  let instructionId: string;
  try {
    instructionId = await db.transaction(async (tx) => {
      const [row] = await tx
        .insert(instructions)
        .values({
          workspaceId: workspace.id,
          name: input.name,
          description: input.description,
          category: input.category,
          ownerId: user.id,
          clientId: input.clientId,
          visibility: input.visibility,
          priority: input.priority,
          mandatory: input.mandatory,
          status: input.status,
          tags: input.tags.length > 0 ? input.tags : null,
          applicableModules: input.applicableModules.length > 0 ? input.applicableModules : null,
          applicableEntityIds:
            input.applicableEntityIds.length > 0 ? input.applicableEntityIds : null,
          applicableTemplateIds:
            input.applicableTemplateIds.length > 0 ? input.applicableTemplateIds : null,
          effectiveDate: input.effectiveDate,
          expirationDate: input.expirationDate,
          currentVersion: 1,
        })
        .returning({ id: instructions.id });

      await tx.insert(instructionVersions).values({
        workspaceId: workspace.id,
        instructionId: row.id,
        version: 1,
        text: input.text,
        changelog: input.changelog ?? "Initial version.",
        createdBy: user.id,
      });

      return row.id;
    });
  } catch (error) {
    console.error("createInstruction failed", error);
    return { error: "The instruction could not be saved. Please try again." };
  }

  await logActivity({
    workspaceId: workspace.id,
    action: "instruction.created",
    targetType: "instruction",
    targetId: instructionId,
    metadata: { name: input.name, category: input.category, version: 1 },
  });

  // Outside the try/catch: redirect() reports success by throwing.
  redirect(`/w/${slug}/instructions/${instructionId}`);
}

export async function updateInstruction(
  _prev: InstructionFormState,
  formData: FormData,
): Promise<InstructionFormState> {
  const slug = str(formData, "workspaceSlug");
  const instructionId = str(formData, "instructionId");
  if (!UUID.test(instructionId)) return { error: "That instruction no longer exists." };

  const parsed = readFields(formData);
  if (!parsed.success) return { fieldErrors: toFieldErrors(parsed.error.issues) };
  const input = parsed.data;

  const [existing] = await db
    .select()
    .from(instructions)
    .where(eq(instructions.id, instructionId))
    .limit(1);
  if (!existing) return { error: "That instruction no longer exists." };

  const { user } = await requirePermission(existing.workspaceId, "instructions.manage");

  if (input.expirationDate && input.effectiveDate && input.expirationDate < input.effectiveDate) {
    return { fieldErrors: { expirationDate: "The expiry date is before the effective date." } };
  }

  const [currentVersion] = await db
    .select()
    .from(instructionVersions)
    .where(
      and(
        eq(instructionVersions.instructionId, instructionId),
        eq(instructionVersions.version, existing.currentVersion),
      ),
    )
    .limit(1);

  // The whole point of §9.4: different text means a *new* version, never an edit to the
  // old one. Audits that pinned the old version keep resolving to the exact words they
  // were generated from.
  const textChanged = (currentVersion?.text ?? "") !== input.text;
  const nextVersion = textChanged ? existing.currentVersion + 1 : existing.currentVersion;

  try {
    await db.transaction(async (tx) => {
      if (textChanged) {
        await tx.insert(instructionVersions).values({
          workspaceId: existing.workspaceId,
          instructionId,
          version: nextVersion,
          text: input.text,
          changelog: input.changelog,
          createdBy: user.id,
        });
      }

      await tx
        .update(instructions)
        .set({
          name: input.name,
          description: input.description,
          category: input.category,
          clientId: input.clientId,
          visibility: input.visibility,
          priority: input.priority,
          mandatory: input.mandatory,
          status: input.status,
          tags: input.tags.length > 0 ? input.tags : null,
          applicableModules: input.applicableModules.length > 0 ? input.applicableModules : null,
          applicableEntityIds:
            input.applicableEntityIds.length > 0 ? input.applicableEntityIds : null,
          applicableTemplateIds:
            input.applicableTemplateIds.length > 0 ? input.applicableTemplateIds : null,
          effectiveDate: input.effectiveDate,
          expirationDate: input.expirationDate,
          currentVersion: nextVersion,
          updatedAt: new Date(),
        })
        // The workspace predicate is repeated even though the id is unique: it is what
        // makes a forged id impossible to use against another tenant.
        .where(
          and(eq(instructions.id, instructionId), eq(instructions.workspaceId, existing.workspaceId)),
        );
    });
  } catch (error) {
    console.error("updateInstruction failed", error);
    return { error: "The instruction could not be saved. Please try again." };
  }

  await logActivity({
    workspaceId: existing.workspaceId,
    action: textChanged ? "instruction.version_created" : "instruction.updated",
    targetType: "instruction",
    targetId: instructionId,
    metadata: { name: input.name, version: nextVersion, textChanged },
  });

  revalidatePath(`/w/${slug}/instructions/${instructionId}`);
  revalidatePath(`/w/${slug}/instructions`);
  return {};
}

export async function setInstructionStatus(formData: FormData) {
  const slug = str(formData, "workspaceSlug");
  const instructionId = str(formData, "instructionId");
  const status = str(formData, "status");
  if (!UUID.test(instructionId)) throw new Error("That instruction no longer exists.");
  if (status !== "draft" && status !== "active" && status !== "archived") {
    throw new Error("Unknown status.");
  }

  const [existing] = await db
    .select({ id: instructions.id, workspaceId: instructions.workspaceId, name: instructions.name })
    .from(instructions)
    .where(eq(instructions.id, instructionId))
    .limit(1);
  if (!existing) throw new Error("That instruction no longer exists.");

  await requirePermission(existing.workspaceId, "instructions.manage");

  await db
    .update(instructions)
    .set({ status, updatedAt: new Date() })
    .where(
      and(eq(instructions.id, instructionId), eq(instructions.workspaceId, existing.workspaceId)),
    );

  await logActivity({
    workspaceId: existing.workspaceId,
    action: `instruction.${status}`,
    targetType: "instruction",
    targetId: instructionId,
    metadata: { name: existing.name },
  });

  revalidatePath(`/w/${slug}/instructions/${instructionId}`);
  revalidatePath(`/w/${slug}/instructions`);
}

/**
 * Deleting is only offered for an instruction no audit ever attached.
 *
 * `audit_instruction_links.instruction_id` cascades, so deleting a used instruction would
 * silently sever a completed audit from the words it was generated under — the exact
 * failure §9.4 exists to prevent. Those are archived instead, which stops them feeding new
 * audits while leaving history intact.
 */
export async function deleteInstruction(formData: FormData) {
  const slug = str(formData, "workspaceSlug");
  const instructionId = str(formData, "instructionId");
  if (!UUID.test(instructionId)) throw new Error("That instruction no longer exists.");

  const [existing] = await db
    .select({ id: instructions.id, workspaceId: instructions.workspaceId, name: instructions.name })
    .from(instructions)
    .where(eq(instructions.id, instructionId))
    .limit(1);
  if (!existing) throw new Error("That instruction no longer exists.");

  await requirePermission(existing.workspaceId, "instructions.manage");

  const [used] = await db
    .select({ total: count() })
    .from(auditInstructionLinks)
    .where(
      and(
        eq(auditInstructionLinks.instructionId, instructionId),
        eq(auditInstructionLinks.workspaceId, existing.workspaceId),
      ),
    );

  if ((used?.total ?? 0) > 0) {
    throw new Error(
      `"${existing.name}" is attached to ${used.total} audit${used.total === 1 ? "" : "s"} and cannot be deleted — ` +
        "those audits must keep resolving to the exact text they ran under. Archive it instead.",
    );
  }

  await db
    .delete(instructions)
    .where(
      and(eq(instructions.id, instructionId), eq(instructions.workspaceId, existing.workspaceId)),
    );

  await logActivity({
    workspaceId: existing.workspaceId,
    action: "instruction.deleted",
    targetType: "instruction",
    targetId: instructionId,
    metadata: { name: existing.name },
  });

  redirect(`/w/${slug}/instructions`);
}
