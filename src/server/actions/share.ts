"use server";

import { randomBytes } from "node:crypto";

import { and, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { db } from "@/db";
import { auditRevisions, audits, shareLinks } from "@/db/schema";
import { logActivity } from "@/lib/activity";
import { requirePermission } from "@/lib/auth/guards";

/**
 * Secure share links (PRD §24, §29 P1).
 *
 * A share link hands a *public, unauthenticated* reader a fixed revision of one audit. That
 * makes every decision here a security decision:
 *
 *  - The token is 32 bytes from the CSPRNG. `Math.random()` is seeded, predictable and
 *    would make the whole feature theatre.
 *  - The scope is stored on the row, not passed at read time. `/share/[token]` reads what
 *    the creator chose; a query parameter can never widen it.
 *  - Every action re-establishes authorisation itself. Server Functions are reachable by a
 *    direct POST, and drizzle bypasses RLS, so the guard below is the only boundary — and
 *    each query still carries its own `workspaceId` predicate.
 *
 * Creating and revoking are both logged: a reviewer must be able to answer "who exposed
 * this audit, when, with what scope, and when did it stop working".
 */

export type ShareScope = {
  includeEvidence: boolean;
  includeInternalNotes: boolean;
};

export type ShareLinkRow = {
  id: string;
  token: string;
  scope: ShareScope;
  revisionId: string | null;
  revisionNumber: number | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  lastAccessedAt: Date | null;
  createdAt: Date;
};

/** Anything stored before a field existed reads as "off": the safe direction. */
function normaliseScope(scope: {
  includeEvidence?: boolean;
  includeInternalNotes?: boolean;
}): ShareScope {
  return {
    includeEvidence: scope.includeEvidence === true,
    includeInternalNotes: scope.includeInternalNotes === true,
  };
}

/**
 * Loads an audit by id and proves the caller may share it. The audit's own `workspaceId` is
 * what gets guarded — never a workspace id supplied by the request.
 */
async function loadShareableAudit(auditId: string) {
  const [audit] = await db
    .select({
      id: audits.id,
      workspaceId: audits.workspaceId,
      name: audits.name,
      currentRevisionId: audits.currentRevisionId,
    })
    .from(audits)
    .where(eq(audits.id, auditId))
    .limit(1);
  if (!audit) throw new Error("Audit not found");

  const { user } = await requirePermission(audit.workspaceId, "audits.share");
  return { audit, user };
}

const createSchema = z.object({
  auditId: z.string().uuid(),
  workspaceSlug: z.string().min(1),
  /** Null pins the link to the audit's current revision at creation time. */
  revisionId: z.string().uuid().nullable(),
  /** Capped at a year: a link that never expires is a leak waiting to be found. */
  expiresInDays: z.coerce.number().int().min(1).max(365),
  includeEvidence: z.boolean(),
  includeInternalNotes: z.boolean(),
});

export type CreateShareLinkState = { error?: string; token?: string };

export async function createShareLink(
  _prev: CreateShareLinkState,
  formData: FormData,
): Promise<CreateShareLinkState> {
  const parsed = createSchema.safeParse({
    auditId: String(formData.get("auditId") ?? ""),
    workspaceSlug: String(formData.get("workspaceSlug") ?? ""),
    revisionId: (formData.get("revisionId") as string) || null,
    expiresInDays: String(formData.get("expiresInDays") ?? "7"),
    includeEvidence: formData.get("includeEvidence") === "on",
    includeInternalNotes: formData.get("includeInternalNotes") === "on",
  });

  if (!parsed.success) {
    return { error: "That share request was not valid. Check the expiry and try again." };
  }

  let audit: Awaited<ReturnType<typeof loadShareableAudit>>["audit"];
  let user: Awaited<ReturnType<typeof loadShareableAudit>>["user"];
  try {
    ({ audit, user } = await loadShareableAudit(parsed.data.auditId));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "You cannot share this audit." };
  }

  const revisionId = parsed.data.revisionId ?? audit.currentRevisionId;
  if (!revisionId) {
    return {
      error:
        "This audit has no published revision yet. Run it first — a share link always points at a fixed revision.",
    };
  }

  // The revision must belong to this audit *and* this workspace. Without both predicates a
  // crafted revisionId from another tenant would be accepted: drizzle bypasses RLS.
  const [revision] = await db
    .select({ id: auditRevisions.id, revision: auditRevisions.revision })
    .from(auditRevisions)
    .where(
      and(
        eq(auditRevisions.id, revisionId),
        eq(auditRevisions.auditId, audit.id),
        eq(auditRevisions.workspaceId, audit.workspaceId),
      ),
    )
    .limit(1);
  if (!revision) return { error: "That revision does not belong to this audit." };

  const scope: ShareScope = {
    includeEvidence: parsed.data.includeEvidence,
    includeInternalNotes: parsed.data.includeInternalNotes,
  };
  const expiresAt = new Date(Date.now() + parsed.data.expiresInDays * 24 * 60 * 60 * 1000);
  // 32 CSPRNG bytes → 43 URL-safe characters. Not guessable, and safe in a path segment.
  const token = randomBytes(32).toString("base64url");

  const [row] = await db
    .insert(shareLinks)
    .values({
      workspaceId: audit.workspaceId,
      auditId: audit.id,
      revisionId: revision.id,
      token,
      scope,
      expiresAt,
      createdBy: user.id,
    })
    .returning({ id: shareLinks.id });

  await logActivity({
    workspaceId: audit.workspaceId,
    action: "share_link.created",
    targetType: "share_link",
    targetId: row?.id ?? null,
    auditId: audit.id,
    metadata: {
      revision: revision.revision,
      expiresAt: expiresAt.toISOString(),
      includeEvidence: scope.includeEvidence,
      includeInternalNotes: scope.includeInternalNotes,
    },
  });

  revalidatePath(`/w/${parsed.data.workspaceSlug}/audits/${audit.id}/share`);
  return { token };
}

