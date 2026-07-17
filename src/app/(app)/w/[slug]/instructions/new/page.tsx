import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { asc, eq, isNull, or } from "drizzle-orm";
import { RiErrorWarningLine } from "@remixicon/react";

import { AuthorityHierarchy } from "@/components/instructions/authority-hierarchy";
import { InstructionForm } from "@/components/instructions/instruction-form";
import { isInstructionCategory } from "@/components/instructions/labels";
import { PageHeader } from "@/components/layout/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { db } from "@/db";
import { clients, entities, templates, workspaces } from "@/db/schema";
import { firstParam } from "@/lib/audit-filters";
import { AccessDenied, requireMember, roleHas } from "@/lib/auth/guards";

/**
 * Write a new instruction (PRD §9.2).
 *
 * Nothing here is versioned yet — a new instruction is always v1 — so the page's job is
 * narrower than the detail page's: collect the fields, and say up front what the two
 * choices that outlive the form (category and mandatory) actually decide, which is where
 * the instruction lands in the §9.3 hierarchy.
 *
 * Drizzle bypasses RLS, so every query below carries `workspace_id` itself.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "New instruction" };

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function NewInstructionPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;

  const [workspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  if (!workspace) notFound();

  let role;
  let userEmail;
  try {
    const { membership, user } = await requireMember(workspace.id);
    role = membership.role;
    userEmail = user.email;
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }

  const breadcrumb = [
    { label: "Instructions", href: `/w/${slug}/instructions` },
    { label: "New instruction" },
  ];

  if (!roleHas(role, "instructions.manage")) {
    return (
      <>
        <PageHeader title="New instruction" breadcrumb={breadcrumb} />
        <main className="flex-1 px-4 py-5 md:px-6">
          <Alert variant="destructive">
            <RiErrorWarningLine aria-hidden="true" />
            <AlertTitle>You cannot create instructions in this workspace</AlertTitle>
            <AlertDescription>
              <p>
                Your role ({role.replace(/_/g, " ")}) can read the instructions library but not
                add to it. An owner or admin can change this in Settings › Members and roles.
              </p>
              <Button
                render={<Link href={`/w/${slug}/instructions`} />}
                variant="outline"
                size="sm"
                className="mt-3"
              >
                Back to the library
              </Button>
            </AlertDescription>
          </Alert>
        </main>
      </>
    );
  }

  const workspaceId = workspace.id;

  // The nav links here with `?category=`, so honour it as a prefill rather than making the
  // user re-pick what they just clicked.
  const requested = firstParam(query.category);
  const category = requested && isInstructionCategory(requested) ? requested : "organization";

  const [entityRows, clientRows, templateRows] = await Promise.all([
    db
      .select({ id: entities.id, legalName: entities.legalName })
      .from(entities)
      .where(eq(entities.workspaceId, workspaceId))
      .orderBy(asc(entities.legalName)),

    db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(eq(clients.workspaceId, workspaceId))
      .orderBy(asc(clients.name)),

    // Templates are the one library with a global tier: `workspace_id IS NULL` is the
    // system set that ships with the product, and an audit can be started from it, so an
    // instruction must be able to name it.
    db
      .select({ id: templates.id, name: templates.name })
      .from(templates)
      .where(or(eq(templates.workspaceId, workspaceId), isNull(templates.workspaceId)))
      .orderBy(asc(templates.name)),
  ]);

  return (
    <>
      <PageHeader
        title="New instruction"
        description="A rule the model must follow. It is saved as version 1, and every audit that later uses it records the version it ran under."
        breadcrumb={breadcrumb}
      />

      <main className="flex-1 px-4 py-5 md:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          <InstructionForm
            workspaceSlug={slug}
            values={{
              name: "",
              description: "",
              text: "",
              category,
              visibility: "workspace",
              priority: 100,
              mandatory: false,
              status: "active",
              clientId: null,
              applicableModules: [],
              applicableEntityIds: [],
              applicableTemplateIds: [],
              effectiveDate: "",
              expirationDate: "",
            }}
            entities={entityRows}
            clients={clientRows}
            templates={templateRows}
            tags={[]}
            ownerLabel={`${userEmail} (you)`}
          />

          <AuthorityHierarchy />
        </div>
      </main>
    </>
  );
}
