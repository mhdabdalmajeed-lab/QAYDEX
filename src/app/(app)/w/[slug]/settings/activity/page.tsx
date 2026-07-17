import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { and, count, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { RiFilterLine, RiHistoryLine, RiLock2Line } from "@remixicon/react";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { db } from "@/db";
import { activityLog, audits, workspaces } from "@/db/schema";
import { firstParam } from "@/lib/audit-filters";
import { AccessDenied, requirePermission } from "@/lib/auth/guards";
import { displayName, listMembers } from "@/lib/workspace-directory";

/**
 * The audit trail (PRD §25.3) — MVP acceptance criterion #20.
 *
 * This is the page an administrator opens to answer "who did what, when, and with which
 * model?" Everything that mutates state in this product calls `logActivity`, and this is
 * the only surface that reads it back. Two consequences shape the design:
 *
 *  - **Nothing is summarised away.** The metadata column renders whatever the writer
 *    recorded — model id, prompt version, finding counts, export formats — rather than a
 *    prose paraphrase that could omit the one field being looked for.
 *  - **Every filter lives in the URL.** A reconstruction is worth nothing if it cannot be
 *    handed to someone else, so a filtered view is a link, and the filter form is a plain
 *    GET form that works before (and without) JavaScript.
 *
 * Drizzle bypasses RLS, so every query below carries its own `workspace_id` predicate.
 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Audit trail" };

const PAGE_SIZE = 50;

/** How many distinct values a filter menu will offer before it stops being useful. */
const FACET_LIMIT = 200;

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * `audit.run_started` → "Audit · run started". The verb stays recognisable as the key it
 * is logged under, because a support conversation quotes the key, not the prose.
 */
function humanise(value: string): string {
  const [namespace, ...rest] = value.split(".");
  const verb = rest.join(".").replace(/_/g, " ");
  const noun = namespace.replace(/_/g, " ");
  const head = noun.charAt(0).toUpperCase() + noun.slice(1);
  return verb ? `${head} · ${verb}` : head;
}

function humaniseKey(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_.]/g, " ")
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** Metadata is free-form jsonb: render every shape without pretending to know the schema. */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (typeof value === "number") return value.toLocaleString("en-GB");
  if (typeof value === "string") return value.length > 160 ? `${value.slice(0, 157)}…` : value;
  if (Array.isArray(value)) {
    if (value.length === 0) return "none";
    return value.map((item) => formatValue(item)).join(", ");
  }
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return "none";
    return entries.map(([key, item]) => `${key}: ${formatValue(item)}`).join(" · ");
  }
  return String(value);
}

