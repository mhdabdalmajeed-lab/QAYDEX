"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { db } from "@/db";
import { auditInputs, audits, conversationAudits, conversations, findings, messages, workspaces } from "@/db/schema";
import type { MessageAttachment } from "@/db/schema";
import { logActivity } from "@/lib/activity";
import { requirePermission } from "@/lib/auth/guards";

/**
 * Conversation mutations (PRD §10).
 *
 * Every action re-establishes authorisation itself and carries its own workspace predicate:
 * Server Functions are reachable by direct POST, and drizzle bypasses RLS, so the guard here
 * is the whole boundary. `chat.use` is the gate — `read_only` and `client_user` do not have
 * it, and a crafted POST is refused rather than trusted because our UI would not have shown
 * the button.
 */

async function workspaceBySlug(slug: string) {
  const [workspace] = await db
    .select({ id: workspaces.id, slug: workspaces.slug })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  if (!workspace) throw new Error("Workspace not found.");
  return workspace;
}

/** Loads a conversation and proves the caller may use chat in the workspace that owns it. */
async function loadConversation(conversationId: string) {
  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, conversationId))
    .limit(1);
  if (!conversation) throw new Error("Conversation not found.");
  const { user } = await requirePermission(conversation.workspaceId, "chat.use");
  return { conversation, user };
}

function touch(conversationId: string) {
  return db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));
}

function revalidateChat(slug: string, conversationId?: string) {
  revalidatePath(`/w/${slug}/chat`, "page");
  if (conversationId) revalidatePath(`/w/${slug}/chat/${conversationId}`, "page");
}

/* -------------------------------------------------------------------------- */
/* Create                                                                     */
/* -------------------------------------------------------------------------- */

export type CreateConversationResult = { id: string; workspaceId: string };

/**
 * Creates a conversation, optionally grounded in an audit. Callable from a page (the
 * `chat/new` route) as well as from a form, so it takes arguments rather than FormData.
 */
export async function createConversation(input: {
  workspaceSlug: string;
  title?: string | null;
  auditIds?: string[];
}): Promise<CreateConversationResult> {
  const workspace = await workspaceBySlug(input.workspaceSlug);
  const { user } = await requirePermission(workspace.id, "chat.use");

  // Filter to audits that are really in this workspace before anything is written: an
  // attachment is what decides which evidence the model may read.
  const requested = [...new Set(input.auditIds ?? [])];
  const allowed =
    requested.length > 0
      ? await db
          .select({ id: audits.id, name: audits.name })
          .from(audits)
          .where(and(eq(audits.workspaceId, workspace.id), inArray(audits.id, requested)))
      : [];

  const title =
    input.title?.trim() ||
    (allowed.length === 1 ? `Chat about ${allowed[0].name}` : "New conversation");

  const conversationId = await db.transaction(async (tx) => {
    const [conversation] = await tx
      .insert(conversations)
      .values({ workspaceId: workspace.id, title: title.slice(0, 200), createdBy: user.id })
      .returning({ id: conversations.id });

    for (const audit of allowed) {
      await tx.insert(conversationAudits).values({
        workspaceId: workspace.id,
        conversationId: conversation.id,
        auditId: audit.id,
      });
    }

    return conversation.id;
  });

  await logActivity({
    workspaceId: workspace.id,
    action: "conversation.created",
    targetType: "conversation",
    targetId: conversationId,
    auditId: allowed[0]?.id ?? null,
    metadata: { auditIds: allowed.map((audit) => audit.id) },
  });

  return { id: conversationId, workspaceId: workspace.id };
}

export type NewChatState = { error?: string };

