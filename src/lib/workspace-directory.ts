import "server-only";

import { eq } from "drizzle-orm";
import { cache } from "react";
import { authUsers } from "drizzle-orm/supabase";

import { db } from "@/db";
import { workspaceMembers } from "@/db/schema";
import type { MemberRole } from "@/lib/auth/guards";

/**
 * Who is in a workspace, with the one piece of identity Supabase actually stores for us.
 *
 * `auth.users` is deliberately not re-exported from `@/db/schema` (drizzle-kit would try
 * to own the table), so it is imported straight from `drizzle-orm/supabase` here. This is
 * the only place that reads it, which keeps "how do we resolve a user id to a name?" a
 * single answerable question.
 *
 * The caller must already have established membership — this helper carries a workspace
 * predicate but performs no authorisation of its own.
 */
export type DirectoryEntry = {
  memberId: string;
  userId: string;
  email: string;
  role: MemberRole;
  title: string | null;
  createdAt: Date;
};

export const listMembers = cache(async (workspaceId: string): Promise<DirectoryEntry[]> => {
  const rows = await db
    .select({
      memberId: workspaceMembers.id,
      userId: workspaceMembers.userId,
      email: authUsers.email,
      role: workspaceMembers.role,
      title: workspaceMembers.title,
      createdAt: workspaceMembers.createdAt,
    })
    .from(workspaceMembers)
    .leftJoin(authUsers, eq(authUsers.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(workspaceMembers.createdAt);

  return rows.map((row) => ({
    memberId: row.memberId,
    userId: row.userId,
    // A user row with no email would be a Supabase-side anomaly, not something to crash on.
    email: row.email ?? "Unknown user",
    role: row.role,
    title: row.title,
    createdAt: row.createdAt,
  }));
});

/** `userId → email`, for rendering creator/reviewer columns without an N+1. */
export async function memberEmailMap(workspaceId: string): Promise<Map<string, string>> {
  const members = await listMembers(workspaceId);
  return new Map(members.map((m) => [m.userId, m.email]));
}

/** The part of an email a dense table can afford to show. */
export function displayName(email: string): string {
  const at = email.indexOf("@");
  return at > 0 ? email.slice(0, at) : email;
}