function MetadataList({ metadata }: { metadata: Record<string, unknown> }) {
  const entries = Object.entries(metadata).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <dl className="flex flex-col gap-0.5">
      {entries.map(([key, value]) => (
        <div key={key} className="flex gap-1.5 text-xs leading-relaxed">
          <dt className="shrink-0 text-muted-foreground">{humaniseKey(key)}</dt>
          <dd className="min-w-0 break-words font-medium">{formatValue(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function timestamp(value: Date): { date: string; time: string; iso: string } {
  return {
    date: value.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    time: value.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    iso: value.toISOString(),
  };
}

function Denied({ reason }: { reason: string }): ReactNode {
  return (
    <>
      <PageHeader title="Audit trail" />
      <main className="flex flex-1 items-start p-4 md:p-6">
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RiLock2Line aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>You cannot read the audit trail</EmptyTitle>
            <EmptyDescription>{reason}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </main>
    </>
  );
}

export default async function ActivityPage({ params, searchParams }: Props) {
  const { slug } = await params;
  const query = await searchParams;

  const [workspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, slug))
    .limit(1);
  if (!workspace) notFound();

  // The guard, not a hint: this function throws, and the throw is what stops a member
  // whose role has no `activity.view` from reading who did what.
  try {
    await requirePermission(workspace.id, "activity.view");
  } catch (error) {
    if (error instanceof AccessDenied) return <Denied reason={error.message} />;
    throw error;
  }

  const workspaceId = workspace.id;

  const actor = firstParam(query.actor);
  const action = firstParam(query.action);
  const targetType = firstParam(query.type);
  const auditId = firstParam(query.audit);
  const from = firstParam(query.from);
  const to = firstParam(query.to);
  const page = Math.max(1, Number(firstParam(query.page) ?? "1") || 1);

  const scope = eq(activityLog.workspaceId, workspaceId);
  const conditions: SQL[] = [scope];

  if (actor && UUID_RE.test(actor)) conditions.push(eq(activityLog.actorId, actor));
  if (action) conditions.push(eq(activityLog.action, action));
  if (targetType) conditions.push(eq(activityLog.targetType, targetType));
  if (auditId && UUID_RE.test(auditId)) conditions.push(eq(activityLog.auditId, auditId));
  if (from && DATE_RE.test(from)) {
    conditions.push(gte(activityLog.createdAt, new Date(`${from}T00:00:00.000Z`)));
  }
  if (to && DATE_RE.test(to)) {
    // Inclusive: an auditor asking for "up to the 5th" means the whole of the 5th.
    conditions.push(lte(activityLog.createdAt, new Date(`${to}T23:59:59.999Z`)));
  }

  const where = and(...conditions);

  const [rows, totalRow, scopeTotalRow, actionFacets, typeFacets, auditFacets, members] =
    await Promise.all([
      db
        .select({
          id: activityLog.id,
          actorId: activityLog.actorId,
          actorEmail: activityLog.actorEmail,
          action: activityLog.action,
          targetType: activityLog.targetType,
          targetId: activityLog.targetId,
          auditId: activityLog.auditId,
          auditName: audits.name,
          metadata: activityLog.metadata,
          ip: activityLog.ip,
          createdAt: activityLog.createdAt,
        })
        .from(activityLog)
        .leftJoin(audits, eq(audits.id, activityLog.auditId))
        .where(where)
        .orderBy(desc(activityLog.createdAt))
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE),

      db.select({ total: count() }).from(activityLog).where(where),

      db.select({ total: count() }).from(activityLog).where(scope),

      db
        .select({ action: activityLog.action, total: count() })
        .from(activityLog)
        .where(scope)
        .groupBy(activityLog.action)
        .orderBy(activityLog.action)
        .limit(FACET_LIMIT),

      db
        .select({ targetType: activityLog.targetType, total: count() })
        .from(activityLog)
        .where(scope)
        .groupBy(activityLog.targetType)
        .orderBy(activityLog.targetType)
        .limit(FACET_LIMIT),

      db
        .selectDistinct({ id: audits.id, name: audits.name })
        .from(activityLog)
        .innerJoin(audits, eq(audits.id, activityLog.auditId))
        .where(scope)
        .orderBy(audits.name)
        .limit(FACET_LIMIT),

      listMembers(workspaceId),
    ]);

  const total = totalRow[0]?.total ?? 0;
  const scopeTotal = scopeTotalRow[0]?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const filtered = Boolean(actor || action || targetType || auditId || from || to);

  const emails = new Map(members.map((member) => [member.userId, member.email]));

  function pageHref(target: number): string {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      const single = firstParam(value);
      if (single && key !== "page") next.set(key, single);
    }
    if (target > 1) next.set("page", String(target));
    return next.size > 0
      ? `/w/${slug}/settings/activity?${next}`
      : `/w/${slug}/settings/activity`;
  }

  return (
    <>
      <PageHeader
        breadcrumb={[
          { label: "Settings", href: `/w/${slug}/settings` },
          { label: "Audit trail" },
        ]}
        title="Audit trail"
        description={
          <>
            Every action recorded in this workspace, newest first — who did it, what it
            touched, and the model and prompt version behind it. Entries are written by the
            server as work happens and are never edited or deleted from here.
          </>
        }
      />

      {/* A GET form, not a live filter: the resulting URL is the shareable record. */}
      <section aria-labelledby="activity-filters" className="border-b border-border bg-muted/30">
        <h2 id="activity-filters" className="sr-only">
          Filter the audit trail
        </h2>
        <form
          method="get"
          action={`/w/${slug}/settings/activity`}
          className="flex flex-wrap items-end gap-x-3 gap-y-2 px-4 py-3 md:px-6"
        >
          <div className="flex h-8 items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <RiFilterLine aria-hidden="true" className="size-3.5" />
            Filters
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="filter-actor" className="text-[11px] font-normal text-muted-foreground">
              Actor
            </Label>
            <NativeSelect
              id="filter-actor"
              name="actor"
              size="sm"
              className="w-44"
              defaultValue={actor ?? ""}
            >
              <NativeSelectOption value="">Everyone</NativeSelectOption>
              {members.map((member) => (
                <NativeSelectOption key={member.userId} value={member.userId}>
                  {member.email}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="flex flex-col gap-1">
            <Label
              htmlFor="filter-action"
              className="text-[11px] font-normal text-muted-foreground"
            >
              Action
            </Label>
            <NativeSelect
              id="filter-action"
              name="action"
              size="sm"
              className="w-52"
              defaultValue={action ?? ""}
            >
              <NativeSelectOption value="">Every action</NativeSelectOption>
              {actionFacets.map((facet) => (
                <NativeSelectOption key={facet.action} value={facet.action}>
                  {`${humanise(facet.action)} (${facet.total})`}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="filter-type" className="text-[11px] font-normal text-muted-foreground">
              Target type
            </Label>
            <NativeSelect
              id="filter-type"
              name="type"
              size="sm"
              className="w-40"
              defaultValue={targetType ?? ""}
            >
              <NativeSelectOption value="">Every type</NativeSelectOption>
              {typeFacets
                .filter((facet): facet is { targetType: string; total: number } =>
                  Boolean(facet.targetType),
                )
                .map((facet) => (
                  <NativeSelectOption key={facet.targetType} value={facet.targetType}>
                    {`${humaniseKey(facet.targetType)} (${facet.total})`}
                  </NativeSelectOption>
                ))}
            </NativeSelect>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="filter-audit" className="text-[11px] font-normal text-muted-foreground">
              Audit
            </Label>
            <NativeSelect
              id="filter-audit"
              name="audit"
              size="sm"
              className="w-52"
              defaultValue={auditId ?? ""}
            >
              <NativeSelectOption value="">Every audit</NativeSelectOption>
              {auditFacets.map((facet) => (
                <NativeSelectOption key={facet.id} value={facet.id}>
                  {facet.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="filter-from" className="text-[11px] font-normal text-muted-foreground">
              From
            </Label>
            <Input
              id="filter-from"
              name="from"
              type="date"
              className="h-7 w-36 text-sm"
              defaultValue={from ?? ""}
            />
          </div>

          <div className="flex flex-col gap-1">
            <Label htmlFor="filter-to" className="text-[11px] font-normal text-muted-foreground">
              To
            </Label>
            <Input
              id="filter-to"
              name="to"
              type="date"
              className="h-7 w-36 text-sm"
              defaultValue={to ?? ""}
            />
          </div>

          <Button type="submit" size="sm" className="h-7">
            Apply
          </Button>

          {filtered ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7"
              render={<Link href={`/w/${slug}/settings/activity`} />}
            >
              Clear filters
            </Button>
          ) : null}
        </form>
      </section>

      <main className="flex flex-1 flex-col gap-4 px-4 py-5 md:px-6">
        {rows.length === 0 ? (
          <Empty className="border border-dashed border-border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <RiHistoryLine aria-hidden="true" />
              </EmptyMedia>
              <EmptyTitle>
                {scopeTotal > 0 ? "No entry matches these filters" : "Nothing has been recorded yet"}
              </EmptyTitle>
              <EmptyDescription>
                {scopeTotal > 0
                  ? `${scopeTotal.toLocaleString("en-GB")} entries exist in this workspace. Widen the filters — or the date range — to find them.`
                  : "The trail fills itself as work happens: creating an audit, running it, exporting it, changing a role. Nothing here is written by hand."}
              </EmptyDescription>
            </EmptyHeader>
            {scopeTotal > 0 ? (
              <EmptyContent>
                <Button variant="outline" render={<Link href={`/w/${slug}/settings/activity`} />}>
                  Clear filters
                </Button>
              </EmptyContent>
            ) : null}
          </Empty>
        ) : (
          <>
            <p aria-live="polite" className="text-xs text-muted-foreground">
              {total.toLocaleString("en-GB")} entr{total === 1 ? "y" : "ies"}
              {filtered ? ` of ${scopeTotal.toLocaleString("en-GB")}` : ""}
              {pageCount > 1 ? ` · page ${page} of ${pageCount}` : ""}
            </p>

            <div className="overflow-x-auto rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">When</TableHead>
                    <TableHead className="w-44">Actor</TableHead>
                    <TableHead className="w-52">Action</TableHead>
                    <TableHead className="w-56">Target</TableHead>
                    <TableHead className="min-w-64">Recorded detail</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const when = timestamp(row.createdAt);
                    const email = row.actorEmail ?? (row.actorId ? emails.get(row.actorId) : null);
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="align-top">
                          <time dateTime={when.iso} className="text-xs tabular-nums">
                            <span className="block font-medium">{when.date}</span>
                            <span className="block text-muted-foreground">{when.time}</span>
                          </time>
                        </TableCell>

                        <TableCell className="align-top text-xs">
                          {email ? (
                            <>
                              <span className="block font-medium" title={email}>
                                {displayName(email)}
                              </span>
                              <span className="block truncate text-muted-foreground">{email}</span>
                            </>
                          ) : (
                            <span className="text-muted-foreground" title="Recorded with no signed-in actor — a background job or a deleted user.">
                              System
                            </span>
                          )}
                          {row.ip ? (
                            <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                              {row.ip}
                            </span>
                          ) : null}
                        </TableCell>

                        <TableCell className="align-top">
                          <span className="block text-xs font-medium">{humanise(row.action)}</span>
                          <code className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                            {row.action}
                          </code>
                        </TableCell>

                        <TableCell className="align-top text-xs">
                          {row.targetType ? (
                            <Badge variant="secondary">{humaniseKey(row.targetType)}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                          {row.auditId && row.auditName ? (
                            <Link
                              href={`/w/${slug}/audits/${row.auditId}`}
                              className="mt-1 block max-w-56 truncate underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            >
                              {row.auditName}
                            </Link>
                          ) : null}
                          {row.targetId ? (
                            <code className="mt-0.5 block font-mono text-[11px] break-all text-muted-foreground">
                              {row.targetId}
                            </code>
                          ) : null}
                        </TableCell>

                        <TableCell className="align-top">
                          <MetadataList metadata={row.metadata} />
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
      </main>
    </>
  );
}
