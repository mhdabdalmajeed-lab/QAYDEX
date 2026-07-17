import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { RiArrowLeftLine, RiArchive2Line, RiPushpinFill, RiSearchEyeLine } from "@remixicon/react";

import { ChatView, type ChatAudit, type ChatMessage } from "@/components/chat/chat-view";
import { ConversationActions } from "@/components/chat/conversation-actions";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { audits, conversationAudits, conversations, messages, workspaces } from "@/db/schema";
import { auditBlockSchema, type AuditBlock } from "@/lib/ai/blocks/schemas";
import { AccessDenied, requireMember, roleHas } from "@/lib/auth/guards";

/**
 * The conversation (PRD §10.4).
 *
 * The transcript is loaded on the server and handed to <ChatView> already typed: blocks the
 * model generated in chat go through the same schema as an audit's own blocks, so a table
 * here and the same table in the report cannot drift apart (PRD §18).
 *
 * Every query carries its own workspace predicate — drizzle bypasses RLS, and the slug in the
 * URL is not proof of anything on its own.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Conversation" };

/**
 * `messages.blocks` stores each block exactly as `output_blocks` does: the whole block lives
 * in `content`. Re-validating here rather than trusting the column is deliberate — the block
 * schema is versioned, and a message written by an older one must not crash the transcript.
 */
function toBlocks(
  raw: { type: string; title?: string; content: Record<string, unknown> }[],
  messageId: string,
): AuditBlock[] {
  const blocks: AuditBlock[] = [];
  for (const row of raw) {
    const parsed = auditBlockSchema.safeParse(row.content);
    if (parsed.success) {
      blocks.push(parsed.data);
    } else {
      // Not rendered, but not swallowed either: the prose of the answer still stands.
      console.warn(`[chat] message ${messageId}: block "${row.type}" failed to parse`);
    }
  }
  return blocks;
}

export default async function ConversationPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; id: string }>;
  /**
   * `q` is handed over by `chat/new?q=…`; <ChatView> asks it once, then drops it.
   *
   * Typed as it really resolves: a repeated `?q=a&q=b` arrives as an array, so the narrow
   * `string` annotation would be a lie that crashes on `.trim()`.
   */
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { slug, id } = await params;
  const { q } = await searchParams;
  const question = typeof q === "string" ? q : "";

  const [workspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  if (!workspace) notFound();

  // The layout guards too, but a page is its own request and re-establishes access itself.
  let canChat = false;
  try {
    const { membership } = await requireMember(workspace.id);
    canChat = roleHas(membership.role, "chat.use");
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }

  const workspaceId = workspace.id;

  const [conversation] = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      pinned: conversations.pinned,
      archived: conversations.archived,
    })
    .from(conversations)
    .where(and(eq(conversations.id, id), eq(conversations.workspaceId, workspaceId)))
    .limit(1);
  // A conversation in another workspace is indistinguishable from one that does not exist.
  if (!conversation) notFound();

  const [rows, grounding] = await Promise.all([
    db
      .select({
        id: messages.id,
        role: messages.role,
        content: messages.content,
        blocks: messages.blocks,
        citations: messages.citations,
        attachments: messages.attachments,
        suggestedFollowups: messages.suggestedFollowups,
        status: messages.status,
        error: messages.error,
        createdAt: messages.createdAt,
      })
      .from(messages)
      .where(
        and(eq(messages.conversationId, conversation.id), eq(messages.workspaceId, workspaceId)),
      )
      .orderBy(asc(messages.createdAt)),
    db
      .select({
        id: audits.id,
        name: audits.name,
        currentRevisionId: audits.currentRevisionId,
      })
      .from(conversationAudits)
      .innerJoin(
        audits,
        and(eq(audits.id, conversationAudits.auditId), eq(audits.workspaceId, workspaceId)),
      )
      .where(
        and(
          eq(conversationAudits.conversationId, conversation.id),
          eq(conversationAudits.workspaceId, workspaceId),
        ),
      )
      .orderBy(asc(conversationAudits.createdAt)),
  ]);

  const attached: ChatAudit[] = grounding.map((audit) => ({
    id: audit.id,
    name: audit.name,
    // An audit with no revision has inputs but no findings, blocks or evidence to discuss.
    hasResults: audit.currentRevisionId !== null,
  }));

  const transcript: ChatMessage[] = rows.map((row) => ({
    id: row.id,
    role: row.role,
    content: row.content,
    blocks: toBlocks(row.blocks, row.id),
    citations: row.citations,
    attachments: row.attachments,
    suggestedFollowups: row.suggestedFollowups,
    status: row.status,
    error: row.error,
    createdAt: row.createdAt.toISOString(),
  }));

  // A reader without `chat.use` is handed no question to auto-send: the send would be refused
  // by /api/chat anyway, and an error on open is a worse answer than a quiet transcript.
  const autoSend = canChat ? question.trim().slice(0, 20_000) || undefined : undefined;

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "AI Chat", href: `/w/${slug}/chat` },
          { label: conversation.title },
        ]}
        title={conversation.title}
        description={
          attached.length === 0 ? (
            "No audit attached. The model has no evidence to read and will not cite figures from your data."
          ) : (
            <span className="flex flex-wrap items-center gap-1.5">
              <span>Grounded in</span>
              {attached.map((audit) => (
                <Badge key={audit.id} variant="outline" className="font-normal">
                  <RiSearchEyeLine aria-hidden="true" />
                  <Link
                    href={`/w/${slug}/audits/${audit.id}`}
                    className="rounded-sm focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    {audit.name}
                  </Link>
                </Badge>
              ))}
            </span>
          )
        }
        actions={
          <>
            {conversation.pinned ? (
              <Badge variant="secondary" className="font-normal">
                <RiPushpinFill aria-hidden="true" />
                Pinned
              </Badge>
            ) : null}
            {conversation.archived ? (
              <Badge variant="secondary" className="font-normal">
                <RiArchive2Line aria-hidden="true" />
                Archived
              </Badge>
            ) : null}
            <Button variant="outline" size="sm" render={<Link href={`/w/${slug}/chat`} />}>
              <RiArrowLeftLine aria-hidden="true" />
              All conversations
            </Button>
            {canChat ? (
              <ConversationActions
                conversationId={conversation.id}
                workspaceSlug={slug}
                title={conversation.title}
                pinned={conversation.pinned}
                archived={conversation.archived}
              />
            ) : null}
          </>
        }
      />

      <ChatView
        slug={slug}
        conversationId={conversation.id}
        messages={transcript}
        audits={attached}
        canChat={canChat}
        autoSend={autoSend}
      />
    </>
  );
}
