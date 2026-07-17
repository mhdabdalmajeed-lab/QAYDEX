"use client";

import { useActionState, useId, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  RiAddCircleLine,
  RiAddLine,
  RiEqualLine,
  RiExchangeLine,
  RiIndeterminateCircleLine,
  RiLoader4Line,
  type RemixiconComponentType,
} from "@remixicon/react";

import { SeverityMark } from "@/components/audit/badges";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { RISK_LABELS, type RiskLevel, type SeverityLevel } from "@/lib/audit-filters";
import { cn } from "@/lib/utils";
import { runAudit, type RunAuditState } from "@/server/actions/audit";

/**
 * Comparing two revisions (PRD §19.4, §23).
 *
 * Two revisions of the same audit can differ because the evidence changed, because the
 * instructions changed, or because the model did. This screen shows what actually differs and
 * — through the snapshots each revision froze at run time — what it differed *against*.
 *
 * The diff is computed on the server and passed in already resolved. This component owns the
 * two pickers and writes the choice back to the URL (`?a=<id>&b=<id>`), so a comparison is a
 * link an auditor can paste into a review note. Revision ids rather than numbers: the id is
 * what the row is, and it survives regardless of how the numbering is read.
 *
 * Every difference is stated with an icon and a word before any colour is applied — severity
 * and diff status must survive greyscale, print, and colour-blind vision (PRD §26.4).
 */

export type ComparableRevision = {
  id: string;
  revision: number;
  label: string;
};

/** The claim-type vocabulary of PRD §10.5, in the words a reader should see. */
export const CLAIM_TYPE_LABEL: Record<string, string> = {
  evidence_supported: "Evidence supported",
  reasonable_interpretation: "Reasonable interpretation",
  unverified_hypothesis: "Unverified hypothesis",
  missing_information: "Missing information",
  user_claim: "User claim",
  judgment_required: "Judgment required",
};

export type FindingSide = {
  title: string;
  severity: SeverityLevel;
  claimType: string;
  riskCategory: string;
};

export type FindingChange = "severity" | "claim_type" | "title";

export type FindingDiffRow = {
  /** `findings.key` — the model's stable identity for an issue across revisions. */
  key: string;
  status: "added" | "removed" | "changed" | "unchanged";
  a: FindingSide | null;
  b: FindingSide | null;
  changes: FindingChange[];
};

/** One line of an immutable snapshot, and whether the other revision froze it too. */
export type SnapshotDiffRow = {
  key: string;
  label: string;
  /** Version, row count, status — whatever identifies this entry precisely. */
  detailA: string | null;
  detailB: string | null;
  presence: "both" | "a_only" | "b_only";
  /** True when both revisions used the entry but froze a different version of it. */
  differs: boolean;
};

export type CompareSideSummary = {
  id: string;
  revision: number;
  summary: string | null;
  overallRisk: RiskLevel | null;
  findingCount: number;
  modelId: string | null;
  promptVersion: string | null;
  createdAt: string;
};

export type RevisionCompareProps = {
  options: ComparableRevision[];
  a: CompareSideSummary;
  b: CompareSideSummary;
  findings: FindingDiffRow[];
  instructions: SnapshotDiffRow[];
  inputs: SnapshotDiffRow[];
};

const DIFF_META: Record<
  FindingDiffRow["status"],
  { label: string; icon: RemixiconComponentType; className: string }
> = {
  added: {
    label: "Added",
    icon: RiAddCircleLine,
    className: "border-emerald-600/40 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300",
  },
  removed: {
    label: "Removed",
    icon: RiIndeterminateCircleLine,
    className: "border-border bg-muted text-muted-foreground",
  },
  changed: {
    label: "Changed",
    icon: RiExchangeLine,
    className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  unchanged: {
    label: "Unchanged",
    icon: RiEqualLine,
    className: "border-border bg-transparent text-muted-foreground",
  },
};

function DiffTag({ status }: { status: FindingDiffRow["status"] }) {
  const meta = DIFF_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium",
        meta.className,
      )}
    >
      <Icon aria-hidden="true" className="size-3.5 shrink-0" />
      {meta.label}
    </span>
  );
}

