import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db";
import { audits, workspaces } from "@/db/schema";
import { AccessDenied, requirePermission } from "@/lib/auth/guards";
import { createConversation } from "@/server/actions/chat";

/**
 * New chat (PRD §10.4).
 *
 * This route has no UI: it creates the conversation and hands over to it. The reason is the
 * floating chat on an audit page, which links here as `?audit=<id>&q=<question>` — a user who
 * asks a question about a finding should land in a thread with that question already asked,
 * not on a form that makes them type it a second time.
 *
 * The question is passed on in the URL rather than written to the transcript here: /api/chat
 * records the user's turn when it answers it, so seeding a message would duplicate it, and a
 * question stored with no answer coming is worse than no question at all.
 *
 * It is a render, not a Server Function, so prefetching is the hazard: `chat/loading.tsx` is
 * the nearest Suspense boundary above this segment, which is what stops an automatic prefetch
 * from rendering it (and creating an empty conversation on hover).
 */

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "New chat" };

const uuidSchema = z.string().uuid();

export default async function NewChatPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ audit?: string; q?: string }>;
}) {
  const { slug } = await params;
  const { audit: auditParam, q } = await searchParams;

  const [workspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  if (!workspace) notFound();

  try {
    await requirePermission(workspace.id, "chat.use");
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }

  // An audit id from a URL proves nothing. Resolve it against this workspace before it is
  // allowed to become grounding — an attachment is what decides which evidence the model may
  // read, so a stale or crafted id must fail loudly rather than open a blank conversation.
  const auditIds: string[] = [];
  if (auditParam !== undefined) {
    const parsed = uuidSchema.safeParse(auditParam);
    if (!parsed.success) notFound();

    const [found] = await db
      .select({ id: audits.id })
      .from(audits)
      .where(and(eq(audits.id, parsed.data), eq(audits.workspaceId, workspace.id)))
      .limit(1);
    if (!found) notFound();

    auditIds.push(found.id);
  }

  // `createConversation` re-establishes authorisation and re-filters the audits itself: it is
  // reachable by direct POST, so it cannot lean on the checks above.
  const created = await createConversation({ workspaceSlug: slug, auditIds });

  const question = (q ?? "").trim().slice(0, 20_000);
  const destination = question
    ? `/w/${slug}/chat/${created.id}?q=${encodeURIComponent(question)}`
    : `/w/${slug}/chat/${created.id}`;

  // Outside the try/catch above by construction: redirect() signals by throwing.
  redirect(destination);
}
