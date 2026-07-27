import { redirect } from "next/navigation";

import { getUser, listWorkspaces } from "@/lib/auth/guards";

/**
 * The root is a router, not a page: it decides where a visitor belongs and sends
 * them there. It reads the session on every request, so it can never be cached.
 */
export const dynamic = "force-dynamic";

export default async function RootPage() {
  const user = await getUser();
  if (!user) redirect("/sign-in");

  const workspaces = await listWorkspaces(user.id);
  if (workspaces.length === 0) redirect("/onboarding");

  redirect(`/w/${workspaces[0].slug}`);
}