const CHANGE_LABEL: Record<FindingChange, string> = {
  severity: "severity",
  claim_type: "claim type",
  title: "title",
};

export function RevisionCompare({
  options,
  a,
  b,
  findings,
  instructions,
  inputs,
}: RevisionCompareProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const aId = useId();
  const bId = useId();

  function select(side: "a" | "b", value: string) {
    const next = new URLSearchParams({
      a: side === "a" ? value : a.id,
      b: side === "b" ? value : b.id,
    });
    startTransition(() => {
      router.replace(`${pathname}?${next.toString()}`, { scroll: false });
    });
  }

  const added = findings.filter((row) => row.status === "added").length;
  const removed = findings.filter((row) => row.status === "removed").length;
  const changed = findings.filter((row) => row.status === "changed").length;
  const identical = added + removed + changed === 0;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end gap-4 rounded-xl border border-border p-3">
        <div className="flex flex-col gap-1.5">
          <label htmlFor={aId} className="text-xs font-medium text-muted-foreground">
            Baseline
          </label>
          <NativeSelect
            id={aId}
            value={a.id}
            disabled={pending}
            onChange={(event) => select("a", event.target.value)}
          >
            {options.map((option) => (
              <NativeSelectOption key={option.id} value={option.id}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor={bId} className="text-xs font-medium text-muted-foreground">
            Compared with
          </label>
          <NativeSelect
            id={bId}
            value={b.id}
            disabled={pending}
            onChange={(event) => select("b", event.target.value)}
          >
            {options.map((option) => (
              <NativeSelectOption key={option.id} value={option.id}>
                {option.label}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>

        <p
          className="flex min-w-0 flex-1 items-center gap-2 text-xs text-muted-foreground"
          aria-live="polite"
        >
          {pending ? <Spinner aria-hidden="true" className="size-3.5" /> : null}
          {a.id === b.id
            ? "Pick two different revisions to see a difference."
            : identical
              ? `Revision ${a.revision} and revision ${b.revision} produced the same set of findings.`
              : `${added} added · ${removed} removed · ${changed} changed, against revision ${a.revision}.`}
        </p>
      </div>

      {/* ── Summary side by side ─────────────────────────────────────────── */}
      <section aria-labelledby="compare-summary-heading" className="flex flex-col gap-2">
        <h3 id="compare-summary-heading" className="font-heading text-sm font-semibold">
          What each revision concluded
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          {[a, b].map((side, index) => (
            <article
              key={side.id}
              className="flex flex-col gap-2 rounded-xl border border-border p-3"
              aria-label={`Revision ${side.revision}`}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-heading text-sm font-semibold tabular-nums">
                  Revision {side.revision}
                </span>
                <span className="text-xs text-muted-foreground">
                  {index === 0 ? "Baseline" : "Compared with"} · {side.createdAt}
                </span>
              </div>

              <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
                <dt className="text-muted-foreground">Overall risk</dt>
                <dd>{side.overallRisk ? RISK_LABELS[side.overallRisk] : "Not rated"}</dd>
                <dt className="text-muted-foreground">Findings</dt>
                <dd className="tabular-nums">{side.findingCount}</dd>
                <dt className="text-muted-foreground">Model</dt>
                <dd className="font-mono break-all">{side.modelId ?? "Not recorded"}</dd>
                <dt className="text-muted-foreground">Prompt</dt>
                <dd className="font-mono break-all">{side.promptVersion ?? "Not recorded"}</dd>
              </dl>

              <p className="text-sm whitespace-pre-line">
                {side.summary ?? (
                  <span className="text-muted-foreground">
                    This revision has no summary — it did not finish.
                  </span>
                )}
              </p>
            </article>
          ))}
        </div>
      </section>

      {/* ── Finding diff ─────────────────────────────────────────────────── */}
      <section aria-labelledby="compare-findings-heading" className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <h3 id="compare-findings-heading" className="font-heading text-sm font-semibold">
            Findings
          </h3>
          <p className="text-xs text-muted-foreground">
            Matched on the finding key the model assigns, not on wording. A finding counts as
            changed when its severity, claim type or title moved.
          </p>
        </div>

        {findings.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
            Neither revision recorded any findings.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {findings.map((row) => (
              <li key={row.key} className="rounded-xl border border-border p-3">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-col gap-0.5">
                    <span className="text-sm font-medium">
                      {row.b?.title ?? row.a?.title ?? row.key}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground break-all">
                      {row.key}
                    </span>
                  </div>
                  <DiffTag status={row.status} />
                </div>

                {row.changes.length > 0 ? (
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    {row.changes.map((change) => CHANGE_LABEL[change]).join(", ")} changed between
                    revision {a.revision} and revision {b.revision}.
                  </p>
                ) : null}

                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <FindingSideCell
                    heading={`Revision ${a.revision}`}
                    side={row.a}
                    changes={row.changes}
                    other={row.b}
                  />
                  <FindingSideCell
                    heading={`Revision ${b.revision}`}
                    side={row.b}
                    changes={row.changes}
                    other={row.a}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ── The snapshots each revision ran against ──────────────────────── */}
      <SnapshotSection
        id="compare-instructions"
        heading="Instructions each revision used"
        description="Frozen at run time. Changing an instruction in your library never reaches back into a revision that already ran."
        emptyLabel="Neither revision froze an instruction snapshot."
        rows={instructions}
        aRevision={a.revision}
        bRevision={b.revision}
      />

      <SnapshotSection
        id="compare-inputs"
        heading="Inputs each revision used"
        description="The exact evidence snapshot the run read. A later revision that re-imported the same connection is a different snapshot, and says so."
        emptyLabel="Neither revision froze an input snapshot."
        rows={inputs}
        aRevision={a.revision}
        bRevision={b.revision}
      />
    </div>
  );
}

/**
 * The one control on this page that changes anything.
 *
 * Everything else is a permanent record. Re-running never edits a published revision — it adds
 * the next one beside it — and the dialog says so in those words, because a reader who thinks
 * "create revision" means "overwrite" will avoid the button that makes the audit correct.
 */
export function NewRevisionButton({
  slug,
  auditId,
  nextRevision,
}: {
  slug: string;
  auditId: string;
  nextRevision: number;
}) {
  const [open, setOpen] = useState(false);
  const [state, formAction, pending] = useActionState<RunAuditState, FormData>(runAudit, {});
  const reasonId = useId();

  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        <RiAddLine className="size-4" aria-hidden="true" />
        Create a new revision
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <form action={formAction}>
            <DialogHeader>
              <DialogTitle>Create revision {nextRevision}</DialogTitle>
              <DialogDescription>
                Every revision below stays exactly as it is — none of them is overwritten. This
                runs the audit again against today&rsquo;s inputs and instructions, and publishes
                the result as revision {nextRevision}.
              </DialogDescription>
            </DialogHeader>

            <input type="hidden" name="auditId" value={auditId} />
            <input type="hidden" name="workspaceSlug" value={slug} />

            <div className="py-3">
              <Field>
                <FieldLabel htmlFor={reasonId}>Why are you re-running it?</FieldLabel>
                <Textarea
                  id={reasonId}
                  name="reason"
                  rows={3}
                  placeholder="e.g. Added the November bank statements."
                />
                <FieldDescription>
                  Optional, but it is what this history will show a reviewer in six months.
                </FieldDescription>
              </Field>
            </div>

            {state.error ? (
              <p aria-live="polite" className="mb-3 text-sm text-destructive">
                {state.error}
              </p>
            ) : null}

            <DialogFooter>
              <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
              <Button type="submit" disabled={pending}>
                {pending ? <RiLoader4Line className="size-4 animate-spin" aria-hidden="true" /> : null}
                Create revision
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function FindingSideCell({
  heading,
  side,
  changes,
  other,
}: {
  heading: string;
  side: FindingSide | null;
  changes: FindingChange[];
  other: FindingSide | null;
}) {
  if (!side) {
    return (
      <div className="rounded-lg border border-dashed border-border p-2.5">
        <p className="text-xs font-medium text-muted-foreground">{heading}</p>
        <p className="mt-1 text-xs text-muted-foreground">Not present in this revision.</p>
      </div>
    );
  }

  const severityMoved = changes.includes("severity") && other !== null;
  const claimMoved = changes.includes("claim_type") && other !== null;
  const titleMoved = changes.includes("title") && other !== null;

  return (
    <div className="rounded-lg border border-border p-2.5">
      <p className="text-xs font-medium text-muted-foreground">{heading}</p>
      <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        <dt className="text-muted-foreground">Severity</dt>
        <dd className={cn("flex items-center gap-1", severityMoved && "font-medium")}>
          <SeverityMark severity={side.severity} />
          {severityMoved ? <span className="sr-only">(changed)</span> : null}
        </dd>
        <dt className="text-muted-foreground">Claim type</dt>
        <dd className={cn(claimMoved && "font-medium underline decoration-dotted")}>
          {CLAIM_TYPE_LABEL[side.claimType] ?? side.claimType}
        </dd>
        <dt className="text-muted-foreground">Risk category</dt>
        <dd>{side.riskCategory}</dd>
        {titleMoved ? (
          <>
            <dt className="text-muted-foreground">Title</dt>
            <dd className="font-medium underline decoration-dotted">{side.title}</dd>
          </>
        ) : null}
      </dl>
    </div>
  );
}

function SnapshotSection({
  id,
  heading,
  description,
  emptyLabel,
  rows,
  aRevision,
  bRevision,
}: {
  id: string;
  heading: string;
  description: string;
  emptyLabel: string;
  rows: SnapshotDiffRow[];
  aRevision: number;
  bRevision: number;
}) {
  return (
    <section aria-labelledby={`${id}-heading`} className="flex flex-col gap-2">
      <div className="flex flex-col gap-1">
        <h3 id={`${id}-heading`} className="font-heading text-sm font-semibold">
          {heading}
        </h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      {rows.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          {emptyLabel}
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <caption className="sr-only">
              {heading}, comparing revision {aRevision} with revision {bRevision}
            </caption>
            <thead>
              <tr className="border-b border-border bg-muted/40 text-left">
                <th scope="col" className="px-3 py-2 text-xs font-medium">
                  Entry
                </th>
                <th scope="col" className="px-3 py-2 text-xs font-medium">
                  Revision {aRevision}
                </th>
                <th scope="col" className="px-3 py-2 text-xs font-medium">
                  Revision {bRevision}
                </th>
                <th scope="col" className="px-3 py-2 text-xs font-medium">
                  Difference
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const status: FindingDiffRow["status"] =
                  row.presence === "b_only"
                    ? "added"
                    : row.presence === "a_only"
                      ? "removed"
                      : row.differs
                        ? "changed"
                        : "unchanged";
                return (
                  <tr key={row.key} className="border-b border-border last:border-0 align-top">
                    <th scope="row" className="px-3 py-2 text-left text-sm font-medium">
                      {row.label}
                    </th>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {row.detailA ?? "—"}
                      {row.detailA === null ? <span className="sr-only">Not used</span> : null}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
                      {row.detailB ?? "—"}
                      {row.detailB === null ? <span className="sr-only">Not used</span> : null}
                    </td>
                    <td className="px-3 py-2">
                      <DiffTag status={status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