/** The links for one audit, newest first. Guarded: this list is itself sensitive. */
export async function listShareLinks(auditId: string): Promise<ShareLinkRow[]> {
  const { audit } = await loadShareableAudit(auditId);

  const rows = await db
    .select({
      id: shareLinks.id,
      token: shareLinks.token,
      scope: shareLinks.scope,
      revisionId: shareLinks.revisionId,
      revisionNumber: auditRevisions.revision,
      expiresAt: shareLinks.expiresAt,
      revokedAt: shareLinks.revokedAt,
      lastAccessedAt: shareLinks.lastAccessedAt,
      createdAt: shareLinks.createdAt,
    })
    .from(shareLinks)
    .leftJoin(auditRevisions, eq(auditRevisions.id, shareLinks.revisionId))
    .where(and(eq(shareLinks.auditId, audit.id), eq(shareLinks.workspaceId, audit.workspaceId)))
    .orderBy(desc(shareLinks.createdAt));

  return rows.map((row) => ({
    ...row,
    scope: normaliseScope(row.scope),
  }));
}

const revokeSchema = z.object({
  shareLinkId: z.string().uuid(),
  auditId: z.string().uuid(),
  workspaceSlug: z.string().min(1),
});

export type RevokeShareLinkState = { error?: string; revokedId?: string };

export async function revokeShareLink(
  _prev: RevokeShareLinkState,
  formData: FormData,
): Promise<RevokeShareLinkState> {
  const parsed = revokeSchema.safeParse({
    shareLinkId: String(formData.get("shareLinkId") ?? ""),
    auditId: String(formData.get("auditId") ?? ""),
    workspaceSlug: String(formData.get("workspaceSlug") ?? ""),
  });
  if (!parsed.success) return { error: "That link could not be identified." };

  let audit: Awaited<ReturnType<typeof loadShareableAudit>>["audit"];
  try {
    ({ audit } = await loadShareableAudit(parsed.data.auditId));
  } catch (error) {
    return { error: error instanceof Error ? error.message : "You cannot revoke this link." };
  }

  // Scoped to the audit and the workspace, so a link id from elsewhere matches nothing.
  const [row] = await db
    .update(shareLinks)
    .set({ revokedAt: new Date() })
    .where(
      and(
        eq(shareLinks.id, parsed.data.shareLinkId),
        eq(shareLinks.auditId, audit.id),
        eq(shareLinks.workspaceId, audit.workspaceId),
      ),
    )
    .returning({ id: shareLinks.id, revokedAt: shareLinks.revokedAt });

  if (!row) return { error: "That link no longer exists." };

  await logActivity({
    workspaceId: audit.workspaceId,
    action: "share_link.revoked",
    targetType: "share_link",
    targetId: row.id,
    auditId: audit.id,
    metadata: { revokedAt: row.revokedAt?.toISOString() ?? null },
  });

  revalidatePath(`/w/${parsed.data.workspaceSlug}/audits/${audit.id}/share`);
  return { revokedId: row.id };
}
