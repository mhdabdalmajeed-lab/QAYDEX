import { and, asc, count, eq, inArray } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import {
  RiArrowLeftLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiDraftLine,
  RiErrorWarningLine,
  RiHistoryLine,
  RiLoader4Line,
  RiLock2Line,
  RiShieldCheckLine,
  type RemixiconComponentType,
} from "@remixicon/react";

import { RiskBadge, formatDateTime } from "@/components/audit/meta";
import {
  NewRevisionButton,
  RevisionCompare,
  type ComparableRevision,
  type CompareSideSummary,
  type FindingChange,
  type FindingDiffRow,
  type FindingSide,
  type SnapshotDiffRow,
} from "@/components/audit/revision-compare";
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
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { db } from "@/db";
import { findings } from "@/db/schema";
import type { SeverityLevel } from "@/lib/audit-filters";
import { getAuditContext, listRevisions, type RevisionRow } from "@/server/queries/audit";

/**
 * Revision history and comparison (PRD §19.4, §23).
 *
 * The point of this page is one product claim, made legible: **a completed revision is a
 * permanent record**. Re-running an audit never rewrites what a reviewer already read — it
 * produces a new revision beside it, and both stay readable forever. That is reproducibility,
 * not a limitation: six months from now, the exact model id, prompt version, schema version,
 * instruction versions and input snapshot that produced a given conclusion are all still here
 * to be pointed at.
 *
 * Everything rendered comes from what the run actually froze. Where a run did not record
 * something, the page says so rather than inventing a plausible value.
 */

type PageProps = {
  params: Promise<{ slug: string; id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug, id } = await params;
  const { audit } = await getAuditContext(slug, id);
  return { title: `Revisions · ${audit.name}` };
}

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

/* -------------------------------------------------------------------------- */
/* Revision status                                                            */
/* -------------------------------------------------------------------------- */

type RevisionStatus = RevisionRow["status"];

const REVISION_STATUS_META: Record<
  RevisionStatus,
  { label: string; icon: RemixiconComponentType; className: string }
