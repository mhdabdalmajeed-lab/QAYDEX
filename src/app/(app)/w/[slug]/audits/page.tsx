import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, eq, isNotNull } from "drizzle-orm";
import { RiAddLine, RiSearchEyeLine } from "@remixicon/react";

import { AuditCard, type AuditCardData } from "@/components/audit/audit-card";
import { LibraryFilters, type FilterField } from "@/components/audit/library-filters";
import { LibraryTabs } from "@/components/audit/library-tabs";
import { PageHeader } from "@/components/layout/page-header";
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
import {
  audits,
  clients,
  entities,
  integrationConnections,
  templates,
  workspaces,
} from "@/db/schema";
import {
  AUDIT_DOMAINS,
  DOMAIN_LABELS,
  FINDING_CATEGORIES,
  LIBRARY_TABS,
  RISK_LABELS,
  RISK_LEVELS,
  firstParam,
} from "@/lib/audit-filters";
import {
  buildAuditConditions,
  countAudits,
  countByStatus,
  listAudits,
  parseFilters,
  type AuditQueryParams,
} from "@/lib/audit-query";
import { AccessDenied, requireMember } from "@/lib/auth/guards";
import { getProvider } from "@/lib/integrations/catalog";
import { listMembers } from "@/lib/workspace-directory";

