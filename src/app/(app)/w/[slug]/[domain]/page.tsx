import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, count, eq, gte, inArray, isNull, or } from "drizzle-orm";
import { RiAddLine, RiFileCopyLine, RiSearchEyeLine } from "@remixicon/react";

import { RiskBadge, StatusBadge } from "@/components/audit/badges";
import { formatDay, periodText } from "@/components/audit/audit-card";
import { LibraryFilters, type FilterField } from "@/components/audit/library-filters";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/db";
import {
  audits,
  auditRevisions,
  clients,
  entities,
  findingStates,
  findings,
  templates,
  workspaces,
} from "@/db/schema";
import {
  DOMAIN_BLURBS,
  DOMAIN_FILTERS,
  DOMAIN_LABELS,
  DOMAIN_NOUNS,
  LIBRARY_TABS,
  RISK_LABELS,
  RISK_LEVELS,
  domainFilter,
  firstParam,
  isLibraryDomain,
} from "@/lib/audit-filters";
import {
  buildAuditConditions,
  countAudits,
  listAudits,
  parseFilters,
  type AuditQueryParams,
} from "@/lib/audit-query";
import { AccessDenied, requireMember } from "@/lib/auth/guards";
import { cn } from "@/lib/utils";

/**
 * A domain library — `/w/<slug>/ledger`, `/budgets`, `/cash`, `/customers`, `/suppliers`.
 *
 * This is a **filtered audit dashboard**, not a data module (PRD "How pages should
 * behave"). It never shows live ledger rows, customer records, supplier records or a
 * budget database: those exist only inside the audit they were uploaded for. Everything
 * on this page is derived from audits.
 */
export const dynamic = "force-dynamic";

const PAGE_SIZE = 30;

type Props = {
  params: Promise<{ slug: string; domain: string }>;
  searchParams: Promise<AuditQueryParams>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { domain } = await params;
  if (!isLibraryDomain(domain)) return { title: "Not found" };
  return { title: `${DOMAIN_LABELS[domain]} audits` };
}

