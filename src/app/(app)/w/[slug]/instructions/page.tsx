import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, asc, count, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { RiAddLine, RiFileListLine, RiLock2Line } from "@remixicon/react";

import { LibraryFilters, type FilterField } from "@/components/audit/library-filters";
import { AuthorityHierarchy } from "@/components/instructions/authority-hierarchy";
import {
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  STATUS_LABELS,
  STATUS_ORDER,
  isInstructionCategory,
  isInstructionStatus,
} from "@/components/instructions/labels";
import { PageHeader } from "@/components/layout/page-header";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/db";
import { auditInstructionLinks, instructions, workspaces } from "@/db/schema";
import { firstParam } from "@/lib/audit-filters";
import { AccessDenied, requireMember, roleHas } from "@/lib/auth/guards";
import { displayName, memberEmailMap } from "@/lib/workspace-directory";

/**
 * The instructions library (PRD §9.1).
 *
 * Instructions are workspace policy, not audit data — this is one of the few libraries in
 * an audit-first product that lists something other than audits. What it must never do is
 * imply that editing here reaches backwards: an audit pins an instruction *version*
 * (§9.4), so the "used by" column counts audits frozen against a specific version, and the
 * detail page spells the consequence out.
 *
 * Drizzle bypasses RLS, so every query below carries `workspace_id` itself.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Instructions" };

const PAGE_SIZE = 30;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function InstructionsLibraryPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;

  const [workspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  if (!workspace) notFound();

  let role;
  let userId;
  try {
    const { membership, user } = await requireMember(workspace.id);
    role = membership.role;
    userId = user.id;
  } catch (error) {
    if (error instanceof AccessDenied) notFound();
    throw error;
  }

  const workspaceId = workspace.id;
  const canManage = roleHas(role, "instructions.manage");

  // The nav writes `?category=`; `?filter=` is accepted as an alias so a link written
  // either way lands on the same view. `filter=mandatory` narrows to always-applied ones.
  const rawFilter = firstParam(query.filter);
  const rawCategory = firstParam(query.category) ?? (rawFilter && rawFilter !== "mandatory" ? rawFilter : undefined);
  const category = rawCategory && isInstructionCategory(rawCategory) ? rawCategory : undefined;

  const rawStatus = firstParam(query.status);
  const status = rawStatus && isInstructionStatus(rawStatus) ? rawStatus : undefined;

  const mandatoryParam = firstParam(query.mandatory);
  const mandatory =
    rawFilter === "mandatory" || mandatoryParam === "yes"
      ? true
      : mandatoryParam === "no"
        ? false
        : undefined;

  const tag = firstParam(query.tag);
  const search = firstParam(query.q);
  const page = Math.max(1, Number(firstParam(query.page) ?? "1") || 1);

  // The tenant predicate first; a `private` instruction is its owner's alone.
  const conditions: SQL[] = [eq(instructions.workspaceId, workspaceId)];
  const visible = or(
    sql`${instructions.visibility} <> 'private'`,
    eq(instructions.ownerId, userId),
  );
  if (visible) conditions.push(visible);

  if (category) conditions.push(eq(instructions.category, category));
  if (status) conditions.push(eq(instructions.status, status));
  if (mandatory !== undefined) conditions.push(eq(instructions.mandatory, mandatory));
  if (tag) conditions.push(sql`${instructions.tags} @> ARRAY[${tag}]::text[]`);
  if (search) {
    const clause = or(
      ilike(instructions.name, `%${search}%`),
      ilike(instructions.description, `%${search}%`),
    );
    if (clause) conditions.push(clause);
  }

  const where = and(...conditions);
  const scope = and(
    eq(instructions.workspaceId, workspaceId),
    ...(visible ? [visible] : []),
  );

  const [rows, totalRow, categoryCounts, tagRows, statusCounts] = await Promise.all([
    db
      .select({
        id: instructions.id,
        name: instructions.name,
        description: instructions.description,
        category: instructions.category,
        ownerId: instructions.ownerId,
        visibility: instructions.visibility,
        priority: instructions.priority,
        mandatory: instructions.mandatory,
        status: instructions.status,
        tags: instructions.tags,
        currentVersion: instructions.currentVersion,
        effectiveDate: instructions.effectiveDate,
        expirationDate: instructions.expirationDate,
        updatedAt: instructions.updatedAt,
      })
      .from(instructions)
      .where(where)
      // Mandatory first, then the hierarchy's own tiebreak (lower priority wins).
      .orderBy(desc(instructions.mandatory), asc(instructions.priority), asc(instructions.name))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),

    db.select({ total: count() }).from(instructions).where(where),

    db
      .select({ category: instructions.category, total: count() })
      .from(instructions)
      .where(scope)
      .groupBy(instructions.category),

    db
      .select({ tag: sql<string>`unnest(${instructions.tags})`.as("tag") })
      .from(instructions)
      .where(scope)
      .groupBy(sql`1`)
      .orderBy(sql`1`),

    db
      .select({ status: instructions.status, total: count() })
      .from(instructions)
      .where(scope)
      .groupBy(instructions.status),
  ]);

  // "Used by" is only asked for the rows on screen, so it stays one cheap grouped read.
  const usage =
    rows.length > 0
      ? await db
          .select({
            instructionId: auditInstructionLinks.instructionId,
            audits: count(),
          })
          .from(auditInstructionLinks)
          .where(
            and(
              eq(auditInstructionLinks.workspaceId, workspaceId),
              inArray(
                auditInstructionLinks.instructionId,
                rows.map((row) => row.id),
              ),
            ),
          )
          .groupBy(auditInstructionLinks.instructionId)
      : [];

  const usageBy = new Map(usage.map((row) => [row.instructionId, row.audits]));
  const emails = await memberEmailMap(workspaceId);

  const total = totalRow[0]?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const libraryTotal = categoryCounts.reduce((sum, row) => sum + row.total, 0);
  const mandatoryTotal = rows.filter((row) => row.mandatory).length;

  const fields: FilterField[] = [
    { kind: "search", name: "q", label: "Search", placeholder: "Name or description" },
    {
      kind: "select",
      name: "category",
      label: "Category",
      anyLabel: "Every category",
      options: CATEGORY_ORDER.map((value) => {
        const found = categoryCounts.find((row) => row.category === value);
        return { value, label: `${CATEGORY_LABELS[value]} (${found?.total ?? 0})` };
      }),
    },
    {
      kind: "select",
      name: "status",
      label: "Status",
      anyLabel: "Every status",
      options: STATUS_ORDER.map((value) => {
        const found = statusCounts.find((row) => row.status === value);
        return { value, label: `${STATUS_LABELS[value]} (${found?.total ?? 0})` };
      }),
    },
    {
      kind: "select",
      name: "mandatory",
      label: "Applies",
      anyLabel: "Mandatory and optional",
      options: [
        { value: "yes", label: "Mandatory only" },
        { value: "no", label: "Selectable only" },
      ],
    },
    {
      kind: "select",
      name: "tag",
      label: "Tag",
      anyLabel: "Every tag",
      options: tagRows.map((row) => ({ value: row.tag, label: row.tag })),
    },
  ];

  function pageHref(target: number): string {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      const single = firstParam(value);
      if (single && key !== "page") next.set(key, single);
    }
    if (target > 1) next.set("page", String(target));
    return next.size > 0 ? `/w/${slug}/instructions?${next}` : `/w/${slug}/instructions`;
  }

  return (
    <>
      <PageHeader
        title="Instructions"
        description={
          <>
            {libraryTotal} reusable instruction{libraryTotal === 1 ? "" : "s"}. An audit stores
            the exact text it ran under, so editing an instruction here changes what future
            audits are told — never what a finished audit was told.
          </>
        }
        actions={
          canManage ? (
            <Button render={<Link href={`/w/${slug}/instructions/new`} />}>
              <RiAddLine aria-hidden="true" />
              New instruction
            </Button>
          ) : null
        }
      />

      <LibraryFilters fields={fields} />

      <main className="flex flex-1 flex-col gap-5 px-4 py-5 md:px-6">
        {rows.length === 0 ? (
          <Empty className="border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <RiFileListLine aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>
                {libraryTotal > 0 ? "No instruction matches these filters" : "No instructions yet"}
              </EmptyTitle>
              <EmptyDescription>
                {libraryTotal > 0
                  ? `${libraryTotal} instruction${libraryTotal === 1 ? " exists" : "s exist"} in this workspace. Widen the filters to find them.`
                  : "An instruction is a rule the model must follow — your materiality threshold, the standard that applies, how findings should read. Write one once and attach it to any audit."}
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              {libraryTotal > 0 ? (
                <Button render={<Link href={`/w/${slug}/instructions`} />} variant="outline">
                  Clear filters
                </Button>
              ) : canManage ? (
                <Button render={<Link href={`/w/${slug}/instructions/new`} />}>
                  <RiAddLine aria-hidden="true" />
                  Write the first instruction
                </Button>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Your role cannot create instructions.
                </p>
              )}
            </EmptyContent>
          </Empty>
        ) : (
          <>
            <p aria-live="polite" className="text-xs text-muted-foreground">
              {total} instruction{total === 1 ? "" : "s"}
              {mandatoryTotal > 0
                ? ` · ${mandatoryTotal} on this page appl${mandatoryTotal === 1 ? "ies" : "y"} whether or not anyone selects ${mandatoryTotal === 1 ? "it" : "them"}`
                : ""}
              {pageCount > 1 ? ` · page ${page} of ${pageCount}` : ""}
            </p>

            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-64">Instruction</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Applies</TableHead>
                    <TableHead className="text-right">Priority</TableHead>
                    <TableHead className="text-right">Version</TableHead>
                    <TableHead className="text-right">Used by</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const ownerEmail = row.ownerId ? emails.get(row.ownerId) : undefined;
                    const used = usageBy.get(row.id) ?? 0;
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="align-top">
                          <Link
                            href={`/w/${slug}/instructions/${row.id}`}
                            className="font-medium underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                          >
                            {row.name}
                          </Link>
                          {row.description ? (
                            <p className="mt-0.5 line-clamp-2 max-w-md text-xs text-muted-foreground">
                              {row.description}
                            </p>
                          ) : null}
                          {row.tags && row.tags.length > 0 ? (
                            <ul className="mt-1 flex flex-wrap gap-1">
                              {row.tags.slice(0, 4).map((item) => (
                                <li
                                  key={item}
                                  className="rounded-4xl bg-muted px-1.5 py-px text-[11px] text-muted-foreground"
                                >
                                  {item}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                        </TableCell>

                        <TableCell className="align-top">
                          <Badge variant="secondary">{CATEGORY_LABELS[row.category]}</Badge>
                        </TableCell>

                        <TableCell className="align-top">
                          {row.mandatory ? (
                            <span className="inline-flex items-center gap-1 text-xs font-medium">
                              <RiLock2Line aria-hidden="true" className="size-3.5" />
                              Always
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">When selected</span>
                          )}
                        </TableCell>

                        <TableCell className="text-right align-top tabular-nums">
                          {row.priority}
                        </TableCell>

                        <TableCell className="text-right align-top tabular-nums">
                          v{row.currentVersion}
                        </TableCell>

                        <TableCell className="text-right align-top tabular-nums">
                          {used === 0 ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            <>
                              {used}
                              <span className="sr-only">
                                {" "}
                                audit{used === 1 ? "" : "s"}, each pinned to the version it ran
                                under
                              </span>
                            </>
                          )}
                        </TableCell>

                        <TableCell className="align-top text-xs">
                          {row.ownerId === userId ? (
                            "You"
                          ) : ownerEmail ? (
                            <span title={ownerEmail}>{displayName(ownerEmail)}</span>
                          ) : (
                            <span className="text-muted-foreground">Unassigned</span>
                          )}
                          {row.visibility === "private" ? (
                            <span className="block text-[11px] text-muted-foreground">Private</span>
                          ) : null}
                        </TableCell>

                        <TableCell className="align-top">
                          <Badge variant={row.status === "active" ? "outline" : "ghost"}>
                            {STATUS_LABELS[row.status]}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {pageCount > 1 ? (
              <nav aria-label="Pagination" className="flex items-center justify-center gap-2">
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

        <AuthorityHierarchy />
      </main>
    </>
  );
}
