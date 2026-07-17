import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, desc, eq, isNull, or } from "drizzle-orm";

import { PageHeader } from "@/components/layout/page-header";
import {
  NewAuditForm,
  type PreviousAuditOption,
  type TemplateOption,
} from "@/components/audit/new-audit-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { RiErrorWarningLine } from "@remixicon/react";
import { db } from "@/db";
import { audits, clients, entities, templateVersions, templates, workspaces } from "@/db/schema";
import { AUDIT_DOMAINS, type AuditDomain } from "@/lib/ai/blocks/types";
import { AccessDenied, requireMember, roleHas } from "@/lib/auth/guards";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "New audit" };

function isDomain(value: string | undefined): value is AuditDomain {
  return value !== undefined && (AUDIT_DOMAINS as readonly string[]).includes(value);
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function NewAuditPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { slug } = await params;
  const query = await searchParams;

  const [workspace] = await db
    .select({ id: workspaces.id, name: workspaces.name, type: workspaces.type })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);

  if (!workspace) notFound();

  // Every page is its own request and re-establishes access itself; drizzle bypasses RLS, so
  // the guard here is the boundary, not a nicety.
  let role;
  try {
    const { membership } = await requireMember(workspace.id);
    role = membership.role;
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }

  if (!roleHas(role, "audits.create")) {
    return (
      <>
        <PageHeader
          title="New audit"
          breadcrumb={[
            { label: "Audits", href: `/w/${slug}/audits` },
            { label: "New audit" },
          ]}
        />
        <main className="flex-1 px-4 py-5 md:px-6">
          <Alert variant="destructive">
            <RiErrorWarningLine aria-hidden="true" />
            <AlertTitle>You cannot create audits in this workspace</AlertTitle>
            <AlertDescription>
              Your role ({role.replace(/_/g, " ")}) can view audits but not start one. An owner or
              admin can change this in Settings › Members and roles.
            </AlertDescription>
          </Alert>
        </main>
      </>
    );
  }

  const templateSlug = first(query.template) ?? null;
  const domainParam = first(query.domain);
  const fromAuditId = first(query.from) ?? null;

  const [templateRows, previousRows, entityRows, clientRows] = await Promise.all([
    // The system library (workspace_id IS NULL) plus this workspace's own templates. The join
    // pins each row to its current version, which is the content the audit would copy.
    db
      .select({ template: templates, version: templateVersions })
      .from(templates)
      .innerJoin(
        templateVersions,
        and(
          eq(templateVersions.templateId, templates.id),
          eq(templateVersions.version, templates.currentVersion),
        ),
      )
      .where(or(isNull(templates.workspaceId), eq(templates.workspaceId, workspace.id)))
      .orderBy(templates.category, templates.name),

    db
      .select({
        id: audits.id,
        name: audits.name,
        domain: audits.domain,
        status: audits.status,
        periodLabel: audits.periodLabel,
        updatedAt: audits.updatedAt,
        templateName: templates.name,
      })
      .from(audits)
      .leftJoin(templates, eq(templates.id, audits.templateId))
      .where(and(eq(audits.workspaceId, workspace.id), isNull(audits.archivedAt)))
      .orderBy(desc(audits.updatedAt))
      .limit(40),

    db
      .select({ id: entities.id, legalName: entities.legalName })
      .from(entities)
      .where(eq(entities.workspaceId, workspace.id))
      .orderBy(entities.legalName),

    workspace.type === "firm"
      ? db
          .select({ id: clients.id, name: clients.name })
          .from(clients)
          .where(eq(clients.workspaceId, workspace.id))
          .orderBy(clients.name)
      : Promise.resolve([] as { id: string; name: string }[]),
  ]);

  const templateOptions: TemplateOption[] = templateRows.map(({ template, version }) => ({
    slug: template.slug,
    name: template.name,
    category: template.category,
    subcategory: template.subcategory,
    description: template.description,
    isSystem: template.isSystem,
    tags: template.tags ?? [],
    defaultTitle: version.defaultTitle,
    auditDescription: version.auditDescription,
    instructions: version.instructions,
    recommendedInputs: version.recommendedInputs,
    requiredEvidence: version.requiredEvidence,
    suggestedPeriod: version.suggestedPeriod,
    suggestedFollowups: version.suggestedFollowups,
    relevantIntegrations: version.relevantIntegrations ?? [],
  }));

  const dateFormat = new Intl.DateTimeFormat("en", { dateStyle: "medium" });
  const previousOptions: PreviousAuditOption[] = previousRows.map((row) => ({
    id: row.id,
    name: row.name,
    domain: row.domain,
    templateName: row.templateName,
    periodLabel: row.periodLabel,
    status: row.status,
    updatedAt: dateFormat.format(row.updatedAt),
  }));

  const requestedTemplateMissing =
    templateSlug !== null && !templateOptions.some((t) => t.slug === templateSlug);
  const requestedSourceMissing =
    fromAuditId !== null && !previousOptions.some((a) => a.id === fromAuditId);

  return (
    <>
      <PageHeader
        title="New audit"
        description="Start from a template, a blank sheet, or an audit you have already run."
        breadcrumb={[{ label: "Audits", href: `/w/${slug}/audits` }, { label: "New audit" }]}
      />

      <main className="flex-1 px-4 py-5 md:px-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-5">
          {requestedTemplateMissing ? (
            <Alert>
              <RiErrorWarningLine aria-hidden="true" />
              <AlertTitle>That template link is out of date</AlertTitle>
              <AlertDescription>
                No template with the identifier “{templateSlug}” is available here. Pick one from
                the list below.
              </AlertDescription>
            </Alert>
          ) : null}

          {requestedSourceMissing ? (
            <Alert>
              <RiErrorWarningLine aria-hidden="true" />
              <AlertTitle>That audit is not available to copy</AlertTitle>
              <AlertDescription>
                It may have been archived or deleted, or it belongs to another workspace.
              </AlertDescription>
            </Alert>
          ) : null}

          {templateOptions.length === 0 ? (
            <Alert>
              <RiErrorWarningLine aria-hidden="true" />
              <AlertTitle>The template library is empty</AlertTitle>
              <AlertDescription>
                No templates have been seeded for this deployment yet. You can still start a blank
                audit and write the instructions yourself.
              </AlertDescription>
            </Alert>
          ) : null}

          <NewAuditForm
            workspaceSlug={slug}
            templates={templateOptions}
            previousAudits={previousOptions}
            entities={entityRows}
            clients={clientRows}
            initialTemplateSlug={requestedTemplateMissing ? null : templateSlug}
            initialDomain={isDomain(domainParam) ? domainParam : null}
            initialFromAuditId={requestedSourceMissing ? null : fromAuditId}
          />
        </div>
      </main>
    </>
  );
}
