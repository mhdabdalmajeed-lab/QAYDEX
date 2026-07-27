import "server-only";

import { and, eq } from "drizzle-orm";
import { cache } from "react";
import { redirect } from "next/navigation";

import { db } from "@/db";
import { workspaceMembers, workspaces } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

/**
 * The authorisation boundary.
 *
 * This is not defence in depth — it IS the enforcement layer. Drizzle connects as the
 * `postgres` role, which has `rolbypassrls = true`, so **row level security never
 * constrains a query made through `@/db`**. The policies in the schema protect the
 * browser/PostgREST path only. Every server-side read or write must therefore establish
 * membership here and carry its own tenant predicate.
 *
 * Server Functions are reachable by direct POST, not only through our UI, so each one
 * calls a guard itself rather than trusting the page that rendered the form.
 */

export type MemberRole =
  | "owner"
  | "admin"
  | "finance_manager"
  | "internal_auditor"
  | "auditor"
  | "reviewer"
  | "approver"
  | "contributor"
  | "read_only"
  | "client_user";

export type SessionUser = {
  id: string;
  email: string;
};

export type Membership = {
  workspaceId: string;
  userId: string;
  role: MemberRole;
};

/**
 * Deduped per request: a page and its server components typically ask for the user
 * several times, and each call is a network round-trip to Supabase.
 */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  // getUser() revalidates the token with Supabase; getSession() only decodes the cookie
  // and is therefore not safe to authorise against on the server.
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return { id: user.id, email: user.email ?? "" };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getUser();
  if (!user) redirect("/sign-in");
  return user;
}

export const listWorkspaces = cache(async (userId: string) => {
  return db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      type: workspaces.type,
      role: workspaceMembers.role,
      baseCurrency: workspaces.baseCurrency,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(workspaces.name);
});

export const getMembership = cache(
  async (workspaceId: string, userId: string): Promise<Membership | null> => {
    const [row] = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)),
      )
      .limit(1);
    if (!row) return null;
    return { workspaceId, userId, role: row.role };
  },
);

export class AccessDenied extends Error {
  constructor(message = "You do not have access to this workspace.") {
    super(message);
    this.name = "AccessDenied";
  }
}

/** Signed out, as opposed to signed in without rights. Route handlers answer 401 vs 403. */
export class Unauthenticated extends AccessDenied {
  constructor(message = "You are not signed in.") {
    super(message);
    this.name = "Unauthenticated";
  }
}

/** Establishes that the caller is a member of the workspace, or stops the request. */
export async function requireMember(workspaceId: string): Promise<{
  user: SessionUser;
  membership: Membership;
}> {
  const user = await requireUser();
  const membership = await getMembership(workspaceId, user.id);
  if (!membership) throw new AccessDenied();
  return { user, membership };
}

export const PERMISSIONS = [
  "workspace.manage",
  "members.manage",
  "clients.manage",
  "audits.view",
  "audits.create",
  "audits.run",
  "audits.edit",
  "audits.review",
  "audits.approve",
  "audits.delete",
  "audits.export",
  "audits.share",
  "findings.assign",
  "findings.respond",
  "comments.create",
  "integrations.manage",
  "chat.use",
  "activity.view",
  "models.approve",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

/**
 * PRD §21.1's ten roles, mapped to what each can actually do. `read_only` and
 * `client_user` are deliberately incapable of mutating anything; `client_user` is
 * additionally scoped to its own client's audits by `assertClientAccess`.
 */
const ROLE_PERMISSIONS: Record<MemberRole, Permission[]> = {
  owner: [...PERMISSIONS],
  admin: [...PERMISSIONS],
  finance_manager: [
    "audits.view",
    "audits.create",
    "audits.run",
    "audits.edit",
    "audits.review",
    "audits.export",
    "audits.share",
    "findings.assign",
    "findings.respond",
    "comments.create",
      "chat.use",
    "clients.manage",
  ],
  internal_auditor: [
    "audits.view",
    "audits.create",
    "audits.run",
    "audits.edit",
    "audits.review",
    "audits.export",
    "findings.assign",
    "comments.create",
      "chat.use",
  ],
  auditor: [
    "audits.view",
    "audits.create",
    "audits.run",
    "audits.edit",
    "audits.export",
    "comments.create",
    "chat.use",
  ],
  reviewer: [
    "audits.view",
    "audits.review",
    "audits.export",
    "findings.assign",
    "comments.create",
    "chat.use",
  ],
  approver: [
    "audits.view",
    "audits.review",
    "audits.approve",
    "audits.export",
    "comments.create",
    "chat.use",
  ],
  contributor: ["audits.view", "audits.create", "audits.edit", "comments.create", "chat.use"],
  read_only: ["audits.view"],
  client_user: ["audits.view", "findings.respond", "comments.create"],
};

export function roleHas(role: MemberRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export async function requirePermission(
  workspaceId: string,
  permission: Permission,
): Promise<{ user: SessionUser; membership: Membership }> {
  const { user, membership } = await requireMember(workspaceId);
  if (!roleHas(membership.role, permission)) {
    throw new AccessDenied(
      `Your role (${membership.role.replace(/_/g, " ")}) cannot ${permission.replace(".", " ")}.`,
    );
  }
  return { user, membership };
}

/**
 * The Route Handler counterpart of `requirePermission`.
 *
 * `requireUser` answers a signed-out visitor with `redirect("/sign-in")`, which is right for a
 * page and wrong for an API: the fetch follows the 307 and the caller receives the sign-in
 * page's HTML with a 200, so a JSON client sees "success" and a body it cannot parse. This
 * throws instead, and lets the handler answer 401/403 honestly.
 */
export async function requirePermissionApi(
  workspaceId: string,
  permission: Permission,
): Promise<{ user: SessionUser; membership: Membership }> {
  const user = await getUser();
  if (!user) throw new Unauthenticated();

  const membership = await getMembership(workspaceId, user.id);
  if (!membership) throw new AccessDenied();

  if (!roleHas(membership.role, permission)) {
    throw new AccessDenied(
      `Your role (${membership.role.replace(/_/g, " ")}) cannot ${permission.replace(".", " ")}.`,
    );
  }
  return { user, membership };
}

/**
 * Running an audit spends money and sends data to an external model, so it is gated twice:
 * by role, and by the workspace's own AI data controls (PRD §25.2).
 */
export async function requireCanRunAudit(workspaceId: string) {
  const { user, membership } = await requirePermission(workspaceId, "audits.run");

  const [workspace] = await db
    .select({ settings: workspaces.settings })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);

  const ai = workspace?.settings?.ai;
  if (ai?.allowExternalModels === false) {
    throw new AccessDenied(
      "This workspace has disabled sending data to external model providers. An administrator " +
        "can change this in Settings › AI data controls.",
    );
  }

  const allowedRoles = ai?.rolesAllowedToRunAudits;
  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(membership.role)) {
    throw new AccessDenied(
      "This workspace restricts who may run audits. An administrator can change this in " +
        "Settings › AI data controls.",
    );
  }

  return { user, membership, settings: workspace?.settings ?? {} };
}
