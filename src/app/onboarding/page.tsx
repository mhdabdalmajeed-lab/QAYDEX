import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { RiShieldCheckLine } from "@remixicon/react";

import { CreateWorkspaceForm } from "@/components/onboarding/create-workspace-form";
import { listWorkspaces, requireUser } from "@/lib/auth/guards";

export const metadata: Metadata = {
  title: "Create your workspace",
};

export default async function OnboardingPage() {
  const user = await requireUser();

  // Onboarding is for the first workspace only. Anyone who already belongs to one
  // is sent to it rather than being offered a second setup flow.
  const workspaces = await listWorkspaces(user.id);
  if (workspaces.length > 0) {
    redirect(`/w/${workspaces[0].slug}`);
  }

  return (
    <div className="flex min-h-svh flex-1 flex-col items-center justify-center gap-8 bg-muted/40 px-6 py-12">
      <div className="flex items-center gap-2">
        <RiShieldCheckLine className="size-5 text-primary" aria-hidden="true" />
        <span className="text-base font-semibold tracking-tight">Caydex</span>
      </div>

      <main className="w-full max-w-xl">
        <CreateWorkspaceForm />
      </main>
    </div>
  );
}
