import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, count, eq } from "drizzle-orm";
import { RiAddLine, RiSearchEyeLine } from "@remixicon/react";

import { RiskBadge, StatusBadge } from "@/components/audit/badges";
import { formatDay, periodText } from "@/components/audit/audit-card";
import { NewAuditDialog } from "@/components/audit/new-audit-dialog";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/db";
import { audits, workspaces } from "@/db/schema";
import {
  DOMAIN_LABELS,
  DOMAIN_NOUNS,
  LIBRARY_TABS,
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

/**
 * A domain library — `/w/<slug>/ledger`, `/budgets`, `/cash`, `/customers`, `/suppliers`.
 *
 * The page is the table: the audits filed under this domain, and nothing else. It never
 * shows live ledger rows, customer records, supplier records or a budget database — those
 * exist only inside the audit they were uploaded for (PRD "How pages should behave").
 *
 * `?status=`, `?q=` and the rest still narrow the table, so existing links and bookmarks
 * keep working; there is simply no filter bar rendered for them here.
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
  const tab = firstParam(query.status) ?? "all";
  const activeTab = LIBRARY_TABS.some((t) => t.value === tab) ? tab : "all";
  const page = Math.max(1, Number(firstParam(query.page) ?? "1") || 1);

  const conditions = await buildAuditConditions({
    workspaceId,
    filters,
    domain,
    tab: activeTab,
  });

  // `domainTotal` distinguishes "this domain has no audits at all" from "no audit matches
  // the current filters" — the two empty states say different things.
  const domainScope = and(eq(audits.workspaceId, workspaceId), eq(audits.domain, domain));

  const [rows, total, domainTotal] = await Promise.all([
    listAudits(conditions, PAGE_SIZE, (page - 1) * PAGE_SIZE),
    countAudits(conditions),

    db.select({ total: count() }).from(audits).where(domainScope),
  ]);

  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
        actions={
          <NewAuditDialog workspaceSlug={slug} domain={domain}>
            <Button>
              <RiAddLine aria-hidden="true" />
              Create {noun} audit
            </Button>
          </NewAuditDialog>
        }
      />

      <main className="flex flex-1 flex-col gap-5 px-4 py-5 md:px-6">
        <section aria-label={`${label} audits`}>
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
                    ? `${label} work starts with an audit. Write what to check, attach the files for the period you are reviewing, and the findings will point back at the rows they came from.`
                    : `${domainTotal[0]?.total} ${noun} audit${domainTotal[0]?.total === 1 ? "" : "s"} exist. Try another category or clear the filters.`}
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <NewAuditDialog workspaceSlug={slug} domain={domain}>
                  <Button>
                    <RiAddLine aria-hidden="true" />
                    Create {noun} audit
                  </Button>
                </NewAuditDialog>
                {domainTotal[0]?.total === 0 ? null : (
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

      </main>
    </>
  );
}
