import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, count, eq, ilike, inArray, isNull, or, type SQL } from "drizzle-orm";
import { RiAddLine, RiFileCopyLine } from "@remixicon/react";

import { LibraryFilters, type FilterField } from "@/components/audit/library-filters";
import { PageHeader } from "@/components/layout/page-header";
import { DuplicateButton, TemplatePreview } from "@/components/templates/template-preview";
import { Badge } from "@/components/ui/badge";
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
import { templateVersions, templates, workspaces } from "@/db/schema";
import { AUDIT_DOMAINS, DOMAIN_LABELS, firstParam } from "@/lib/audit-filters";
import { AccessDenied, requireMember, roleHas } from "@/lib/auth/guards";
import type { AuditDomain } from "@/lib/ai/blocks/types";

/**
 * The template library (PRD §17.1): searchable, filterable, categorized, previewable,
 * versioned, duplicable.
 *
 * The system library ships with the product (`templates.workspace_id IS NULL`) and is
 * readable by every workspace; workspace templates are tenant data. Both predicates are
 * spelled out in every query here because drizzle bypasses RLS.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Templates" };

const PAGE_SIZE = 24;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const SOURCE_OPTIONS = [
  { value: "system", label: "System library" },
  { value: "workspace", label: "Workspace templates" },
];

export default async function TemplateLibraryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;

  const [workspace] = await db
    .select({ id: workspaces.id, name: workspaces.name })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  if (!workspace) notFound();

  let role;
  try {
    const { membership } = await requireMember(workspace.id);
    role = membership.role;
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }

  const workspaceId = workspace.id;
  const canDuplicate = roleHas(role, "templates.manage");

  const domainParam = firstParam(query.domain);
  const domain =
    domainParam && (AUDIT_DOMAINS as readonly string[]).includes(domainParam)
      ? (domainParam as AuditDomain)
      : undefined;
  const source = firstParam(query.filter);
  const subcategory = firstParam(query.subcategory);
  const search = firstParam(query.q);
  const page = Math.max(1, Number(firstParam(query.page) ?? "1") || 1);

  // Visibility, always. Everything else narrows within it.
  const visible = or(isNull(templates.workspaceId), eq(templates.workspaceId, workspaceId));
  const conditions: SQL[] = [];
  if (visible) conditions.push(visible);

  if (source === "system") conditions.push(isNull(templates.workspaceId));
  if (source === "workspace") conditions.push(eq(templates.workspaceId, workspaceId));
  if (domain) conditions.push(eq(templates.category, domain));
  if (subcategory) conditions.push(eq(templates.subcategory, subcategory));
  if (search) {
    const clause = or(
      ilike(templates.name, `%${search}%`),
      ilike(templates.description, `%${search}%`),
      ilike(templates.subcategory, `%${search}%`),
    );
    if (clause) conditions.push(clause);
  }

  const where = and(...conditions);

  const [rows, totalRow, categoryCounts, subcategories] = await Promise.all([
    db
      .select({
        id: templates.id,
        slug: templates.slug,
        name: templates.name,
        category: templates.category,
        subcategory: templates.subcategory,
        description: templates.description,
        tags: templates.tags,
        currentVersion: templates.currentVersion,
        workspaceId: templates.workspaceId,
      })
      .from(templates)
      .where(where)
      .orderBy(asc(templates.category), asc(templates.name))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),

    db.select({ total: count() }).from(templates).where(where),

    db
      .select({ category: templates.category, total: count() })
      .from(templates)
      .where(visible)
      .groupBy(templates.category),

    db
      .selectDistinct({ subcategory: templates.subcategory })
      .from(templates)
      .where(and(visible, domain ? eq(templates.category, domain) : undefined))
      .orderBy(asc(templates.subcategory)),
  ]);

  // Bodies are fetched for the current page only: the preview needs the full instruction
  // text, and 130 of those would be an enormous payload for a list view.
  const versions =
    rows.length > 0
      ? await db
          .select()
          .from(templateVersions)
          .where(
            inArray(
              templateVersions.templateId,
              rows.map((r) => r.id),
            ),
          )
      : [];

  const versionFor = new Map(
    rows.flatMap((row) => {
      const version = versions.find(
        (v) => v.templateId === row.id && v.version === row.currentVersion,
      );
      return version ? [[row.id, version] as const] : [];
    }),
  );

  const total = totalRow[0]?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const libraryTotal = categoryCounts.reduce((sum, row) => sum + row.total, 0);

  const fields: FilterField[] = [
    { kind: "search", name: "q", label: "Search", placeholder: "Name, description, area" },
    {
      kind: "select",
      name: "domain",
      label: "Category",
      anyLabel: "Every category",
      options: AUDIT_DOMAINS.map((d) => {
        const found = categoryCounts.find((c) => c.category === d);
        return { value: d, label: `${DOMAIN_LABELS[d]} (${found?.total ?? 0})` };
      }),
    },
    {
      kind: "select",
      name: "subcategory",
      label: "Audit area",
      anyLabel: "Every area",
      options: subcategories.flatMap((s) =>
        s.subcategory ? [{ value: s.subcategory, label: s.subcategory }] : [],
      ),
    },
    {
      kind: "select",
      name: "filter",
      label: "Source",
      anyLabel: "System and workspace",
      options: SOURCE_OPTIONS,
    },
  ];

  function pageHref(target: number): string {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      const single = firstParam(value);
      if (single && key !== "page") next.set(key, single);
    }
    if (target > 1) next.set("page", String(target));
    return next.size > 0 ? `/w/${slug}/templates?${next}` : `/w/${slug}/templates`;
  }

  return (
    <>
      <PageHeader
        title="Audit templates"
        description={`${libraryTotal} templates. A template carries an audit method — the instructions the model follows — and is pinned by version so an audit never changes when the template does.`}
        actions={
          canDuplicate ? (
            <Button render={<Link href={`/w/${slug}/templates/new`} />} variant="outline">
              <RiAddLine aria-hidden="true" />
              Create template
            </Button>
          ) : null
        }
      />

      <LibraryFilters fields={fields} />

      <main className="flex flex-1 flex-col gap-4 px-4 py-5 md:px-6">
        {rows.length === 0 ? (
          <Empty className="border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <RiFileCopyLine aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>No templates match these filters</EmptyTitle>
              <EmptyDescription>
                {libraryTotal > 0
                  ? `${libraryTotal} templates are available. Widen the filters to find them.`
                  : "The system template library has not been seeded in this environment yet. Run `pnpm db:seed` to install it."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button render={<Link href={`/w/${slug}/templates`} />} variant="outline">
                Clear filters
              </Button>
            </EmptyContent>
          </Empty>
        ) : (
          <>
            <p aria-live="polite" className="text-xs text-muted-foreground">
              {total} template{total === 1 ? "" : "s"}
              {pageCount > 1 ? ` · page ${page} of ${pageCount}` : ""}
            </p>

            <ul className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
              {rows.map((row) => {
                const version = versionFor.get(row.id);
                return (
                  <li
                    key={row.id}
                    className="flex flex-col gap-2.5 rounded-lg border border-border bg-card p-3.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-heading text-sm font-semibold tracking-tight">
                        {row.name}
                      </h3>
                      <Badge variant="outline" className="shrink-0">
                        v{row.currentVersion}
                      </Badge>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5">
                      <Badge variant="secondary">{DOMAIN_LABELS[row.category]}</Badge>
                      {row.subcategory ? <Badge variant="outline">{row.subcategory}</Badge> : null}
                      {row.workspaceId ? <Badge variant="outline">Workspace</Badge> : null}
                    </div>

                    <p className="line-clamp-3 text-xs text-muted-foreground">{row.description}</p>

                    {row.tags && row.tags.length > 0 ? (
                      <ul className="flex flex-wrap gap-1">
                        {row.tags.slice(0, 4).map((tag) => (
                          <li
                            key={tag}
                            className="rounded-4xl bg-muted px-1.5 py-px text-[11px] text-muted-foreground"
                          >
                            {tag}
                          </li>
                        ))}
                      </ul>
                    ) : null}

                    <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
                      {version ? (
                        <TemplatePreview
                          slug={slug}
                          template={{
                            id: row.id,
                            slug: row.slug,
                            name: row.name,
                            description: row.description,
                            categoryLabel: DOMAIN_LABELS[row.category],
                            subcategory: row.subcategory,
                            version: row.currentVersion,
                            isSystem: row.workspaceId === null,
                            tags: row.tags ?? [],
                            defaultTitle: version.defaultTitle,
                            auditDescription: version.auditDescription,
                            instructions: version.instructions,
                            recommendedInputs: version.recommendedInputs,
                            requiredEvidence: version.requiredEvidence,
                            suggestedPeriod: version.suggestedPeriod,
                            expectedOutputStructure: version.expectedOutputStructure,
                            suggestedFollowups: version.suggestedFollowups,
                            relevantIntegrations: version.relevantIntegrations ?? [],
                          }}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          No body stored for v{row.currentVersion} — nothing to preview.
                        </span>
                      )}
                      {canDuplicate ? (
                        <DuplicateButton slug={slug} template={{ id: row.id, name: row.name }} />
                      ) : null}
                      <Button
                        size="sm"
                        variant="outline"
                        render={<Link href={`/w/${slug}/audits/new?template=${row.slug}`} />}
                      >
                        Use
                      </Button>
                    </div>
                  </li>
                );
              })}
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
