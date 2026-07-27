import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";

import { AppSidebar } from "@/components/layout/app-sidebar";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { db } from "@/db";
import { workspaces } from "@/db/schema";
import { AccessDenied, listWorkspaces, requireMember, requireUser } from "@/lib/auth/guards";

/**
 * Auth-gated and per-request: the shell reads the session cookie and the caller's
 * memberships, neither of which may be cached across users.
 */
export const dynamic = "force-dynamic";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const user = await requireUser();

  const [workspace] = await db
    .select({ id: workspaces.id, name: workspaces.name, slug: workspaces.slug })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);

  if (!workspace) notFound();

  // Drizzle bypasses RLS, so membership is asserted here rather than by the database.
  // A non-member is answered with 404 rather than 403: whether a given slug exists is
  // itself information we do not owe them.
  try {
    await requireMember(workspace.id);
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }

  const memberships = await listWorkspaces(user.id);
  const cookieStore = await cookies();
  const defaultOpen = cookieStore.get("sidebar_state")?.value !== "false";

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <AppSidebar
        slug={workspace.slug}
        user={user}
        workspaces={memberships.map((membership) => ({
          id: membership.id,
          name: membership.name,
          slug: membership.slug,
          type: membership.type,
        }))}
      />
      {/*
        No bar of its own above the page: the sidebar toggle lives in `PageHeader`, next to
        the page title, so the shell contributes one row of chrome instead of two. The
        workspace name is already the first thing in the sidebar and does not need repeating.
      */}
      <SidebarInset>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