export default async function DomainLibraryPage({ params, searchParams }: Props) {
  const { slug, domain } = await params;
  // The segment is a route parameter, so it is validated before it reaches a query.
  if (!isLibraryDomain(domain)) notFound();

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
  const label = DOMAIN_LABELS[domain];
  const noun = DOMAIN_NOUNS[domain];
  const filters = parseFilters(query);
  const activeFilterKey = firstParam(query.filter);
  const subFilter = domainFilter(domain, activeFilterKey);
  const tab = firstParam(query.status) ?? "all";
  const activeTab = LIBRARY_TABS.some((t) => t.value === tab) ? tab : "all";
  const page = Math.max(1, Number(firstParam(query.page) ?? "1") || 1);

  // An unknown `?filter=` would otherwise silently show the unfiltered library, which
  // would quietly lie about what the user is looking at.
  if (activeFilterKey && !subFilter) notFound();

  const conditions = await buildAuditConditions({
    workspaceId,
    filters,
    domain,
    subFilter,
    tab: activeTab,
  });

  // The summary stats describe the whole domain, not the current sub-filter: they are the
  // answer to "how is ledger work going?", which a sub-filter must not distort.
  const domainScope = and(eq(audits.workspaceId, workspaceId), eq(audits.domain, domain));
  // "Completed in 30 days" is measured from the request, and this is an async Server Component
  // on a force-dynamic route: it runs once per request on the server and never re-renders, so
  // reading the clock here is both correct and necessary. The purity rule cannot distinguish
  // that from a client render, which is what it is actually written to protect.
  // eslint-disable-next-line react-hooks/purity
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const [
    rows,
    total,
    domainTotal,
    openFindingsRow,
    highRiskRow,
    awaitingReviewRow,
    recentlyCompletedRow,
    domainTemplates,
    workspaceEntities,
    workspaceClients,
  ] = await Promise.all([
    listAudits(conditions, PAGE_SIZE, (page - 1) * PAGE_SIZE),
    countAudits(conditions),

    db.select({ total: count() }).from(audits).where(domainScope),

    // Only findings on each audit's *current* revision are live work; superseded revisions
    // stay in the database so old results remain reproducible.
    db
      .select({ total: count() })
      .from(findings)
      .innerJoin(
        audits,
        and(eq(audits.id, findings.auditId), eq(audits.currentRevisionId, findings.revisionId)),
      )
      .leftJoin(findingStates, eq(findingStates.findingId, findings.id))
      .where(
        and(
          eq(findings.workspaceId, workspaceId),
          domainScope,
          or(
            isNull(findingStates.status),
            inArray(findingStates.status, ["open", "in_progress", "disputed"]),
          ),
        ),
      ),

    db
      .select({ total: count() })
      .from(audits)
      .where(and(domainScope, inArray(audits.overallRisk, ["critical", "high"]))),

    db
      .select({ total: count() })
      .from(audits)
      .where(and(domainScope, eq(audits.status, "review_needed"))),

    db
      .select({ total: count() })
      .from(audits)
      .innerJoin(auditRevisions, eq(auditRevisions.id, audits.currentRevisionId))
      .where(and(domainScope, gte(auditRevisions.completedAt, thirtyDaysAgo))),

    // The domain's slice of the system template library — the "<domain> audit templates"
    // view the nav points at.
    db
      .select({
        id: templates.id,
        slug: templates.slug,
        name: templates.name,
        subcategory: templates.subcategory,
        currentVersion: templates.currentVersion,
      })
      .from(templates)
      .where(and(eq(templates.category, domain), isNull(templates.workspaceId)))
      .orderBy(templates.name)
      .limit(6),

    db
      .select({ id: entities.id, name: entities.legalName })
      .from(entities)
      .where(eq(entities.workspaceId, workspaceId))
      .orderBy(entities.legalName),

    db
      .select({ id: clients.id, name: clients.name })
      .from(clients)
      .where(eq(clients.workspaceId, workspaceId))
      .orderBy(clients.name),
  ]);

  const stats = [
    { label: `Total ${noun} audits`, value: domainTotal[0]?.total ?? 0, href: `/w/${slug}/${domain}` },
    {
      label: "Open findings",
      value: openFindingsRow[0]?.total ?? 0,
      href: `/w/${slug}/${domain}?status=completed`,
    },
    {
      label: "High-risk audits",
      value: highRiskRow[0]?.total ?? 0,
      href: `/w/${slug}/${domain}?risk=high`,
    },
    {
      label: "Awaiting review",
      value: awaitingReviewRow[0]?.total ?? 0,
      href: `/w/${slug}/${domain}?status=review_needed`,
    },
    {
      label: "Completed in 30 days",
      value: recentlyCompletedRow[0]?.total ?? 0,
      href: `/w/${slug}/${domain}?status=completed`,
    },
  ];

  const fields: FilterField[] = [
    { kind: "search", name: "q", label: "Search", placeholder: "Audit name" },
    {
      kind: "select",
      name: "status",
      label: "Status",
      anyLabel: "Any status",
      options: LIBRARY_TABS.filter((t) => t.value !== "all").map((t) => ({
        value: t.value,
        label: t.label,
      })),
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
      name: "entity",
      label: "Entity",
      anyLabel: "Any entity",
      options: workspaceEntities.map((e) => ({ value: e.id, label: e.name })),
    },
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
    { kind: "date", name: "createdFrom", label: "Created from" },
    { kind: "date", name: "createdTo", label: "Created to" },
  ];

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  function href(patch: Record<string, string | undefined>): string {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      const single = firstParam(value);
      if (single) next.set(key, single);
    }
    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete("page");
    return next.size > 0 ? `/w/${slug}/${domain}?${next}` : `/w/${slug}/${domain}`;
  }

  function pageHref(target: number): string {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      const single = firstParam(value);
      if (single && key !== "page") next.set(key, single);
    }
    if (target > 1) next.set("page", String(target));
    return next.size > 0 ? `/w/${slug}/${domain}?${next}` : `/w/${slug}/${domain}`;
  }

  return (
    <>
      <PageHeader
        title={`${label} audits`}
        description={DOMAIN_BLURBS[domain]}
        breadcrumb={[{ label: "Audits", href: `/w/${slug}/audits` }, { label }]}
        actions={
          <>
            <Button render={<Link href={`/w/${slug}/templates?domain=${domain}`} />} variant="outline">
              <RiFileCopyLine aria-hidden="true" />
              {label} audit templates
            </Button>
            <Button render={<Link href={`/w/${slug}/audits/new?domain=${domain}`} />}>
              <RiAddLine aria-hidden="true" />
              Create {noun} audit
            </Button>
          </>
        }
      />

      <section aria-labelledby="domain-stats" className="border-b border-border px-4 py-4 md:px-6">
        <h2 id="domain-stats" className="sr-only">
          {label} audit summary
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {stats.map((stat) => (
            <Link
              key={stat.label}
              href={stat.href}
              className="rounded-lg border border-border bg-card p-3 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            >
              <div className="text-2xl font-semibold tabular-nums">{stat.value}</div>
              <div className="mt-0.5 text-xs text-muted-foreground">{stat.label}</div>
            </Link>
          ))}
        </div>
      </section>

      <nav aria-label={`${label} audit categories`} className="border-b border-border px-4 py-2.5 md:px-6">
        <ul className="flex flex-wrap gap-1.5">
          <li>
            <Link
              href={href({ filter: undefined })}
              aria-current={subFilter ? undefined : "page"}
              className={cn(
                "inline-flex rounded-4xl border px-2.5 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                subFilter
                  ? "border-border text-muted-foreground hover:bg-accent"
                  : "border-foreground/20 bg-foreground/10 font-medium text-foreground",
              )}
            >
              All {noun} audits
            </Link>
          </li>
          {DOMAIN_FILTERS[domain].map((option) => {
            const isActive = option.key === subFilter?.key;
            return (
              <li key={option.key}>
                <Link
                  href={href({ filter: option.key })}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "inline-flex rounded-4xl border px-2.5 py-1 text-xs transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    isActive
                      ? "border-foreground/20 bg-foreground/10 font-medium text-foreground"
                      : "border-border text-muted-foreground hover:bg-accent",
                  )}
                >
                  {option.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <LibraryFilters fields={fields} preserve={["filter"]} />

      <main className="flex flex-1 flex-col gap-5 px-4 py-5 md:px-6">
        <section aria-labelledby="domain-audits">
          <div className="mb-2 flex items-baseline justify-between gap-3">
            <h2 id="domain-audits" className="font-heading text-sm font-semibold tracking-tight">
              {subFilter ? subFilter.label : `All ${noun} audits`}
            </h2>
            <p aria-live="polite" className="text-xs text-muted-foreground">
              {total} audit{total === 1 ? "" : "s"}
              {pageCount > 1 ? ` · page ${page} of ${pageCount}` : ""}
            </p>
          </div>

          {rows.length === 0 ? (
            <Empty className="border border-dashed border-border">
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RiSearchEyeLine aria-hidden="true" />
                </EmptyMedia>
                <EmptyTitle>
                  {domainTotal[0]?.total === 0
                    ? `No ${noun} audits yet`
                    : `No ${noun} audits match this view`}
                </EmptyTitle>
                <EmptyDescription>
                  {domainTotal[0]?.total === 0
                    ? `${label} work starts with an audit. Choose a ${noun} template, attach the files for the period you are reviewing, and the findings will point back at the rows they came from.`
                    : `${domainTotal[0]?.total} ${noun} audit${domainTotal[0]?.total === 1 ? "" : "s"} exist. Try another category or clear the filters.`}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button render={<Link href={`/w/${slug}/audits/new?domain=${domain}`} />}>
                  <RiAddLine aria-hidden="true" />
                  Create {noun} audit
                </Button>
                {domainTotal[0]?.total === 0 ? (
                  <Button
                    render={<Link href={`/w/${slug}/templates?domain=${domain}`} />}
                    variant="outline"
                  >
                    Browse {noun} audit templates
                  </Button>
                ) : (
                  <Button render={<Link href={`/w/${slug}/${domain}`} />} variant="outline">
                    Clear filters
                  </Button>
                )}
              </EmptyContent>
            </Empty>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Audit</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>{workspace.type === "firm" ? "Client" : "Company"}</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead className="text-right">Findings</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">
                        <Link
                          href={`/w/${slug}/audits/${row.id}`}
                          className="rounded-sm hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                          {row.name}
                        </Link>
                        {row.subcategory ? (
                          <span className="block text-xs text-muted-foreground">
                            {row.subcategory}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.templateName ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.clientName ?? row.entityName ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {periodText(row) ?? "—"}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">{row.findingCount}</TableCell>
                      <TableCell>
                        {row.overallRisk ? (
                          <RiskBadge risk={row.overallRisk} />
                        ) : (
                          <span className="text-xs text-muted-foreground">Not assessed</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={row.status} />
                        {row.completedAt ? (
                          <span className="block text-xs text-muted-foreground">
                            {formatDay(row.completedAt)}
                          </span>
                        ) : null}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {pageCount > 1 ? (
            <nav aria-label="Pagination" className="flex items-center justify-center gap-2 pt-3">
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
        </section>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3">
            <CardTitle className="text-sm font-medium">{label} audit templates</CardTitle>
            <Button
              render={<Link href={`/w/${slug}/templates?domain=${domain}`} />}
              variant="ghost"
              size="sm"
            >
              View all
            </Button>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {domainTemplates.map((template) => (
                <li key={template.id}>
                  <Link
                    href={`/w/${slug}/audits/new?domain=${domain}&template=${template.slug}`}
                    className="flex h-full flex-col gap-1 rounded-lg border border-border p-2.5 transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  >
                    <span className="text-sm font-medium">{template.name}</span>
                    <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      {template.subcategory ?? "General"}
                      <Badge variant="outline">v{template.currentVersion}</Badge>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
