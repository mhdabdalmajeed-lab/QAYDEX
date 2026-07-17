import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, count, desc, eq, exists, ilike, inArray, or, sql } from "drizzle-orm";
import {
  RiAddLine,
  RiArchive2Line,
  RiChat3Line,
  RiPushpinFill,
  RiSearchEyeLine,
} from "@remixicon/react";

import { ConversationActions } from "@/components/chat/conversation-actions";
import { ConversationSearch } from "@/components/chat/conversation-search";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { db } from "@/db";
import { audits, conversationAudits, conversations, messages, workspaces } from "@/db/schema";
import { AccessDenied, requireMember, roleHas } from "@/lib/auth/guards";

/**
 * The conversation list (PRD §10.4).
 *
 * Filtering lives here rather than in the sidebar — all · audit-linked · pinned · archived.
 * The `?filter=` values are still honoured, so existing links keep working.
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "AI Chat" };

const FILTERS = ["all", "audit_linked", "pinned", "archived"] as const;
type Filter = (typeof FILTERS)[number];

const FILTER_LABEL: Record<Filter, string> = {
  all: "All conversations",
  audit_linked: "Audit-linked",
  pinned: "Pinned",
  archived: "Archived",
};

function toFilter(value: string | undefined): Filter {
  return FILTERS.find((filter) => filter === value) ?? "all";
}

const MAX_CONVERSATIONS = 100;

function formatWhen(value: Date): string {
  const now = Date.now();
  const diff = now - value.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(value);
}

export default async function ChatListPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ q?: string; filter?: string }>;
}) {
  const { slug } = await params;
  const { q, filter: rawFilter } = await searchParams;
  const filter = toFilter(rawFilter);
  const query = (q ?? "").trim();

  const [workspace] = await db
    .select({ id: workspaces.id, name: workspaces.name })
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

  const linkedToAnAudit = exists(
    db
      .select({ one: sql`1` })
      .from(conversationAudits)
      .where(
        and(
          eq(conversationAudits.conversationId, conversations.id),
          eq(conversationAudits.workspaceId, workspaceId),
        ),
      ),
  );

  const scopeCondition =
    filter === "archived"
      ? eq(conversations.archived, true)
      : filter === "pinned"
        ? and(eq(conversations.archived, false), eq(conversations.pinned, true))
        : filter === "audit_linked"
          ? and(eq(conversations.archived, false), linkedToAnAudit)
          : eq(conversations.archived, false);

  // Search covers message bodies as well as titles: what you remember about a conversation is
  // usually something that was said in it, not what it ended up being called.
  const searchCondition = query
    ? or(
        ilike(conversations.title, `%${query}%`),
        exists(
          db
            .select({ one: sql`1` })
            .from(messages)
            .where(
              and(
                eq(messages.conversationId, conversations.id),
                eq(messages.workspaceId, workspaceId),
                ilike(messages.content, `%${query}%`),
              ),
            ),
        ),
      )
    : undefined;

  const rows = await db
    .select({
      id: conversations.id,
      title: conversations.title,
      pinned: conversations.pinned,
      archived: conversations.archived,
      updatedAt: conversations.updatedAt,
    })
    .from(conversations)
    .where(and(eq(conversations.workspaceId, workspaceId), scopeCondition, searchCondition))
    .orderBy(desc(conversations.pinned), desc(conversations.updatedAt))
    .limit(MAX_CONVERSATIONS);

  const ids = rows.map((row) => row.id);

  const [links, counts] = await Promise.all([
    ids.length > 0
      ? db
          .select({
            conversationId: conversationAudits.conversationId,
            auditId: audits.id,
            auditName: audits.name,
            domain: audits.domain,
          })
          .from(conversationAudits)
          .innerJoin(audits, eq(audits.id, conversationAudits.auditId))
          .where(
            and(
              inArray(conversationAudits.conversationId, ids),
              eq(conversationAudits.workspaceId, workspaceId),
            ),
          )
      : Promise.resolve([]),
    ids.length > 0
      ? db
          .select({ conversationId: messages.conversationId, total: count() })
          .from(messages)
          .where(
            and(inArray(messages.conversationId, ids), eq(messages.workspaceId, workspaceId)),
          )
          .groupBy(messages.conversationId)
      : Promise.resolve([]),
  ]);

  const auditsByConversation = new Map<string, { id: string; name: string }[]>();
  for (const link of links) {
    const list = auditsByConversation.get(link.conversationId) ?? [];
    list.push({ id: link.auditId, name: link.auditName });
    auditsByConversation.set(link.conversationId, list);
  }

  const messageCount = new Map(counts.map((row) => [row.conversationId, row.total]));

  return (
    <>
      <PageHeader
        title="AI Chat"
        description="Conversations grounded in your audits. Every answer is computed from the evidence attached to the audit it cites."
        actions={
          canChat ? (
            <Button render={<Link href={`/w/${slug}/chat/new`} />}>
              <RiAddLine aria-hidden="true" />
              New chat
            </Button>
          ) : null
        }
      />

      <main className="flex-1 px-4 py-5 md:px-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <ConversationSearch initialQuery={query} />

          <nav aria-label="Filter conversations" className="flex flex-wrap items-center gap-1">
            {FILTERS.map((option) => {
              const href =
                option === "all"
                  ? `/w/${slug}/chat${query ? `?q=${encodeURIComponent(query)}` : ""}`
                  : `/w/${slug}/chat?filter=${option}${query ? `&q=${encodeURIComponent(query)}` : ""}`;
              const active = option === filter;
              return (
                <Button
                  key={option}
                  variant={active ? "secondary" : "ghost"}
                  size="sm"
                  aria-current={active ? "page" : undefined}
                  render={<Link href={href} />}
                >
                  {FILTER_LABEL[option]}
                </Button>
              );
            })}
          </nav>
        </div>

        {rows.length === 0 ? (
          <EmptyState
            slug={slug}
            filter={filter}
            query={query}
            canChat={canChat}
            workspaceName={workspace.name}
          />
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border bg-card">
            {rows.map((conversation) => {
              const linked = auditsByConversation.get(conversation.id) ?? [];
              const total = messageCount.get(conversation.id) ?? 0;
              return (
                <li
                  key={conversation.id}
                  className="flex items-center gap-2 px-3 py-2.5 transition-colors hover:bg-accent/50"
                >
                  <Link
                    href={`/w/${slug}/chat/${conversation.id}`}
                    className="flex min-w-0 flex-1 flex-col gap-1 rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span className="flex min-w-0 items-center gap-1.5">
                      {conversation.pinned ? (
                        <>
                          <RiPushpinFill
                            aria-hidden="true"
                            className="size-3.5 shrink-0 text-muted-foreground"
                          />
                          <span className="sr-only">Pinned.</span>
                        </>
                      ) : null}
                      {conversation.archived ? (
                        <>
                          <RiArchive2Line
                            aria-hidden="true"
                            className="size-3.5 shrink-0 text-muted-foreground"
                          />
                          <span className="sr-only">Archived.</span>
                        </>
                      ) : null}
                      <span className="truncate text-sm font-medium">{conversation.title}</span>
                    </span>

                    <span className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      <span>
                        {total} message{total === 1 ? "" : "s"}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{formatWhen(conversation.updatedAt)}</span>
                      {linked.length > 0 ? (
                        <>
                          <span aria-hidden="true">·</span>
                          {linked.slice(0, 3).map((audit) => (
                            <Badge key={audit.id} variant="outline" className="font-normal">
                              <RiSearchEyeLine aria-hidden="true" />
                              {audit.name}
                            </Badge>
                          ))}
                          {linked.length > 3 ? (
                            <span>+{linked.length - 3} more</span>
                          ) : null}
                        </>
                      ) : (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>No audit attached</span>
                        </>
                      )}
                    </span>
                  </Link>

                  {canChat ? (
                    <ConversationActions
                      conversationId={conversation.id}
                      workspaceSlug={slug}
                      title={conversation.title}
                      pinned={conversation.pinned}
                      archived={conversation.archived}
                    />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </>
  );
}

function EmptyState({
  slug,
  filter,
  query,
  canChat,
  workspaceName,
}: {
  slug: string;
  filter: Filter;
  query: string;
  canChat: boolean;
  workspaceName: string;
}) {
  if (query) {
    return (
      <Empty className="border border-dashed border-border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RiChat3Line aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>No conversations match “{query}”</EmptyTitle>
          <EmptyDescription>
            Search covers conversation titles and the messages inside them
            {filter === "all" ? "" : `, within ${FILTER_LABEL[filter].toLowerCase()}`}.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button variant="outline" render={<Link href={`/w/${slug}/chat`} />}>
            Clear search
          </Button>
        </EmptyContent>
      </Empty>
    );
  }

  const copy: Record<Filter, { title: string; description: string }> = {
    all: {
      title: "No conversations yet",
      description:
        `Chat is how you interrogate an audit after it runs: challenge a finding, ask for the ` +
        `evidence behind a number, compare two periods. Answers are computed from the audit's ` +
        `own inputs at the moment you ask — nothing in ${workspaceName} is recalled from memory.`,
    },
    audit_linked: {
      title: "No audit-linked conversations",
      description:
        "A conversation becomes audit-linked when you attach an audit to it. That is what gives " +
        "the model something to read: without an attachment it has no evidence and cannot cite.",
    },
    pinned: {
      title: "Nothing pinned",
      description:
        "Pin a conversation to keep it at the top of this list — useful for the thread you are " +
        "working through this week.",
    },
    archived: {
      title: "Nothing archived",
      description:
        "Archiving takes a conversation out of the main list without deleting it. Everything said " +
        "in it stays readable.",
    },
  };

  return (
    <Empty className="border border-dashed border-border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <RiChat3Line aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{copy[filter].title}</EmptyTitle>
        <EmptyDescription>{copy[filter].description}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        {canChat ? (
          <Button render={<Link href={`/w/${slug}/chat/new`} />}>
            <RiAddLine aria-hidden="true" />
            Start a conversation
          </Button>
        ) : (
          <p className="text-sm text-muted-foreground">
            Your role cannot use chat. An administrator can change this in Settings › Members
            and roles.
          </p>
        )}
        {filter !== "all" ? (
          <Button variant="outline" render={<Link href={`/w/${slug}/chat`} />}>
            See all conversations
          </Button>
        ) : null}
      </EmptyContent>
    </Empty>
  );
}