/** Reads the session and the URL's search params; nothing here is cacheable across users. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Audits" };

const PAGE_SIZE = 24;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<AuditQueryParams>;
};

export default async function AuditLibraryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;

  const [workspace] = await db
    .select({ id: workspaces.id, name: workspaces.name, type: workspaces.type })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  if (!workspace) notFound();

  try {
    await requireMember(workspace.id);
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }

  const workspaceId = workspace.id;
  const filters = parseFilters(query);
  const tab = firstParam(query.status) ?? "all";
  const activeTab = LIBRARY_TABS.some((t) => t.value === tab) ? tab : "all";
  const page = Math.max(1, Number(firstParam(query.page) ?? "1") || 1);

  // Counts describe "how many audits would each tab hold under the current filters", so
  // they are computed without the status predicate the tab itself contributes.
  const [unstatused, conditions] = await Promise.all([
    buildAuditConditions({ workspaceId, filters: { ...filters, status: undefined } }),
    buildAuditConditions({ workspaceId, filters, tab: activeTab }),
  ]);

  const [
    rows,
    total,
    statusCounts,
    workspaceEntities,
    workspaceClients,
    usedTemplates,
    periods,
    connections,
    members,
  ] = await Promise.all([
    listAudits(conditions, PAGE_SIZE, (page - 1) * PAGE_SIZE),
    countAudits(conditions),
    countByStatus(unstatused),

    db
      .select({ id: entities.id, name: entities.legalName })
      .from(entities)
      .where(eq(entities.workspaceId, workspaceId))
      .orderBy(asc(entities.legalName)),

    db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(eq(clients.workspaceId, workspaceId))
      .orderBy(asc(clients.name)),

    // Only templates this workspace has actually used: a 130-item dropdown of templates
    // nobody here has run is noise, not a filter.
    db
      .selectDistinct({ id: templates.id, name: templates.name })
      .from(audits)
      .innerJoin(templates, eq(templates.id, audits.templateId))
      .where(eq(audits.workspaceId, workspaceId))
      .orderBy(asc(templates.name)),

    db
      .selectDistinct({ period: audits.periodLabel })
      .from(audits)
      .where(and(eq(audits.workspaceId, workspaceId), isNotNull(audits.periodLabel)))
      .orderBy(asc(audits.periodLabel)),

    db
      .selectDistinct({ providerKey: integrationConnections.providerKey })
      .from(integrationConnections)
      .where(eq(integrationConnections.workspaceId, workspaceId)),

    listMembers(workspaceId),
  ]);

  const emails = new Map(members.map((m) => [m.userId, m.email]));

  const totalUnfiltered = [...statusCounts.values()].reduce((sum, n) => sum + n, 0);
  const archivedCount = statusCounts.get("archived") ?? 0;

  const tabs = LIBRARY_TABS.map((t) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      const single = firstParam(value);
      if (single && key !== "status" && key !== "page") next.set(key, single);
    }
    if (t.value !== "all") next.set("status", t.value);
    return {
      value: t.value,
      label: t.label,
      href: next.size > 0 ? `/w/${slug}/audits?${next}` : `/w/${slug}/audits`,
      count:
        t.value === "all"
          ? totalUnfiltered - archivedCount
          : (statusCounts.get(t.value) ?? 0),
    };
  });

  const memberOptions = members.map((m) => ({ value: m.userId, label: m.email }));

  const fields: FilterField[] = [
    { kind: "search", name: "q", label: "Search", placeholder: "Name or objective" },
    {
      kind: "select",
      name: "domain",
      label: "Audit type",
      anyLabel: "Any type",
      options: AUDIT_DOMAINS.map((d) => ({ value: d, label: DOMAIN_LABELS[d] })),
    },
    {
      kind: "select",
      name: "template",
      label: "Template",
      anyLabel: "Any template",
      options: usedTemplates.map((t) => ({ value: t.id, label: t.name })),
    },
    {
      kind: "select",
      name: "entity",
      label: "Entity",
      anyLabel: "Any entity",
      options: workspaceEntities.map((e) => ({ value: e.id, label: e.name })),
    },
    // Clients only exist in firm workspaces (PRD §21.3), so the filter only exists there.
    ...(workspace.type === "firm"
      ? [
          {
            kind: "select" as const,
            name: "client",
            label: "Client",
            anyLabel: "Any client",
            options: workspaceClients.map((c) => ({ value: c.id, label: c.name })),
          },
        ]
      : []),
    {
      kind: "select",
      name: "period",
      label: "Period",
      anyLabel: "Any period",
      options: periods.flatMap((p) => (p.period ? [{ value: p.period, label: p.period }] : [])),
    },
    {
      kind: "select",
      name: "creator",
      label: "Creator",
      anyLabel: "Anyone",
      options: memberOptions,
    },
    {
      kind: "select",
      name: "reviewer",
      label: "Reviewer",
      anyLabel: "Anyone",
      options: memberOptions,
    },
    {
      kind: "select",
      name: "risk",
      label: "Risk level",
      anyLabel: "Any risk",
      options: RISK_LEVELS.map((r) => ({ value: r, label: RISK_LABELS[r] })),
    },
    {
      kind: "select",
      name: "category",
      label: "Finding category",
      anyLabel: "Any category",
      options: FINDING_CATEGORIES.map((c) => ({
        value: c,
        label: c.charAt(0).toUpperCase() + c.slice(1),
      })),
    },
    {
      kind: "select",
      name: "integration",
      label: "Integration",
      anyLabel: "Any integration",
      options: connections.map((c) => ({
        value: c.providerKey,
        label: getProvider(c.providerKey)?.name ?? c.providerKey,
      })),
    },
    { kind: "date", name: "createdFrom", label: "Created from" },
    { kind: "date", name: "createdTo", label: "Created to" },
    { kind: "date", name: "completedFrom", label: "Completed from" },
    { kind: "date", name: "completedTo", label: "Completed to" },
  ];

  const cards: AuditCardData[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    domain: row.domain,
    subcategory: row.subcategory,
    entityName: row.entityName,
    clientName: row.clientName,
    periodLabel: row.periodLabel,
    periodStart: row.periodStart,
    periodEnd: row.periodEnd,
    overallRisk: row.overallRisk,
    findingCount: row.findingCount,
    creatorEmail: row.creatorId ? (emails.get(row.creatorId) ?? "Unknown") : null,
    reviewerEmail: row.reviewerId ? (emails.get(row.reviewerId) ?? "Unknown") : null,
    updatedAt: row.updatedAt,
    status: row.status,
    templateName: row.templateName,
  }));

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function pageHref(target: number): string {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      const single = firstParam(value);
      if (single && key !== "page") next.set(key, single);
    }
    if (target > 1) next.set("page", String(target));
    return next.size > 0 ? `/w/${slug}/audits?${next}` : `/w/${slug}/audits`;
  }

  return (
    <>
      <PageHeader
        title="Audits"
        description="Every audit in this workspace. Evidence, findings and conversations stay inside the audit they belong to."
        actions={
          <Button render={<Link href={`/w/${slug}/audits/new`} />}>
            <RiAddLine aria-hidden="true" />
            New audit
          </Button>
        }
      />

      <LibraryTabs tabs={tabs} active={activeTab} />
      <LibraryFilters fields={fields} preserve={["status"]} />

      <main className="flex flex-1 flex-col gap-4 px-4 py-5 md:px-6">
        {totalUnfiltered === 0 ? (
          <Empty className="border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <RiSearchEyeLine aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No audits yet</EmptyTitle>
              <EmptyDescription>
                An audit is the unit of work here. Pick a template, attach the evidence, and the
                model produces findings that point back at the rows they came from.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button render={<Link href={`/w/${slug}/audits/new`} />}>
                <RiAddLine aria-hidden="true" />
                Create your first audit
              </Button>
              <Button render={<Link href={`/w/${slug}/templates`} />} variant="outline">
                Browse the template library
              </Button>
            </EmptyContent>
          </Empty>
        ) : cards.length === 0 ? (
          <Empty className="border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <RiSearchEyeLine aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No audits match these filters</EmptyTitle>
              <EmptyDescription>
                {totalUnfiltered} audit{totalUnfiltered === 1 ? "" : "s"} exist in this workspace.
                Widen or clear the filters above to see them.
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button render={<Link href={`/w/${slug}/audits`} />} variant="outline">
                Clear all filters
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            <p aria-live="polite" className="text-xs text-muted-foreground">
              {total} audit{total === 1 ? "" : "s"}
              {pageCount > 1 ? ` · page ${page} of ${pageCount}` : ""}
            </p>
            <ul className="grid gap-3 lg:grid-cols-2 2xl:grid-cols-3">
              {cards.map((audit) => (
                <AuditCard key={audit.id} audit={audit} slug={slug} />
              ))}
            </ul>

            {pageCount > 1 ? (
              <nav aria-label="Pagination" className="flex items-center justify-center gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  render={page <= 1 ? <span /> : <Link href={pageHref(page - 1)} />}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= pageCount}
                  render={page >= pageCount ? <span /> : <Link href={pageHref(page + 1)} />}
                >
                  Next
                </Button>
              </nav>
            ) : null}
          </>
        )}
      </main>
    </>
  );
}