/** Form entry point: create and go straight into the conversation. */
export async function startConversation(
  _prev: NewChatState,
  formData: FormData,
): Promise<NewChatState> {
  const slug = String(formData.get("workspaceSlug") ?? "");
  const auditId = (formData.get("auditId") as string) || null;

  let created: CreateConversationResult;
  try {
    created = await createConversation({
      workspaceSlug: slug,
      auditIds: auditId ? [auditId] : [],
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not start a conversation." };
  }

  redirect(`/w/${slug}/chat/${created.id}`);
}

/* -------------------------------------------------------------------------- */
/* Rename · pin · archive · delete                                            */
/* -------------------------------------------------------------------------- */

const titleSchema = z.string().trim().min(1, "A conversation needs a title.").max(200);

export type RenameState = { error?: string; ok?: boolean };

export async function renameConversation(
  _prev: RenameState,
  formData: FormData,
): Promise<RenameState> {
  const conversationId = String(formData.get("conversationId") ?? "");
  const slug = String(formData.get("workspaceSlug") ?? "");

  const parsed = titleSchema.safeParse(formData.get("title"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "That title is not valid." };

  try {
    const { conversation } = await loadConversation(conversationId);
    await db
      .update(conversations)
      .set({ title: parsed.data, updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));

    await logActivity({
      workspaceId: conversation.workspaceId,
      action: "conversation.renamed",
      targetType: "conversation",
      targetId: conversationId,
      metadata: { title: parsed.data },
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not rename this conversation." };
  }

  revalidateChat(slug, conversationId);
  return { ok: true };
}

export async function setConversationPinned(formData: FormData) {
  const conversationId = String(formData.get("conversationId") ?? "");
  const slug = String(formData.get("workspaceSlug") ?? "");
  const pinned = formData.get("pinned") === "true";

  const { conversation } = await loadConversation(conversationId);
  await db
    .update(conversations)
    .set({ pinned, updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  await logActivity({
    workspaceId: conversation.workspaceId,
    action: pinned ? "conversation.pinned" : "conversation.unpinned",
    targetType: "conversation",
    targetId: conversationId,
  });

  revalidateChat(slug, conversationId);
}

export async function setConversationArchived(formData: FormData) {
  const conversationId = String(formData.get("conversationId") ?? "");
  const slug = String(formData.get("workspaceSlug") ?? "");
  const archived = formData.get("archived") === "true";

  const { conversation } = await loadConversation(conversationId);
  await db
    .update(conversations)
    // Archiving is not pinning's opposite, but a pinned archive is a contradiction the list
    // would render twice, so archiving clears the pin.
    .set({ archived, pinned: archived ? false : conversation.pinned, updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  await logActivity({
    workspaceId: conversation.workspaceId,
    action: archived ? "conversation.archived" : "conversation.unarchived",
    targetType: "conversation",
    targetId: conversationId,
  });

  revalidateChat(slug, conversationId);
}

export async function deleteConversation(formData: FormData) {
  const conversationId = String(formData.get("conversationId") ?? "");
  const slug = String(formData.get("workspaceSlug") ?? "");
  const returnToList = formData.get("returnToList") === "true";

  const { conversation } = await loadConversation(conversationId);

  await logActivity({
    workspaceId: conversation.workspaceId,
    action: "conversation.deleted",
    targetType: "conversation",
    targetId: conversationId,
    metadata: { title: conversation.title },
  });

  // Messages and attachments cascade. Audits do not: a conversation is a view onto an audit,
  // never its owner.
  await db.delete(conversations).where(eq(conversations.id, conversationId));

  revalidateChat(slug);
  if (returnToList) redirect(`/w/${slug}/chat`);
}

/* -------------------------------------------------------------------------- */
/* Attachments (PRD §10.1)                                                    */
/* -------------------------------------------------------------------------- */

export type AttachState = { error?: string; ok?: boolean };

export async function attachAudit(_prev: AttachState, formData: FormData): Promise<AttachState> {
  const conversationId = String(formData.get("conversationId") ?? "");
  const slug = String(formData.get("workspaceSlug") ?? "");
  const auditId = String(formData.get("auditId") ?? "");

  try {
    const { conversation } = await loadConversation(conversationId);

    const [audit] = await db
      .select({ id: audits.id, name: audits.name })
      .from(audits)
      .where(and(eq(audits.id, auditId), eq(audits.workspaceId, conversation.workspaceId)))
      .limit(1);
    if (!audit) return { error: "That audit is not in this workspace." };

    await db
      .insert(conversationAudits)
      .values({ workspaceId: conversation.workspaceId, conversationId, auditId })
      .onConflictDoNothing();

    await touch(conversationId);
    await logActivity({
      workspaceId: conversation.workspaceId,
      action: "conversation.audit_attached",
      targetType: "conversation",
      targetId: conversationId,
      auditId,
      metadata: { auditName: audit.name },
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not attach that audit." };
  }

  revalidateChat(slug, conversationId);
  return { ok: true };
}

export async function detachAudit(formData: FormData) {
  const conversationId = String(formData.get("conversationId") ?? "");
  const slug = String(formData.get("workspaceSlug") ?? "");
  const auditId = String(formData.get("auditId") ?? "");

  const { conversation } = await loadConversation(conversationId);

  await db
    .delete(conversationAudits)
    .where(
      and(
        eq(conversationAudits.conversationId, conversationId),
        eq(conversationAudits.auditId, auditId),
        eq(conversationAudits.workspaceId, conversation.workspaceId),
      ),
    );

  await touch(conversationId);
  await logActivity({
    workspaceId: conversation.workspaceId,
    action: "conversation.audit_detached",
    targetType: "conversation",
    targetId: conversationId,
    auditId,
  });

  revalidateChat(slug, conversationId);
}

/**
 * Written context (PRD §10.1): a note the user wants the model to treat as their claim.
 *
 * It is stored as a user message carrying a `text` attachment rather than smuggled into the
 * system prompt, because §10.5 requires the model to keep "user_claim" distinct from
 * evidence — and the only way to keep that honest is to make its provenance visible in the
 * transcript the user can read.
 */
export async function addWrittenContext(
  _prev: AttachState,
  formData: FormData,
): Promise<AttachState> {
  const conversationId = String(formData.get("conversationId") ?? "");
  const slug = String(formData.get("workspaceSlug") ?? "");
  const label = String(formData.get("label") ?? "").trim() || "Written context";
  const body = String(formData.get("body") ?? "").trim();

  if (!body) return { error: "Write something first." };
  if (body.length > 50_000) return { error: "That is too long for a chat note — attach it to an audit as an input instead." };

  try {
    const { conversation } = await loadConversation(conversationId);

    const attachment: MessageAttachment = { kind: "text", name: label };
    await db.insert(messages).values({
      workspaceId: conversation.workspaceId,
      conversationId,
      role: "user",
      content: `**${label}** (written context — my claim, not verified evidence)\n\n${body}`,
      attachments: [attachment],
    });

    await touch(conversationId);
    await logActivity({
      workspaceId: conversation.workspaceId,
      action: "conversation.context_added",
      targetType: "conversation",
      targetId: conversationId,
      metadata: { label, chars: body.length },
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not add that context." };
  }

  revalidateChat(slug, conversationId);
  return { ok: true };
}

/**
 * Attach selected findings (PRD §10.1) as a user message that names them. The findings
 * themselves already arrive in the grounding pack for an attached audit; this pins the
 * conversation to specific ones so the model knows which are being discussed.
 */
export async function attachFindings(
  _prev: AttachState,
  formData: FormData,
): Promise<AttachState> {
  const conversationId = String(formData.get("conversationId") ?? "");
  const slug = String(formData.get("workspaceSlug") ?? "");
  const findingIds = formData.getAll("findingId").map(String).filter(Boolean);

  if (findingIds.length === 0) return { error: "Select at least one finding." };

  try {
    const { conversation } = await loadConversation(conversationId);

    const selected = await db
      .select({
        id: findings.id,
        title: findings.title,
        severity: findings.severity,
        auditId: findings.auditId,
        auditName: audits.name,
      })
      .from(findings)
      .innerJoin(audits, eq(audits.id, findings.auditId))
      .where(
        and(
          eq(findings.workspaceId, conversation.workspaceId),
          inArray(findings.id, findingIds),
        ),
      );

    if (selected.length === 0) return { error: "Those findings are not in this workspace." };

    // A finding is only readable if its audit is attached — otherwise the model would be
    // asked about evidence it cannot open.
    const auditIds = [...new Set(selected.map((row) => row.auditId))];
    for (const auditId of auditIds) {
      await db
        .insert(conversationAudits)
        .values({ workspaceId: conversation.workspaceId, conversationId, auditId })
        .onConflictDoNothing();
    }

    const attachments: MessageAttachment[] = selected.map((row) => ({
      kind: "finding",
      refId: row.id,
      name: row.title,
      meta: { severity: row.severity, auditId: row.auditId, auditName: row.auditName },
    }));

    await db.insert(messages).values({
      workspaceId: conversation.workspaceId,
      conversationId,
      role: "user",
      content:
        `Let's talk about ${selected.length === 1 ? "this finding" : "these findings"}:\n\n` +
        selected
          .map((row) => `- findingId=${row.id} · [${row.severity}] ${row.title} (${row.auditName})`)
          .join("\n"),
      attachments,
    });

    await touch(conversationId);
    await logActivity({
      workspaceId: conversation.workspaceId,
      action: "conversation.findings_attached",
      targetType: "conversation",
      targetId: conversationId,
      metadata: { findingIds: selected.map((row) => row.id) },
    });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not attach those findings." };
  }

  revalidateChat(slug, conversationId);
  return { ok: true };
}

/**
 * The options an attachment picker needs. Files are deliberately absent: an uploaded file has
 * to belong to an audit to be parsed and cited (the PRD's audit-first rule), so chat offers
 * audit attachment and written context instead of a upload that would go nowhere.
 */
export async function loadAttachOptions(workspaceSlug: string) {
  const workspace = await workspaceBySlug(workspaceSlug);
  await requirePermission(workspace.id, "chat.use");

  const rows = await db
    .select({
      id: audits.id,
      name: audits.name,
      domain: audits.domain,
      status: audits.status,
      periodLabel: audits.periodLabel,
      findingCount: audits.findingCount,
      updatedAt: audits.updatedAt,
    })
    .from(audits)
    .where(eq(audits.workspaceId, workspace.id));

  const inputCounts = await db
    .select({ auditId: auditInputs.auditId })
    .from(auditInputs)
    .where(eq(auditInputs.workspaceId, workspace.id));

  const byAudit = new Map<string, number>();
  for (const row of inputCounts) {
    byAudit.set(row.auditId, (byAudit.get(row.auditId) ?? 0) + 1);
  }

  return rows.map((row) => ({ ...row, inputCount: byAudit.get(row.id) ?? 0 }));
}
