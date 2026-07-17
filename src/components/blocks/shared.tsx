import {
  RiAlertLine,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiFileTextLine,
  RiInformationLine,
  RiQuestionLine,
  RiScales3Line,
  RiUserVoiceLine,
} from "@remixicon/react";
import type { ComponentType } from "react";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import type { EvidenceInput } from "@/lib/ai/blocks/primitives";
import type { ClaimType, Severity } from "@/lib/ai/blocks/types";
import { cn } from "@/lib/utils";

/**
 * The presentation vocabulary shared by all 55 block renderers.
 *
 * Two product rules live here rather than in each renderer, so no block can quietly opt out:
 *
 *  - **Severity is never colour alone** (PRD §26.4): every severity carries an icon and a word.
 *  - **A guess must never look like a fact** (PRD §10.5, §31): claim type is always visible, and
 *    anything not evidence-supported is visually marked as such.
 */

const SEVERITY_META: Record<
  Severity,
  { label: string; icon: ComponentType<{ className?: string }>; className: string }
> = {
  critical: {
    label: "Critical",
    icon: RiErrorWarningLine,
    className: "border-destructive/40 bg-destructive/10 text-destructive",
  },
  high: {
    label: "High",
    icon: RiAlertLine,
    className:
      "border-orange-500/40 bg-orange-500/10 text-orange-700 dark:text-orange-300",
  },
  medium: {
    label: "Medium",
    icon: RiAlertLine,
    className:
      "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  },
  low: {
    label: "Low",
    icon: RiInformationLine,
    className: "border-border bg-muted text-muted-foreground",
  },
  info: {
    label: "Info",
    icon: RiInformationLine,
    className: "border-border bg-muted text-muted-foreground",
  },
};

export function SeverityBadge({
  severity,
  className,
}: {
  severity: Severity;
  className?: string;
}) {
  const meta = SEVERITY_META[severity];
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
      <span>{meta.label}</span>
      <span className="sr-only">severity</span>
    </span>
  );
}

const CLAIM_META: Record<
  ClaimType,
  {
    label: string;
    icon: ComponentType<{ className?: string }>;
    explanation: string;
    /** Evidence-supported is the only "quiet" state; everything else must stand out. */
    tone: "solid" | "muted" | "warn";
  }
> = {
  evidence_supported: {
    label: "Evidence-supported",
    icon: RiCheckboxCircleLine,
    explanation: "Tied to a specific source in this audit's inputs.",
    tone: "solid",
  },
  reasonable_interpretation: {
    label: "Interpretation",
    icon: RiScales3Line,
    explanation:
      "A defensible reading of the evidence that goes beyond what the source states directly.",
    tone: "muted",
  },
  unverified_hypothesis: {
    label: "Unverified hypothesis",
    icon: RiQuestionLine,
    explanation: "Plausible but not tested against evidence. Treat as a lead, not a finding.",
    tone: "warn",
  },
  missing_information: {
    label: "Missing information",
    icon: RiErrorWarningLine,
    explanation: "The evidence needed to reach a conclusion was not available.",
    tone: "warn",
  },
  user_claim: {
    label: "Stated by user",
    icon: RiUserVoiceLine,
    explanation: "Provided as context by a user and not independently corroborated.",
    tone: "muted",
  },
  judgment_required: {
    label: "Judgment required",
    icon: RiScales3Line,
    explanation: "Requires a qualified professional's decision rather than an automated conclusion.",
    tone: "warn",
  },
};

export function ClaimBadge({ claimType, className }: { claimType: ClaimType; className?: string }) {
  const meta = CLAIM_META[claimType];
  const Icon = meta.icon;
  // A real <button>, not a <span>: Base UI's Tooltip.Trigger renders a button, and more
  // importantly the explanation must be reachable by keyboard. A non-focusable trigger makes
  // the claim type mouse-only, which is exactly the sort of thing PRD §26.4 rules out.
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className={cn(
              "inline-flex cursor-help items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              meta.tone === "solid" && "border-border bg-muted/60 text-muted-foreground",
              meta.tone === "muted" && "border-border bg-transparent text-muted-foreground",
              meta.tone === "warn" &&
                "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
              className,
            )}
          >
            <Icon className="size-3.5 shrink-0" aria-hidden />
            {meta.label}
          </button>
        }
      />
      <TooltipContent>{meta.explanation}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Turns a locator into the shorthand an auditor would write in a working paper,
 * e.g. "sheet Jan · rows 44-51" or "p.12".
 */