> = {
  draft: {
    label: "Draft",
    icon: RiDraftLine,
    className: "border-border bg-muted text-muted-foreground",
  },
  processing: {
    label: "Processing",
    icon: RiLoader4Line,
    className: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
  },
  completed: {
    label: "Completed",
    icon: RiCheckboxCircleLine,
    className: "border-border bg-muted text-foreground",
  },
  failed: {
    label: "Failed",
    icon: RiCloseCircleLine,
    className: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  approved: {
    label: "Approved",
    icon: RiShieldCheckLine,
    className: "border-emerald-600/40 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300",
  },
};

function RevisionStatusBadge({ status }: { status: RevisionStatus }) {
  const meta = REVISION_STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${meta.className}`}
    >
      <Icon
        className={`size-3.5 shrink-0 ${status === "processing" ? "animate-spin" : ""}`}
        aria-hidden="true"
      />
      <span className="sr-only">Status: </span>
      {meta.label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Diff construction                                                          */
/* -------------------------------------------------------------------------- */

const SEVERITY_ORDER: Record<SeverityLevel, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  info: 4,
};

const DIFF_ORDER: Record<FindingDiffRow["status"], number> = {
  added: 0,
  changed: 1,
  removed: 2,
  unchanged: 3,
};

type FindingRecord = {
  key: string;
  title: string;
  severity: SeverityLevel;
  claimType: string;
  riskCategory: string;
};

/**
 * The per-finding diff, keyed on `findings.key` — the model's stable identity for an issue.
 *
 * Matching on the key rather than on wording is what makes "the same problem, now high
 * severity" distinguishable from "a new problem". Wording drifts between runs by design
 * (PRD §23: consistency of process and evidence, not identical wording).
 */
function diffFindings(
  aRows: FindingRecord[],
  bRows: FindingRecord[],
): FindingDiffRow[] {
  const aByKey = new Map(aRows.map((row) => [row.key, row]));
  const bByKey = new Map(bRows.map((row) => [row.key, row]));
  const keys = new Set([...aByKey.keys(), ...bByKey.keys()]);

  const rows: FindingDiffRow[] = [];
  for (const key of keys) {
    const a = aByKey.get(key) ?? null;
    const b = bByKey.get(key) ?? null;

    const sideA: FindingSide | null = a
      ? { title: a.title, severity: a.severity, claimType: a.claimType, riskCategory: a.riskCategory }
      : null;
    const sideB: FindingSide | null = b
      ? { title: b.title, severity: b.severity, claimType: b.claimType, riskCategory: b.riskCategory }
      : null;

    if (!a && b) {
      rows.push({ key, status: "added", a: null, b: sideB, changes: [] });
      continue;
    }
    if (a && !b) {
      rows.push({ key, status: "removed", a: sideA, b: null, changes: [] });
      continue;
    }
    if (!a || !b) continue;

    const changes: FindingChange[] = [];
    if (a.severity !== b.severity) changes.push("severity");
    if (a.claimType !== b.claimType) changes.push("claim_type");
    if (a.title !== b.title) changes.push("title");

    rows.push({
      key,
      status: changes.length > 0 ? "changed" : "unchanged",
      a: sideA,
      b: sideB,
      changes,
    });
  }

  // Whatever moved comes first, worst severity first inside each group. An auditor opening this
  // page wants the deltas, not an alphabetical list.
  return rows.sort((x, y) => {
    const byStatus = DIFF_ORDER[x.status] - DIFF_ORDER[y.status];
    if (byStatus !== 0) return byStatus;
    const xs = x.b?.severity ?? x.a?.severity;
    const ys = y.b?.severity ?? y.a?.severity;
    const bySeverity = (xs ? SEVERITY_ORDER[xs] : 9) - (ys ? SEVERITY_ORDER[ys] : 9);
    if (bySeverity !== 0) return bySeverity;
    return x.key.localeCompare(y.key);
  });
}

/** Instruction snapshots, matched on the instruction identity each run froze. */
function diffInstructions(a: RevisionRow, b: RevisionRow): SnapshotDiffRow[] {
  const identify = (entry: RevisionRow["instructionSnapshot"][number]) =>
    entry.instructionId ?? `${entry.source}:${entry.name}`;

  const describe = (entry: RevisionRow["instructionSnapshot"][number]) => {
    const parts: string[] = [];
    parts.push(entry.version === undefined ? "version not recorded" : `v${entry.version}`);
    if (entry.mandatory) parts.push("mandatory");
    return parts.join(" · ");
  };

  const aByKey = new Map(a.instructionSnapshot.map((entry) => [identify(entry), entry]));
  const bByKey = new Map(b.instructionSnapshot.map((entry) => [identify(entry), entry]));
  const keys = new Set([...aByKey.keys(), ...bByKey.keys()]);

  return [...keys]
    .map((key): SnapshotDiffRow => {
      const entryA = aByKey.get(key);
      const entryB = bByKey.get(key);
      const label = entryB?.name ?? entryA?.name ?? key;
      return {
        key,
        label,
        detailA: entryA ? describe(entryA) : null,
        detailB: entryB ? describe(entryB) : null,
        presence: entryA && entryB ? "both" : entryA ? "a_only" : "b_only",
        differs: Boolean(
          entryA &&
            entryB &&
            (entryA.instructionVersionId !== entryB.instructionVersionId ||
              entryA.version !== entryB.version ||
              entryA.text !== entryB.text),
        ),
      };
    })
    .sort((x, y) => x.label.localeCompare(y.label));
}

/** Input snapshots, matched on the input each run read. */
function diffInputs(a: RevisionRow, b: RevisionRow): SnapshotDiffRow[] {
  const describe = (entry: RevisionRow["inputSnapshot"][number]) => {
    const parts: string[] = [entry.status];
    if (entry.rowCount !== undefined) {
      parts.push(`${entry.rowCount.toLocaleString()} row${entry.rowCount === 1 ? "" : "s"}`);
    }
    if (entry.documentIds.length > 0) {
      parts.push(
        `${entry.documentIds.length} document${entry.documentIds.length === 1 ? "" : "s"}`,
      );
    }
    parts.push(entry.checksum ? `checksum ${entry.checksum.slice(0, 12)}` : "no checksum recorded");
    return parts.join(" · ");
  };

  const aByKey = new Map(a.inputSnapshot.map((entry) => [entry.inputId, entry]));
  const bByKey = new Map(b.inputSnapshot.map((entry) => [entry.inputId, entry]));
  const keys = new Set([...aByKey.keys(), ...bByKey.keys()]);

  return [...keys]
    .map((key): SnapshotDiffRow => {
      const entryA = aByKey.get(key);
      const entryB = bByKey.get(key);
      const label = entryB?.name ?? entryA?.name ?? key;
      return {
        key,
        label,
        detailA: entryA ? describe(entryA) : null,
        detailB: entryB ? describe(entryB) : null,
        presence: entryA && entryB ? "both" : entryA ? "a_only" : "b_only",
        // Two runs over "the same" file are only the same evidence if the bytes matched. An
        // unrecorded checksum is not proof of sameness, so it is never treated as one.
        differs: Boolean(
          entryA &&
            entryB &&
            (entryA.checksum !== entryB.checksum ||
              entryA.rowCount !== entryB.rowCount ||
              entryA.status !== entryB.status),
        ),
      };
    })
    .sort((x, y) => x.label.localeCompare(y.label));
}

/* -------------------------------------------------------------------------- */
/* Page                                                                       */
/* -------------------------------------------------------------------------- */

export default async function RevisionsPage({ params, searchParams }: PageProps) {
  const { slug, id } = await params;
  const query = await searchParams;
  const { audit, workspace, can } = await getAuditContext(slug, id);

  const revisions = await listRevisions(workspace.id, audit.id);
  const base = `/w/${slug}/audits/${audit.id}`;
  const canRun = can("audits.run");

  const header = (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 flex-col gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="-ml-2 h-7 w-fit text-muted-foreground"
          render={<Link href={base} />}
        >
          <RiArrowLeftLine className="size-4" aria-hidden="true" />
          Back to {audit.name}
        </Button>
        <div className="flex min-w-0 items-center gap-1.5">
          <SidebarTrigger className="-ml-1.5 shrink-0 text-muted-foreground" />
          <h1 className="font-heading text-xl font-semibold">Revision history</h1>
        </div>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Each run of this audit is published as its own revision and then left alone. Nothing here
          is edited or regenerated in place, so the conclusion a reviewer signed off on can always
          be reproduced — with the exact model, prompt, instructions and evidence that produced it.
        </p>
      </div>
      {canRun ? (
        <NewRevisionButton
          slug={slug}
          auditId={audit.id}
          nextRevision={(revisions[0]?.revision ?? 0) + 1}
        />
      ) : null}
    </div>
  );

  if (revisions.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
        {header}
        <Empty className="border border-dashed border-border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <RiHistoryLine aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>This audit has never been run</EmptyTitle>
            <EmptyDescription>
              There is nothing to compare yet. The first run publishes revision 1; every later run
              adds another beside it rather than replacing it.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" render={<Link href={base} />}>
              Open the audit
            </Button>
          </EmptyContent>
        </Empty>
      </main>
    );
  }

  /* ── Which two revisions are we comparing? ─────────────────────────────── */

  const byId = new Map(revisions.map((revision) => [revision.id, revision]));
  const requestedB = first(query.b);
  const requestedA = first(query.a);
  const b = (requestedB && byId.get(requestedB)) || revisions[0];
  const a = (requestedA && byId.get(requestedA)) || revisions[1] || revisions[0];

  /* ── Findings for both sides. Drizzle bypasses RLS: scope by workspace. ── */

  const revisionIds = a.id === b.id ? [a.id] : [a.id, b.id];
  const findingRows = await db
    .select({
      revisionId: findings.revisionId,
      key: findings.key,
      title: findings.title,
      severity: findings.severity,
      claimType: findings.claimType,
      riskCategory: findings.riskCategory,
    })
    .from(findings)
    .where(
      and(
        eq(findings.workspaceId, workspace.id),
        eq(findings.auditId, audit.id),
        inArray(findings.revisionId, revisionIds),
      ),
    )
    .orderBy(asc(findings.position));

  const forRevision = (revisionId: string): FindingRecord[] =>
    findingRows
      .filter((row) => row.revisionId === revisionId)
      .map((row) => ({
        key: row.key,
        title: row.title,
        severity: row.severity,
        claimType: row.claimType,
        riskCategory: row.riskCategory,
      }));

  const aFindings = forRevision(a.id);
  const bFindings = forRevision(b.id);

  // Finding counts for *every* revision, not just the compared pair — the list above states one
  // per row. Counted in the database rather than by fetching every finding of every revision.
  const countRows = await db
    .select({ revisionId: findings.revisionId, total: count() })
    .from(findings)
    .where(and(eq(findings.workspaceId, workspace.id), eq(findings.auditId, audit.id)))
    .groupBy(findings.revisionId);
  const countByRevision = new Map(countRows.map((row) => [row.revisionId, row.total]));

  const options: ComparableRevision[] = revisions.map((revision) => ({
    id: revision.id,
    revision: revision.revision,
    label: `Revision ${revision.revision} · ${REVISION_STATUS_META[revision.status].label} · ${
      formatDateTime(revision.createdAt) ?? "date not recorded"
    }`,
  }));

  const side = (revision: RevisionRow): CompareSideSummary => ({
    id: revision.id,
    revision: revision.revision,
    summary: revision.summary,
    overallRisk: revision.overallRisk,
    findingCount: countByRevision.get(revision.id) ?? 0,
    modelId: revision.modelId,
    promptVersion: revision.promptVersion,
    createdAt: formatDateTime(revision.createdAt) ?? "Date not recorded",
  });

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-8 p-4 md:p-6">
      {header}

      {/* ── The record ─────────────────────────────────────────────────────── */}
      <section aria-labelledby="revision-list-heading" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-baseline gap-2">
          <h2 id="revision-list-heading" className="font-heading text-base font-semibold">
            All revisions
          </h2>
          <span className="text-xs text-muted-foreground tabular-nums">
            {revisions.length} revision{revisions.length === 1 ? "" : "s"}, newest first
          </span>
        </div>

        <ul className="flex flex-col gap-3">
          {revisions.map((revision) => (
            <li key={revision.id}>
              <RevisionCard
                revision={revision}
                base={base}
                findingCount={countByRevision.get(revision.id) ?? 0}
                isCurrent={revision.id === audit.currentRevisionId}
              />
            </li>
          ))}
        </ul>
      </section>

      <Separator />

      {/* ── The comparison ─────────────────────────────────────────────────── */}
      <section aria-labelledby="compare-heading" className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <h2 id="compare-heading" className="font-heading text-base font-semibold">
            Compare two revisions
          </h2>
          <p className="max-w-3xl text-sm text-muted-foreground">
            Two revisions of the same audit can differ because the evidence changed, because the
            instructions changed, or because the model did. Each revision froze all three at run
            time, so the difference below is attributable rather than mysterious.
          </p>
        </div>

        {revisions.length === 1 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            There is only one revision so far. Comparison becomes available once a second run has
            published revision 2 — the first stays untouched.
          </p>
        ) : (
          <RevisionCompare
            options={options}
            a={side(a)}
            b={side(b)}
            findings={diffFindings(aFindings, bFindings)}
            instructions={diffInstructions(a, b)}
            inputs={diffInputs(a, b)}
          />
        )}
      </section>
    </main>
  );
}

/* -------------------------------------------------------------------------- */
/* One revision, stated in full                                               */
/* -------------------------------------------------------------------------- */

function RevisionCard({
  revision,
  base,
  findingCount,
  isCurrent,
}: {
  revision: RevisionRow;
  base: string;
  findingCount: number;
  isCurrent: boolean;
}) {
  const quality = revision.qualityReview;

  return (
    <article
      className="flex flex-col gap-3 rounded-xl border border-border p-4"
      aria-labelledby={`revision-${revision.id}-heading`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <h3
          id={`revision-${revision.id}-heading`}
          className="font-heading text-sm font-semibold tabular-nums"
        >
          Revision {revision.revision}
        </h3>
        <RevisionStatusBadge status={revision.status} />
        <RiskBadge risk={revision.overallRisk ?? "none"} />
        {isCurrent ? <Badge variant="secondary">Shown on the audit</Badge> : null}
        {revision.immutable ? (
          <span
            className="inline-flex items-center gap-1 text-xs text-muted-foreground"
            title="Published. Nothing in this revision can change."
          >
            <RiLock2Line className="size-3.5 shrink-0" aria-hidden="true" />
            Permanent record
          </span>
        ) : null}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {countLabel(revision, findingCount)}
        </span>
        <Button
          variant="outline"
          size="sm"
          render={<Link href={`${base}?revision=${revision.id}`} />}
        >
          Open
          <span className="sr-only"> revision {revision.revision}</span>
        </Button>
      </div>

      {revision.summary ? (
        <p className="text-sm whitespace-pre-line">{revision.summary}</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          No summary was recorded for this revision.
        </p>
      )}

      <div className="rounded-lg border border-border bg-muted/30 p-3">
        <p className="text-xs font-medium text-muted-foreground">Why this run happened</p>
        <p className="mt-0.5 text-sm">
          {revision.reason ?? (
            <span className="text-muted-foreground">
              No reason was given when this run was started.
            </span>
          )}
        </p>
      </div>

      {/* Provenance: PRD §23 requires every one of these to be stored, so every one is shown. */}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3 lg:grid-cols-4">
        <Fact label="Created by" value={revision.createdByEmail} />
        <Fact label="Created at" value={formatDateTime(revision.createdAt)} />
        <Fact
          label="Completed at"
          value={formatDateTime(revision.completedAt)}
          absent={
            revision.status === "processing" ? "Still running" : "Never completed"
          }
        />
        <Fact label="Approved at" value={formatDateTime(revision.approvedAt)} absent="Not approved" />
        <Fact label="Model" value={revision.modelId} mono />
        <Fact label="Prompt version" value={revision.promptVersion} mono />
        <Fact label="Output schema" value={revision.schemaVersion} mono />
        <Fact
          label="Instructions frozen"
          value={
            revision.instructionSnapshot.length > 0
              ? `${revision.instructionSnapshot.length} instruction${
                  revision.instructionSnapshot.length === 1 ? "" : "s"
                }`
              : null
          }
          absent="None recorded"
        />
        <Fact
          label="Inputs frozen"
          value={
            revision.inputSnapshot.length > 0
              ? `${revision.inputSnapshot.length} input${revision.inputSnapshot.length === 1 ? "" : "s"}`
              : null
          }
          absent="None recorded"
        />
      </dl>

      {/* Quality review is never colour-only: icon + word + score. */}
      <div className="flex items-start gap-2 rounded-lg border border-border p-2.5">
        {quality ? (
          quality.passed ? (
            <RiCheckboxCircleLine
              className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
          ) : (
            <RiErrorWarningLine className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden="true" />
          )
        ) : (
          <RiErrorWarningLine
            className="mt-0.5 size-4 shrink-0 text-muted-foreground"
            aria-hidden="true"
          />
        )}
        <div className="min-w-0">
          <p className="text-xs font-medium">
            {quality
              ? `Quality review ${quality.passed ? "passed" : "failed"} · score ${quality.score}`
              : "No quality review was recorded"}
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {quality
              ? quality.summary
              : "Treat this revision's findings as unchecked by the platform."}
          </p>
        </div>
      </div>
    </article>
  );
}

/**
 * "0 findings" reads as a clean result. On a run that never finished it is an artefact of the
 * run stopping, so an unfinished revision says why it has none rather than reporting a number
 * that would be read as an all-clear.
 */
function countLabel(revision: RevisionRow, findingCount: number): string {
  if (findingCount === 0) {
    if (revision.status === "processing") return "Findings not published yet";
    if (revision.status === "failed") return "No findings — the run did not finish";
    if (revision.status === "draft") return "Not run yet";
  }
  return `${findingCount} finding${findingCount === 1 ? "" : "s"}`;
}

function Fact({
  label,
  value,
  absent = "Not recorded",
  mono,
}: {
  label: string;
  value: string | null | undefined;
  absent?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={
          value
            ? mono
              ? "font-mono break-all"
              : "break-words"
            : "text-muted-foreground"
        }
      >
        {value ?? absent}
      </dd>
    </div>
  );
}
