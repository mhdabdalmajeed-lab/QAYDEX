import {
  RiAlertLine,
  RiArchiveLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiDraftLine,
  RiErrorWarningLine,
  RiEyeLine,
  RiInformationLine,
  RiLoader4Line,
  RiQuestionLine,
  RiShieldCheckLine,
  RiTimeLine,
  type RemixiconComponentType,
} from "@remixicon/react";

import { cn } from "@/lib/utils";

/**
 * The vocabulary the audit page uses to state facts about an audit.
 *
 * Every badge here pairs an icon and a word with its colour. Status and risk are the two things
 * a reader acts on, and colour alone is not readable to everyone (PRD §26.4) — nor does it
 * survive a printed export.
 */

export type AuditStatus =
  | "draft"
  | "queued"
  | "processing"
  | "needs_input"
  | "completed"
  | "review_needed"
  | "approved"
  | "failed"
  | "archived";

export type RiskLevel = "critical" | "high" | "medium" | "low" | "none";

const STATUS_META: Record<
  AuditStatus,
  { label: string; icon: RemixiconComponentType; className: string; hint: string }
> = {
  draft: {
    label: "Draft",
    icon: RiDraftLine,
    className: "border-border bg-muted text-muted-foreground",
    hint: "Not run yet.",
  },
  queued: {
    label: "Queued",
    icon: RiTimeLine,
    className: "border-border bg-muted text-muted-foreground",
    hint: "Waiting to start.",
  },
  processing: {
    label: "Processing",
    icon: RiLoader4Line,
    className: "border-sky-500/40 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    hint: "A run is in progress.",
  },
  needs_input: {
    label: "Needs input",
    icon: RiQuestionLine,
    className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    hint: "The audit cannot proceed without more evidence.",
  },
  completed: {
    label: "Completed",
    icon: RiCheckboxCircleLine,
    className: "border-border bg-muted text-foreground",
    hint: "A revision has been published.",
  },
  review_needed: {
    label: "Review needed",
    icon: RiEyeLine,
    className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    hint: "Waiting on a reviewer.",
  },
  approved: {
    label: "Approved",
    icon: RiShieldCheckLine,
    className: "border-emerald-600/40 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300",
    hint: "Signed off.",
  },
  failed: {
    label: "Failed",
    icon: RiCloseCircleLine,
    className: "border-destructive/40 bg-destructive/10 text-destructive",
    hint: "The last run did not finish.",
  },
  archived: {
    label: "Archived",
    icon: RiArchiveLine,
    className: "border-border bg-muted text-muted-foreground",
    hint: "Kept for the record, out of the working set.",
  },
};

export function AuditStatusBadge({
  status,
  className,
}: {
  status: AuditStatus;
  className?: string;
}) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        meta.className,
        className,
      )}
      title={meta.hint}
    >
      <Icon className={cn("size-3.5 shrink-0", status === "processing" && "animate-spin")} aria-hidden />
      <span className="sr-only">Status: </span>
      {meta.label}
    </span>
  );
}

const RISK_META: Record<
  RiskLevel,
  { label: string; icon: RemixiconComponentType; className: string }
> = {
  critical: {
    label: "Critical risk",
    icon: RiErrorWarningLine,
    className: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  high: {
    label: "High risk",
    icon: RiAlertLine,
    className: "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  },
  medium: {
    label: "Medium risk",
    icon: RiAlertLine,
    className: "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  low: {
    label: "Low risk",
    icon: RiInformationLine,
    className: "border-border bg-muted text-muted-foreground",
  },
  none: {
    label: "No risk rated",
    icon: RiInformationLine,
    className: "border-border bg-muted text-muted-foreground",
  },
};

export function RiskBadge({ risk, className }: { risk: RiskLevel; className?: string }) {
  const meta = RISK_META[risk];
  const Icon = meta.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
        meta.className,
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {meta.label}
    </span>
  );
}

const INPUT_STATUS_META: Record<
  "pending" | "parsing" | "parsed" | "failed" | "unsupported",
  { label: string; icon: RemixiconComponentType; className: string }
> = {
  pending: { label: "Queued", icon: RiTimeLine, className: "text-muted-foreground" },
  parsing: { label: "Parsing", icon: RiLoader4Line, className: "text-sky-700 dark:text-sky-300" },
  parsed: {
    label: "Parsed",
    icon: RiCheckboxCircleLine,
    className: "text-emerald-700 dark:text-emerald-300",
  },
  failed: { label: "Parse failed", icon: RiCloseCircleLine, className: "text-destructive" },
  unsupported: {
    label: "Not readable",
    icon: RiErrorWarningLine,
    className: "text-amber-700 dark:text-amber-300",
  },
};

export function InputStatusPill({
  status,
  className,
}: {
  status: "pending" | "parsing" | "parsed" | "failed" | "unsupported";
  className?: string;
}) {
  const meta = INPUT_STATUS_META[status];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs", meta.className, className)}>
      <Icon className={cn("size-3.5 shrink-0", status === "parsing" && "animate-spin")} aria-hidden />
      {meta.label}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Formatting                                                                 */
/* -------------------------------------------------------------------------- */

export function formatDay(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return typeof value === "string" ? value : null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export function formatDateTime(value: string | Date | null | undefined): string | null {
  if (!value) return null;
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(
    date,
  );
}

/** "Q2 2026", or the explicit range, or an honest "No period set". */
export function describePeriod(audit: {
  periodLabel: string | null;
  periodStart: string | null;
  periodEnd: string | null;
}): string {
  if (audit.periodLabel) return audit.periodLabel;
  const from = formatDay(audit.periodStart);
  const to = formatDay(audit.periodEnd);
  if (from && to) return `${from} – ${to}`;
  if (from) return `From ${from}`;
  if (to) return `Until ${to}`;
  return "No period set";
}

export function formatBytes(bytes: number | null): string | null {
  if (bytes === null || bytes === undefined) return null;
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[unit]}`;
}