export function describeLocator(evidence: EvidenceInput): string {
  const parts: string[] = [];
  if (evidence.sheet) parts.push(`sheet ${evidence.sheet}`);
  if (evidence.page !== null && evidence.page !== undefined) parts.push(`p.${evidence.page}`);
  if (evidence.cell) parts.push(`cell ${evidence.cell}`);
  else if (evidence.rowFrom !== null && evidence.rowFrom !== undefined) {
    const to = evidence.rowTo;
    parts.push(to && to !== evidence.rowFrom ? `rows ${evidence.rowFrom}-${to}` : `row ${evidence.rowFrom}`);
  }
  if (evidence.section) parts.push(evidence.section);
  return parts.join(" · ");
}

export function EvidenceChips({
  evidence,
  className,
}: {
  evidence: EvidenceInput[];
  className?: string;
}) {
  if (!evidence || evidence.length === 0) return null;

  return (
    <ul className={cn("flex flex-wrap gap-1.5", className)} aria-label="Supporting evidence">
      {evidence.map((item, i) => {
        const locator = describeLocator(item);
        return (
          <li key={`${item.inputId}-${i}`}>
            <Tooltip>
              <TooltipTrigger
                render={
                  <button
                    type="button"
                    className="inline-flex max-w-[22rem] items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-0.5 text-xs text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
                  >
                    <RiFileTextLine className="size-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{item.label}</span>
                  </button>
                }
              />
              <TooltipContent className="max-w-sm">
                <div className="space-y-1">
                  <p className="font-medium">{item.label}</p>
                  {locator ? <p className="text-xs opacity-80">{locator}</p> : null}
                  {item.excerpt ? (
                    <p className="border-l-2 border-current/30 pl-2 text-xs italic opacity-80">
                      {item.excerpt}
                    </p>
                  ) : null}
                </div>
              </TooltipContent>
            </Tooltip>
          </li>
        );
      })}
    </ul>
  );
}

/**
 * A block asserting numbers with no citation is exactly what the platform promises not to
 * ship, so it is surfaced rather than hidden (PRD §6.2).
 */
export function MissingEvidenceNote({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "inline-flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300",
        className,
      )}
    >
      <RiErrorWarningLine className="size-3.5 shrink-0" aria-hidden />
      No supporting evidence was cited for this block.
    </p>
  );
}

export type ValueFormat = "text" | "number" | "currency" | "percent" | "date" | null;

export function formatMoney(amount: number, currency = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: Math.abs(amount) >= 1000 ? 0 : 2,
    }).format(amount);
  } catch {
    // An unknown/invalid ISO code must not blank out a financial figure.
    return `${currency} ${new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(amount)}`;
  }
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(value);
}

export function formatPercent(value: number): string {
  // Model output uses percentage points (12.5 means 12.5%), not fractions.
  return `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value)}%`;
}

export function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(date);
}

export function formatValue(
  value: string | number | boolean | null,
  format: ValueFormat = "text",
  currency = "USD",
): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";

  if (typeof value === "number") {
    switch (format) {
      case "currency":
        return formatMoney(value, currency);
      case "percent":
        return formatPercent(value);
      case "date":
        return formatDate(String(value));
      default:
        return formatNumber(value);
    }
  }

  if (format === "date") return formatDate(value);
  if (format === "currency" || format === "number" || format === "percent") {
    const parsed = Number(value);
    if (!Number.isNaN(parsed) && value.trim() !== "") return formatValue(parsed, format, currency);
  }
  return value;
}

/** Consistent chrome so 55 independently-authored blocks still read as one document. */
export function BlockShell({
  title,
  claim,
  actions,
  children,
  className,
  headingLevel = 3,
}: {
  title: string;
  claim?: React.ReactNode;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  headingLevel?: 2 | 3 | 4;
}) {
  const Heading = `h${headingLevel}` as "h2" | "h3" | "h4";
  return (
    <section className={cn("rounded-xl border border-border bg-card p-5 text-card-foreground", className)}>
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <Heading className="text-base font-semibold leading-tight">{title}</Heading>
        <div className="flex shrink-0 items-center gap-2">
          {claim}
          {actions}
        </div>
      </header>
      {children}
    </section>
  );
}

/**
 * Screen-reader fallback for charts. recharts renders an SVG that conveys nothing to
 * assistive tech, so every chart ships the same numbers as a real table (PRD §26.4).
 */
export function ChartDataTable({
  caption,
  columns,
  rows,
}: {
  caption: string;
  columns: string[];
  rows: (string | number)[][];
}) {
  return (
    <table className="sr-only">
      <caption>{caption}</caption>
      <thead>
        <tr>
          {columns.map((c) => (
            <th key={c} scope="col">
              {c}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td key={j}>{typeof cell === "number" ? formatNumber(cell) : cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

export { Badge };
