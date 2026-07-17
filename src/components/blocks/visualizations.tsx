"use client";

/**
 * Visualisation renderers for the generative audit interface (PRD §18).
 *
 * `"use client"` is mandatory in this file: recharts 3 does not server-render. Every chart
 * container therefore carries a fixed height, because it is blank until hydration and a
 * height-less container would collapse and then shove the page down.
 *
 * Two product rules are load-bearing here and are implemented in every block below:
 *
 *  - **Severity/interpretation is never colour alone** (PRD §26.4). Colour is decoration; the
 *    icon and the word carry the meaning. A chart tint always has a badge or a word beside it.
 *  - **A guess must never look like a fact** (PRD §10.5, §31). Anything that is not
 *    evidence-supported gets a dashed shell and an explicit notice, so an unverified hypothesis
 *    cannot be skim-read as a finding.
 *
 * Accessibility of charts: an SVG conveys nothing to assistive tech, so each chart is wrapped in
 * `role="img"` with a describing label, and the numbers behind it are always reachable as real
 * text — usually the visible table beneath the chart (auditors want the figures anyway), and
 * `ChartDataTable` (sr-only) wherever a series is not otherwise tabulated.
 */

import {
  RiAlertLine,
  RiArrowDownLine,
  RiArrowUpLine,
  RiCheckboxCircleLine,
  RiEditLine,
  RiErrorWarningLine,
  RiExchangeLine,
  RiFileTextLine,
  RiFlagLine,
  RiInformationLine,
  RiPauseCircleLine,
  RiShieldCheckLine,
  RiSubtractLine,
} from "@remixicon/react";
import type { ComponentType, CSSProperties, ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  ReferenceLine,
  XAxis,
  YAxis,
} from "recharts";

import {
  BlockShell,
  ChartDataTable,
  ClaimBadge,
  Empty,
  EvidenceChips,
  MissingEvidenceNote,
  SeverityBadge,
  formatMoney,
  formatValue,
} from "@/components/blocks/shared";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { EvidenceInput } from "@/lib/ai/blocks/primitives";
import type { BlockOf } from "@/lib/ai/blocks/schemas";
import type { ClaimType, Severity } from "@/lib/ai/blocks/types";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Local shared chrome                                                        */
/* -------------------------------------------------------------------------- */

type ValueFormat = "number" | "currency" | "percent";

/**
 * Claim types where the reader must not mistake the block for a settled finding. These get a
 * dashed shell plus a written notice — the badge alone is too easy to skip past.
 */
const HEDGED_CLAIMS: ReadonlySet<ClaimType> = new Set<ClaimType>([
  "unverified_hypothesis",
  "missing_information",
  "judgment_required",
]);

const HEDGE_NOTICE: Partial<Record<ClaimType, string>> = {
  unverified_hypothesis:
    "Unverified hypothesis: this pattern has not been tested against evidence. Treat it as a lead to investigate, not as a finding.",
  missing_information:
    "Missing information: the evidence needed to conclude was not available, so the figures below are incomplete.",
  judgment_required:
    "Judgment required: a qualified professional must decide this. Nothing below is an automated conclusion.",
};

function shellToneClass(claimType: ClaimType): string | undefined {
  return HEDGED_CLAIMS.has(claimType)
    ? "border-dashed border-amber-500/50 bg-amber-500/[0.03]"
    : undefined;
}

/** The written half of the claim signal. Renders nothing for evidence-supported blocks. */
function ClaimNotice({ claimType }: { claimType: ClaimType }) {
  const text = HEDGE_NOTICE[claimType];
  if (!text) return null;
  return (
    <p className="mb-4 flex items-start gap-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
      <RiErrorWarningLine className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>{text}</span>
    </p>
  );
}

/** Commentary + citations, in the same place on every block so the eye learns where to look. */
function BlockFooter({
  commentary,
  evidence,
}: {
  commentary: string | null;
  evidence: EvidenceInput[];
}) {
  return (
    <div className="mt-4 space-y-2 border-t border-border pt-3">
      {commentary ? <p className="text-sm leading-relaxed text-muted-foreground">{commentary}</p> : null}
      {evidence.length > 0 ? <EvidenceChips evidence={evidence} /> : <MissingEvidenceNote />}
    </div>
  );
}

/** A neutral, non-severity caution used for structural warnings (basis, breaches, dormancy). */
function Notice({
  icon: Icon = RiAlertLine,
  tone = "warn",
  children,
}: {
  icon?: ComponentType<{ className?: string }>;
  tone?: "warn" | "neutral";
  children: ReactNode;
}) {
  return (
    <p
      className={cn(
        "mb-4 flex items-start gap-2 rounded-md border px-3 py-2 text-xs",
        tone === "warn"
          ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
          : "border-border bg-muted/50 text-muted-foreground",
      )}
    >
      <Icon className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>{children}</span>
    </p>
  );
}

/** A compact labelled figure for the stat strips above the charts. */
function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string | null }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="truncate font-mono text-sm font-medium tabular-nums text-foreground">{value}</dd>
      {hint ? <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function StatStrip({ children }: { children: ReactNode }) {
  return (
    <dl className="mb-4 grid grid-cols-2 gap-4 rounded-lg border border-border bg-muted/30 px-4 py-3 sm:grid-cols-4">
      {children}
    </dl>
  );
}

const INTERPRETATION_META = {
  favourable: { label: "Favourable", icon: RiCheckboxCircleLine, className: "text-emerald-700 dark:text-emerald-300" },
  unfavourable: { label: "Unfavourable", icon: RiAlertLine, className: "text-destructive" },
  neutral: { label: "Neutral", icon: RiSubtractLine, className: "text-muted-foreground" },
} as const;

/** Interpretation is judgement, so it is always spelled out — never left to a red/green cell. */
function InterpretationTag({ value }: { value: keyof typeof INTERPRETATION_META }) {
  const meta = INTERPRETATION_META[value];
  const Icon = meta.icon;
  return (
    <span className={cn("inline-flex items-center gap-1 text-xs font-medium", meta.className)}>
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {meta.label}
    </span>
  );
}

/** Signed change with an arrow *and* the sign — the arrow is redundancy, not the message. */
function ChangeCell({ percent }: { percent: number | null }) {
  if (percent === null) {
    return <span className="text-muted-foreground">—</span>;
  }
  const Icon = percent > 0 ? RiArrowUpLine : percent < 0 ? RiArrowDownLine : RiSubtractLine;
  return (
    <span className="inline-flex items-center justify-end gap-1 font-mono tabular-nums">
      <Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      {percent > 0 ? "+" : ""}
      {formatValue(percent, "percent")}
    </span>
  );
}

/** Boolean risk flags read as words; the icon is there to be scannable, not to carry meaning. */
function FlagTag({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-200">
      <RiFlagLine className="size-3 shrink-0" aria-hidden />
      {label}
    </span>
  );
}

/**
 * Wraps a recharts tree. `role="img"` + a written label is the only thing assistive tech can use
 * from an SVG; the figures themselves always live in text elsewhere in the block.
 */
function Chart({
  label,
  config,
  className,
  children,
}: {
  label: string;
  config: ChartConfig;
  className?: string;
  children: React.ComponentProps<typeof ChartContainer>["children"];
}) {
  return (
    <div role="img" aria-label={label}>
      <ChartContainer config={config} className={cn("aspect-auto h-72 w-full", className)}>
        {children}
      </ChartContainer>
    </div>
  );
}

const TABLE_HEAD = "px-3 py-2 text-left text-xs font-medium text-muted-foreground";
const TABLE_HEAD_NUM = "px-3 py-2 text-right text-xs font-medium text-muted-foreground";
const TABLE_CELL = "px-3 py-2 text-sm";
const TABLE_CELL_NUM = "px-3 py-2 text-right font-mono text-sm tabular-nums";

function DataTable({ caption, children }: { caption: string; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. heatmap                                                                 */
/* -------------------------------------------------------------------------- */

/**
 * Intensity is a *secondary* cue: every cell also prints its value, and the legend states in
 * words what a hot cell means (schema: `intensityMeaning`).
 */
function heatStyle(
  value: number,
  min: number,
  max: number,
  scale: "sequential" | "diverging",
): CSSProperties {
  if (scale === "diverging") {
    const bound = Math.max(Math.abs(min), Math.abs(max)) || 1;
    const t = Math.min(Math.abs(value) / bound, 1);
    const token = value < 0 ? "var(--destructive)" : "var(--chart-3)";
    return { backgroundColor: `color-mix(in oklab, ${token} ${(t * 70).toFixed(1)}%, transparent)` };
  }
  const span = max - min || 1;
  const t = Math.min(Math.max((value - min) / span, 0), 1);
  return { backgroundColor: `color-mix(in oklab, var(--chart-3) ${(t * 70).toFixed(1)}%, transparent)` };
}

export function HeatmapBlock({ block }: { block: BlockOf<"heatmap"> }) {
  const values = block.rows.flat().filter((v): v is number => v !== null);
  const min = block.minValue ?? (values.length > 0 ? Math.min(...values) : 0);
  const max = block.maxValue ?? (values.length > 0 ? Math.max(...values) : 0);
  const fmt = (v: number) => formatValue(v, block.valueFormat, block.currency ?? undefined);

  return (
    <BlockShell
      title={block.title}
      claim={<ClaimBadge claimType={block.claimType} />}
      className={shellToneClass(block.claimType)}
    >
      <ClaimNotice claimType={block.claimType} />

      {values.length === 0 ? (
        <Empty>No values to plot.</Empty>
      ) : (
        <>
          {/* A real table, not a div grid: the data is the grid, so it should be navigable as one. */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full border-collapse">
              <caption className="sr-only">
                {block.title}. {block.intensityMeaning}
              </caption>
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th scope="col" className={cn(TABLE_HEAD, "sticky left-0 bg-muted/40")}>
                    <span className="sr-only">Row</span>
                  </th>
                  {block.xLabels.map((x) => (
                    <th key={x} scope="col" className={TABLE_HEAD_NUM}>
                      {x}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.yLabels.map((y, rowIndex) => (
                  <tr key={y} className="border-b border-border last:border-0">
                    <th scope="row" className={cn(TABLE_CELL, "sticky left-0 bg-card font-medium whitespace-nowrap")}>
                      {y}
                    </th>
                    {block.xLabels.map((x, colIndex) => {
                      const value = block.rows[rowIndex]?.[colIndex] ?? null;
                      return (
                        <td
                          key={x}
                          className={cn(TABLE_CELL_NUM, "border-l border-border/50 text-foreground")}
                          style={value === null ? undefined : heatStyle(value, min, max, block.colourScale)}
                        >
                          {value === null ? <span className="text-muted-foreground">—</span> : fmt(value)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-6 rounded-sm border border-border" style={heatStyle(min, min, max, block.colourScale)} />
              {fmt(min)}
              <span aria-hidden>→</span>
              <span className="h-3 w-6 rounded-sm border border-border" style={heatStyle(max, min, max, block.colourScale)} />
              {fmt(max)}
            </span>
            <span className="flex items-start gap-1.5">
              <RiInformationLine className="mt-px size-3.5 shrink-0" aria-hidden />
              {block.intensityMeaning}
            </span>
          </div>
        </>
      )}

      <BlockFooter commentary={block.commentary} evidence={block.evidence} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. risk_matrix                                                             */
/* -------------------------------------------------------------------------- */

const SEVERITY_CELL_TINT: Record<Severity, string> = {
  critical: "bg-destructive/10",
  high: "bg-orange-500/10",
  medium: "bg-amber-500/10",
  low: "bg-muted/40",
  info: "bg-muted/40",
};

const SEVERITY_RANK: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };

export function RiskMatrixBlock({ block }: { block: BlockOf<"risk_matrix"> }) {
  // Highest likelihood at the top, lowest impact at the left — the conventional reading order.
  const likelihoods = [...block.likelihoodAxis].sort((a, b) => b.level - a.level);
  const impacts = [...block.impactAxis].sort((a, b) => a.level - b.level);

  return (
    <BlockShell
      title={block.title}
      claim={<ClaimBadge claimType={block.claimType} />}
      className={shellToneClass(block.claimType)}
    >
      <ClaimNotice claimType={block.claimType} />

      {block.items.length === 0 ? (
        <Empty>No risks were plotted.</Empty>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full border-collapse">
              <caption className="sr-only">
                {block.title}: risks plotted by likelihood against impact. {block.scoringNote}
              </caption>
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th scope="col" className={TABLE_HEAD}>
                    Likelihood \ Impact
                  </th>
                  {impacts.map((impact) => (
                    <th key={impact.level} scope="col" className={TABLE_HEAD}>
                      <span className="block">{impact.label}</span>
                      {impact.monetaryThreshold !== null ? (
                        <span className="block font-mono text-[11px] font-normal tabular-nums">
                          ≥ {formatMoney(impact.monetaryThreshold, block.currency ?? undefined)}
                        </span>
                      ) : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {likelihoods.map((likelihood) => (
                  <tr key={likelihood.level} className="border-b border-border last:border-0">
                    <th scope="row" className={cn(TABLE_CELL, "whitespace-nowrap font-medium")}>
                      {likelihood.label}
                    </th>
                    {impacts.map((impact) => {
                      const cellItems = block.items.filter(
                        (item) => item.likelihood === likelihood.level && item.impact === impact.level,
                      );
                      // Tint follows the worst risk in the cell; each chip still states its own rating.
                      const worst = cellItems.reduce<Severity | null>(
                        (acc, item) =>
                          acc === null || SEVERITY_RANK[item.severity] > SEVERITY_RANK[acc] ? item.severity : acc,
                        null,
                      );
                      return (
                        <td
                          key={impact.level}
                          className={cn(
                            "border-l border-border/50 px-2 py-2 align-top",
                            worst ? SEVERITY_CELL_TINT[worst] : undefined,
                          )}
                        >
                          {cellItems.length === 0 ? (
                            <span className="sr-only">No risks</span>
                          ) : (
                            <ul className="space-y-1">
                              {cellItems.map((item, i) => (
                                <li
                                  key={`${item.label}-${i}`}
                                  className="rounded border border-border/60 bg-card px-1.5 py-1 text-xs"
                                >
                                  <span className="font-medium">{item.label}</span>
                                  {item.findingRef ? (
                                    <span className="ml-1 font-mono text-[11px] text-muted-foreground">
                                      {item.findingRef}
                                    </span>
                                  ) : null}
                                  <SeverityBadge severity={item.severity} className="mt-1 flex w-fit" />
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {block.items.some((item) => item.note) ? (
            <ul className="mt-3 space-y-1.5">
              {block.items
                .filter((item) => item.note)
                .map((item, i) => (
                  <li key={`${item.label}-note-${i}`} className="flex gap-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">{item.label}</span>
                    <span>{item.note}</span>
                  </li>
                ))}
            </ul>
          ) : null}

          <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
            <RiInformationLine className="mt-px size-3.5 shrink-0" aria-hidden />
            {block.scoringNote}
          </p>
        </>
      )}

      <BlockFooter commentary={block.commentary} evidence={block.evidence} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. timeline                                                                */
/* -------------------------------------------------------------------------- */

const EVENT_META: Record<
  BlockOf<"timeline">["events"][number]["category"],
  { label: string; icon: ComponentType<{ className?: string }> }
> = {
  transaction: { label: "Transaction", icon: RiExchangeLine },
  control_event: { label: "Control event", icon: RiShieldCheckLine },
  approval: { label: "Approval", icon: RiCheckboxCircleLine },
  adjustment: { label: "Adjustment", icon: RiEditLine },
  policy_change: { label: "Policy change", icon: RiFileTextLine },
  external_event: { label: "External event", icon: RiInformationLine },
  finding: { label: "Finding", icon: RiAlertLine },
};

function formatEventDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  // Show the time only when the source bothered to record one — backdating cases turn on it.
  const hasTime = value.includes("T");
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    ...(hasTime ? { timeStyle: "short" as const } : {}),
  }).format(date);
}

export function TimelineBlock({ block }: { block: BlockOf<"timeline"> }) {
  const events = [...block.events].sort((a, b) => {
    const at = new Date(a.date).getTime();
    const bt = new Date(b.date).getTime();
    if (Number.isNaN(at) || Number.isNaN(bt)) return 0;
    return at - bt;
  });

  const bounds =
    block.from || block.to
      ? `${block.from ? formatEventDate(block.from) : "start"} – ${block.to ? formatEventDate(block.to) : "end"}`
      : null;

  return (
    <BlockShell
      title={block.title}
      claim={<ClaimBadge claimType={block.claimType} />}
      className={shellToneClass(block.claimType)}
    >
      <ClaimNotice claimType={block.claimType} />

      {bounds ? <p className="mb-3 font-mono text-xs tabular-nums text-muted-foreground">{bounds}</p> : null}

      {events.length === 0 ? (
        <Empty>No events recorded.</Empty>
      ) : block.orientation === "horizontal" ? (
        <ol className="flex snap-x gap-3 overflow-x-auto pb-2">
          {events.map((event, i) => {
            const meta = EVENT_META[event.category];
            const Icon = meta.icon;
            return (
              <li
                key={`${event.date}-${i}`}
                className="w-60 shrink-0 snap-start rounded-lg border border-border bg-muted/20 p-3"
              >
                <div className="flex items-center gap-1.5 font-mono text-xs tabular-nums text-muted-foreground">
                  <Icon className="size-3.5 shrink-0" aria-hidden />
                  {formatEventDate(event.date)}
                </div>
                <p className="mt-1 text-sm font-medium">{event.label}</p>
                <p className="text-xs text-muted-foreground">{meta.label}</p>
                {event.severity ? <SeverityBadge severity={event.severity} className="mt-2" /> : null}
                {event.description ? (
                  <p className="mt-2 text-xs text-muted-foreground">{event.description}</p>
                ) : null}
                {event.evidenceLabel ? (
                  <p className="mt-2 truncate text-xs text-muted-foreground">{event.evidenceLabel}</p>
                ) : null}
              </li>
            );
          })}
        </ol>
      ) : (
        <ol className="relative space-y-4 border-l border-border pl-6">
          {events.map((event, i) => {
            const meta = EVENT_META[event.category];
            const Icon = meta.icon;
            return (
              <li key={`${event.date}-${i}`} className="relative">
                <span
                  className="absolute -left-[31px] flex size-5 items-center justify-center rounded-full border border-border bg-card text-muted-foreground"
                  aria-hidden
                >
                  <Icon className="size-3" />
                </span>
                <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <time
                    dateTime={event.date}
                    className="font-mono text-xs tabular-nums text-muted-foreground"
                  >
                    {formatEventDate(event.date)}
                  </time>
                  <span className="text-xs text-muted-foreground">{meta.label}</span>
                  {event.severity ? <SeverityBadge severity={event.severity} /> : null}
                </div>
                <p className="mt-0.5 text-sm font-medium leading-snug">{event.label}</p>
                {event.description ? (
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{event.description}</p>
                ) : null}
                {event.evidenceLabel ? (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <RiFileTextLine className="size-3.5 shrink-0" aria-hidden />
                    {event.evidenceLabel}
                  </p>
                ) : null}
              </li>
            );
          })}
        </ol>
      )}

      <BlockFooter commentary={block.commentary} evidence={block.evidence} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. period_comparison                                                       */
/* -------------------------------------------------------------------------- */

export function PeriodComparisonBlock({ block }: { block: BlockOf<"period_comparison"> }) {
  return (
    <BlockShell
      title={block.title}
      claim={<ClaimBadge claimType={block.claimType} />}
      className={shellToneClass(block.claimType)}
    >
      <ClaimNotice claimType={block.claimType} />

      {block.basis === "as_reported" ? (
        <Notice>
          Shown as reported: these periods are not restated to a like-for-like basis, so the movements below
          may reflect changes in scope or policy rather than performance.
        </Notice>
      ) : (
        <Notice tone="neutral" icon={RiInformationLine}>
          Like-for-like basis: the periods have been put on a comparable footing.
        </Notice>
      )}

      {block.metrics.length === 0 ? (
        <Empty>No metrics to compare.</Empty>
      ) : (
        <DataTable caption={`${block.title}: metrics across ${block.periods.length} periods`}>
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th scope="col" className={TABLE_HEAD}>
                Metric
              </th>
              {block.periods.map((period) => (
                <th key={period.label} scope="col" className={TABLE_HEAD_NUM}>
                  <span className="block">{period.label}</span>
                  {period.from || period.to ? (
                    <span className="block text-[11px] font-normal">
                      {period.from ?? "…"} → {period.to ?? "…"}
                    </span>
                  ) : null}
                </th>
              ))}
              <th scope="col" className={TABLE_HEAD_NUM}>
                Change
              </th>
              <th scope="col" className={TABLE_HEAD}>
                Read
              </th>
            </tr>
          </thead>
          <tbody>
            {block.metrics.map((metric) => (
              <tr key={metric.label} className="border-b border-border last:border-0">
                <th scope="row" className={cn(TABLE_CELL, "text-left font-medium")}>
                  {metric.label}
                </th>
                {block.periods.map((period, i) => {
                  const value = metric.values[i];
                  return (
                    <td key={period.label} className={TABLE_CELL_NUM}>
                      {value === undefined ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        formatValue(value, metric.valueFormat, metric.currency ?? undefined)
                      )}
                    </td>
                  );
                })}
                <td className={TABLE_CELL_NUM}>
                  <ChangeCell percent={metric.changePercent} />
                </td>
                <td className={TABLE_CELL}>
                  <InterpretationTag value={metric.interpretation} />
                </td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      )}

      {block.notableShifts.length > 0 ? (
        <div className="mt-4">
          <h4 className="mb-1.5 text-xs font-medium text-muted-foreground">Notable shifts</h4>
          <ul className="space-y-1">
            {block.notableShifts.map((shift, i) => (
              <li key={i} className="flex gap-2 text-sm text-foreground">
                <RiArrowUpLine className="mt-0.5 size-3.5 shrink-0 rotate-45 text-muted-foreground" aria-hidden />
                <span>{shift}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <BlockFooter commentary={block.commentary} evidence={block.evidence} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. entity_comparison                                                       */
/* -------------------------------------------------------------------------- */

const NORMALISATION_LABEL: Record<BlockOf<"entity_comparison">["normalisation"], string> = {
  absolute: "Absolute values — entities of different sizes are not scaled, so compare with care.",
  percent_of_total: "Normalised to percent of total across the entities shown.",
  per_entity_scale: "Normalised to each entity's own scale, so entities of different sizes are comparable.",
};

export function EntityComparisonBlock({ block }: { block: BlockOf<"entity_comparison"> }) {
  const outliers = new Set(block.outlierEntities);

  return (
    <BlockShell
      title={block.title}
      claim={<ClaimBadge claimType={block.claimType} />}
      className={shellToneClass(block.claimType)}
    >
      <ClaimNotice claimType={block.claimType} />

      <Notice
        tone={block.normalisation === "absolute" ? "warn" : "neutral"}
        icon={block.normalisation === "absolute" ? RiAlertLine : RiInformationLine}
      >
        {NORMALISATION_LABEL[block.normalisation]}
      </Notice>

      {block.metrics.length === 0 || block.entities.length === 0 ? (
        <Empty>No entities to compare.</Empty>
      ) : (
        <DataTable caption={`${block.title}: metrics across ${block.entities.length} entities`}>
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th scope="col" className={TABLE_HEAD}>
                Metric
              </th>
              {block.entities.map((entity) => (
                <th key={entity.name} scope="col" className={TABLE_HEAD_NUM}>
                  <span className="inline-flex items-center gap-1.5">
                    {entity.name}
                    {outliers.has(entity.name) ? (
                      <>
                        <RiFlagLine className="size-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
                        <span className="sr-only">(outlier)</span>
                      </>
                    ) : null}
                  </span>
                  {entity.note ? <span className="block text-[11px] font-normal">{entity.note}</span> : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.metrics.map((metric) => {
              // Only rank when the schema says a direction has meaning.
              const finite = metric.values.filter((v) => Number.isFinite(v));
              const best =
                metric.higherIsBetter === null || finite.length < 2
                  ? null
                  : metric.higherIsBetter
                    ? Math.max(...finite)
                    : Math.min(...finite);
              return (
                <tr key={metric.label} className="border-b border-border last:border-0">
                  <th scope="row" className={cn(TABLE_CELL, "text-left font-medium")}>
                    {metric.label}
                  </th>
                  {block.entities.map((entity, i) => {
                    const value = metric.values[i];
                    return (
                      <td key={entity.name} className={TABLE_CELL_NUM}>
                        {value === undefined ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <>
                            {formatValue(value, metric.valueFormat, metric.currency ?? undefined)}
                            {best !== null && value === best ? (
                              <span className="ml-1.5 rounded border border-border bg-muted px-1 text-[10px] font-medium text-muted-foreground">
                                Best
                              </span>
                            ) : null}
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      )}

      {block.outlierEntities.length > 0 ? (
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <RiFlagLine className="size-3.5 shrink-0" aria-hidden />
          Profile does not fit the group:
          {block.outlierEntities.map((name) => (
            <FlagTag key={name} label={name} />
          ))}
        </p>
      ) : null}

      <BlockFooter commentary={block.commentary} evidence={block.evidence} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. customer_concentration_chart                                            */
/* -------------------------------------------------------------------------- */

const CONCENTRATION_CHART_CONFIG = {
  percentOfTotal: { label: "Share of total", color: "var(--chart-2)" },
} satisfies ChartConfig;

const CUSTOMER_MEASURE_LABEL: Record<BlockOf<"customer_concentration_chart">["measure"], string> = {
  revenue: "Revenue",
  receivables: "Receivables",
  orders: "Orders",
};

/** Both concentration blocks share this shape: a ranked share bar chart with a threshold line. */
function ConcentrationChart({
  label,
  data,
  thresholdPercent,
}: {
  label: string;
  data: { name: string; percentOfTotal: number }[];
  thresholdPercent: number | null;
}) {
  return (
    <Chart label={label} config={CONCENTRATION_CHART_CONFIG}>
      <BarChart accessibilityLayer data={data} layout="vertical" margin={{ left: 8, right: 16 }}>
        <CartesianGrid horizontal={false} />
        <XAxis
          type="number"
          domain={[0, 100]}
          tickLine={false}
          axisLine={false}
          tickFormatter={(value: number) => `${value}%`}
        />
        <YAxis
          type="category"
          dataKey="name"
          width={140}
          tickLine={false}
          axisLine={false}
          interval={0}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        {thresholdPercent !== null ? (
          <ReferenceLine
            x={thresholdPercent}
            stroke="var(--destructive)"
            strokeDasharray="4 4"
            label={{ value: `Limit ${thresholdPercent}%`, position: "top", fontSize: 11 }}
          />
        ) : null}
        <Bar dataKey="percentOfTotal" fill="var(--color-percentOfTotal)" radius={[0, 4, 4, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.name}
              fill={
                thresholdPercent !== null && entry.percentOfTotal >= thresholdPercent
                  ? "var(--destructive)"
                  : "var(--color-percentOfTotal)"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </Chart>
  );
}

export function CustomerConcentrationChartBlock({
  block,
}: {
  block: BlockOf<"customer_concentration_chart">;
}) {
  const ranked = [...block.customers].sort((a, b) => b.amount - a.amount);
  const breaches =
    block.thresholdPercent !== null &&
    ranked.some((customer) => customer.percentOfTotal >= (block.thresholdPercent ?? Infinity));
  const measure = CUSTOMER_MEASURE_LABEL[block.measure];

  return (
    <BlockShell
      title={block.title}
      claim={<ClaimBadge claimType={block.claimType} />}
      className={shellToneClass(block.claimType)}
    >
      <ClaimNotice claimType={block.claimType} />

      {breaches ? (
        <Notice>
          One or more customers hold a share at or above the {block.thresholdPercent}% concentration limit set by
          the instructions.
        </Notice>
      ) : null}

      <StatStrip>
        <Stat label={`Total ${measure.toLowerCase()}`} value={formatMoney(block.total, block.currency)} hint={block.period} />
        <Stat
          label={`Top ${block.topNCount}`}
          value={formatValue(block.topNPercent, "percent")}
          hint="share of total"
        />
        <Stat label="Customers" value={String(block.customers.length)} />
        <Stat
          label="Herfindahl index"
          value={block.herfindahlIndex === null ? "Not computed" : formatValue(block.herfindahlIndex, "number")}
          hint={block.herfindahlIndex === null ? null : "sum of squared shares"}
        />
      </StatStrip>

      {ranked.length === 0 ? (
        <Empty>No customers in this population.</Empty>
      ) : (
        <>
          <ConcentrationChart
            label={`${measure} share of total by customer for ${block.period}, ranked largest first.`}
            data={ranked.map((c) => ({ name: c.name, percentOfTotal: c.percentOfTotal }))}
            thresholdPercent={block.thresholdPercent}
          />

          <div className="mt-4">
            <DataTable caption={`${measure} by customer for ${block.period}`}>
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th scope="col" className={TABLE_HEAD}>
                    Customer
                  </th>
                  <th scope="col" className={TABLE_HEAD_NUM}>
                    {measure}
                  </th>
                  <th scope="col" className={TABLE_HEAD_NUM}>
                    Share
                  </th>
                  <th scope="col" className={TABLE_HEAD}>
                    Flags
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((customer, i) => (
                  <tr key={`${customer.name}-${i}`} className="border-b border-border last:border-0">
                    <th scope="row" className={cn(TABLE_CELL, "text-left font-medium")}>
                      {customer.name}
                      {customer.customerId ? (
                        <span className="ml-1.5 font-mono text-xs font-normal text-muted-foreground">
                          {customer.customerId}
                        </span>
                      ) : null}
                    </th>
                    <td className={TABLE_CELL_NUM}>{formatMoney(customer.amount, block.currency)}</td>
                    <td className={TABLE_CELL_NUM}>{formatValue(customer.percentOfTotal, "percent")}</td>
                    <td className={TABLE_CELL}>
                      <span className="flex flex-wrap gap-1">
                        {customer.relatedParty ? <FlagTag label="Related party" /> : null}
                        {customer.newInPeriod ? <FlagTag label="New in period" /> : null}
                        {!customer.relatedParty && !customer.newInPeriod ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : null}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-muted/40">
                  <th scope="row" className={cn(TABLE_CELL, "text-left font-medium")}>
                    Total
                  </th>
                  <td className={cn(TABLE_CELL_NUM, "font-medium")}>{formatMoney(block.total, block.currency)}</td>
                  <td className={cn(TABLE_CELL_NUM, "font-medium")}>{formatValue(100, "percent")}</td>
                  <td />
                </tr>
              </tfoot>
            </DataTable>
          </div>
        </>
      )}

      <BlockFooter commentary={block.commentary} evidence={block.evidence} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* 7. supplier_concentration_chart                                            */
/* -------------------------------------------------------------------------- */

const SUPPLIER_MEASURE_LABEL: Record<BlockOf<"supplier_concentration_chart">["measure"], string> = {
  spend: "Spend",
  payables: "Payables",
  invoice_count: "Invoices",
};

export function SupplierConcentrationChartBlock({
  block,
}: {
  block: BlockOf<"supplier_concentration_chart">;
}) {
  const ranked = [...block.suppliers].sort((a, b) => b.amount - a.amount);
  const measure = SUPPLIER_MEASURE_LABEL[block.measure];
  // invoice_count is a count, not money — rendering it as currency would be a lie.
  const measureFormat: ValueFormat = block.measure === "invoice_count" ? "number" : "currency";
  const fmtAmount = (value: number) => formatValue(value, measureFormat, block.currency);
  const diverted = ranked.filter((s) => s.bankDetailsChangedInPeriod);

  return (
    <BlockShell
      title={block.title}
      claim={<ClaimBadge claimType={block.claimType} />}
      className={shellToneClass(block.claimType)}
    >
      <ClaimNotice claimType={block.claimType} />

      {diverted.length > 0 ? (
        <Notice>
          {diverted.length === 1
            ? "One supplier changed its bank details during the period"
            : `${diverted.length} suppliers changed their bank details during the period`}
          . Bank-detail changes are a standard payment-diversion indicator and should be confirmed out of band
          before the next payment run.
        </Notice>
      ) : null}

      {block.singleSourceRisk ? (
        <Notice icon={RiAlertLine}>Single-source risk: {block.singleSourceRisk}</Notice>
      ) : null}

      <StatStrip>
        <Stat label={`Total ${measure.toLowerCase()}`} value={fmtAmount(block.total)} hint={block.period} />
        <Stat label={`Top ${block.topNCount}`} value={formatValue(block.topNPercent, "percent")} hint="share of total" />
        <Stat label="Suppliers" value={String(block.suppliers.length)} />
        <Stat label="Bank details changed" value={String(diverted.length)} hint={diverted.length > 0 ? "confirm out of band" : null} />
      </StatStrip>

      {ranked.length === 0 ? (
        <Empty>No suppliers in this population.</Empty>
      ) : (
        <>
          <ConcentrationChart
            label={`${measure} share of total by supplier for ${block.period}, ranked largest first.`}
            data={ranked.map((s) => ({ name: s.name, percentOfTotal: s.percentOfTotal }))}
            thresholdPercent={null}
          />

          <div className="mt-4">
            <DataTable caption={`${measure} by supplier for ${block.period}`}>
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th scope="col" className={TABLE_HEAD}>
                    Supplier
                  </th>
                  <th scope="col" className={TABLE_HEAD_NUM}>
                    {measure}
                  </th>
                  <th scope="col" className={TABLE_HEAD_NUM}>
                    Share
                  </th>
                  <th scope="col" className={TABLE_HEAD}>
                    Flags
                  </th>
                </tr>
              </thead>
              <tbody>
                {ranked.map((supplier, i) => (
                  <tr key={`${supplier.name}-${i}`} className="border-b border-border last:border-0">
                    <th scope="row" className={cn(TABLE_CELL, "text-left font-medium")}>
                      {supplier.name}
                      {supplier.supplierId ? (
                        <span className="ml-1.5 font-mono text-xs font-normal text-muted-foreground">
                          {supplier.supplierId}
                        </span>
                      ) : null}
                    </th>
                    <td className={TABLE_CELL_NUM}>{fmtAmount(supplier.amount)}</td>
                    <td className={TABLE_CELL_NUM}>{formatValue(supplier.percentOfTotal, "percent")}</td>
                    <td className={TABLE_CELL}>
                      <span className="flex flex-wrap gap-1">
                        {supplier.bankDetailsChangedInPeriod ? <FlagTag label="Bank details changed" /> : null}
                        {supplier.underContract === false ? <FlagTag label="No contract" /> : null}
                        {supplier.newInPeriod ? <FlagTag label="New in period" /> : null}
                        {!supplier.bankDetailsChangedInPeriod &&
                        supplier.underContract !== false &&
                        !supplier.newInPeriod ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : null}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-muted/40">
                  <th scope="row" className={cn(TABLE_CELL, "text-left font-medium")}>
                    Total
                  </th>
                  <td className={cn(TABLE_CELL_NUM, "font-medium")}>{fmtAmount(block.total)}</td>
                  <td className={cn(TABLE_CELL_NUM, "font-medium")}>{formatValue(100, "percent")}</td>
                  <td />
                </tr>
              </tfoot>
            </DataTable>
          </div>
        </>
      )}

      <BlockFooter commentary={block.commentary} evidence={block.evidence} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* 8. cash_flow_visualization                                                 */
/* -------------------------------------------------------------------------- */

const CASH_FLOW_CONFIG = {
  inflow: { label: "Inflows", color: "var(--chart-2)" },
  outflow: { label: "Outflows", color: "var(--chart-5)" },
  closing: { label: "Closing balance", color: "var(--chart-4)" },
} satisfies ChartConfig;

export function CashFlowVisualizationBlock({ block }: { block: BlockOf<"cash_flow_visualization"> }) {
  // Outflows arrive as positive magnitudes; they are plotted negative so the bars read as
  // money leaving. The table below restates them as the positive magnitudes they are.
  const data = block.periods.map((period, i) => ({
    period,
    inflow: block.inflows[i] ?? 0,
    outflow: -(block.outflows[i] ?? 0),
    closing: block.closingBalance[i] ?? 0,
  }));

  const fmt = (value: number) => formatMoney(value, block.currency);

  // The model can emit a periods array longer than closingBalance; a short array must show a
  // dash rather than a confident wrong number.
  const finalClosing: number | undefined =
    block.closingBalance.length > 0 ? block.closingBalance[block.closingBalance.length - 1] : undefined;

  return (
    <BlockShell
      title={block.title}
      claim={<ClaimBadge claimType={block.claimType} />}
      className={shellToneClass(block.claimType)}
    >
      <ClaimNotice claimType={block.claimType} />

      {block.wentNegative ? (
        <Notice icon={RiErrorWarningLine}>
          The closing balance falls below zero in at least one period. Confirm the facility or overdraft that
          funded the shortfall, and whether it was authorised.
        </Notice>
      ) : null}

      <StatStrip>
        <Stat label="Opening balance" value={fmt(block.openingBalance)} hint={block.periods[0] ?? null} />
        <Stat
          label="Closing balance"
          value={finalClosing === undefined ? "—" : fmt(finalClosing)}
          hint={block.periods[block.periods.length - 1] ?? null}
        />
        <Stat
          label="Lowest balance"
          value={block.lowestBalanceValue === null ? "—" : fmt(block.lowestBalanceValue)}
          hint={block.lowestBalancePeriod}
        />
        <Stat label="View" value={block.view === "direct" ? "Direct" : "Indirect"} />
      </StatStrip>

      {data.length === 0 ? (
        <Empty>No periods to plot.</Empty>
      ) : (
        <>
          <Chart
            label={`Cash inflows and outflows by period with the running closing balance, in ${block.currency}. Outflows are drawn below the zero line.`}
            config={CASH_FLOW_CONFIG}
          >
            <ComposedChart accessibilityLayer data={data} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="period" tickLine={false} axisLine={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={72}
                tickFormatter={(value: number) =>
                  new Intl.NumberFormat(undefined, { notation: "compact" }).format(value)
                }
              />
              <ReferenceLine y={0} stroke="var(--border)" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="inflow" fill="var(--color-inflow)" radius={[4, 4, 0, 0]} />
              <Bar dataKey="outflow" fill="var(--color-outflow)" radius={[0, 0, 4, 4]} />
              <Line
                dataKey="closing"
                stroke="var(--color-closing)"
                strokeWidth={2}
                dot={{ r: 3 }}
                type="monotone"
              />
            </ComposedChart>
          </Chart>

          <div className="mt-4">
            <DataTable caption={`Cash movement by period in ${block.currency}`}>
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th scope="col" className={TABLE_HEAD}>
                    Period
                  </th>
                  <th scope="col" className={TABLE_HEAD_NUM}>
                    Inflows
                  </th>
                  <th scope="col" className={TABLE_HEAD_NUM}>
                    Outflows
                  </th>
                  <th scope="col" className={TABLE_HEAD_NUM}>
                    Net movement
                  </th>
                  <th scope="col" className={TABLE_HEAD_NUM}>
                    Closing balance
                  </th>
                </tr>
              </thead>
              <tbody>
                {block.periods.map((period, i) => {
                  const closing = block.closingBalance[i];
                  const negative = closing !== undefined && closing < 0;
                  return (
                    <tr key={period} className="border-b border-border last:border-0">
                      <th scope="row" className={cn(TABLE_CELL, "text-left font-medium")}>
                        {period}
                      </th>
                      <td className={TABLE_CELL_NUM}>{fmt(block.inflows[i] ?? 0)}</td>
                      <td className={TABLE_CELL_NUM}>{fmt(block.outflows[i] ?? 0)}</td>
                      <td className={TABLE_CELL_NUM}>{fmt(block.netMovement[i] ?? 0)}</td>
                      <td className={cn(TABLE_CELL_NUM, negative && "text-destructive")}>
                        {closing === undefined ? "—" : fmt(closing)}
                        {negative ? <span className="ml-1 text-xs font-medium">(overdrawn)</span> : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </DataTable>
          </div>

          {block.categories.length > 0 ? (
            <div className="mt-4">
              <h4 className="mb-1.5 text-xs font-medium text-muted-foreground">By category</h4>
              <DataTable caption={`Cash movement by category and period in ${block.currency}`}>
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th scope="col" className={TABLE_HEAD}>
                      Category
                    </th>
                    <th scope="col" className={TABLE_HEAD}>
                      Direction
                    </th>
                    {block.periods.map((period) => (
                      <th key={period} scope="col" className={TABLE_HEAD_NUM}>
                        {period}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.categories.map((category, i) => (
                    <tr key={`${category.name}-${i}`} className="border-b border-border last:border-0">
                      <th scope="row" className={cn(TABLE_CELL, "text-left font-medium")}>
                        {category.name}
                      </th>
                      <td className={TABLE_CELL}>
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          {category.direction === "inflow" ? (
                            <RiArrowUpLine className="size-3.5 shrink-0" aria-hidden />
                          ) : (
                            <RiArrowDownLine className="size-3.5 shrink-0" aria-hidden />
                          )}
                          {category.direction === "inflow" ? "Inflow" : "Outflow"}
                        </span>
                      </td>
                      {block.periods.map((period, p) => (
                        <td key={period} className={TABLE_CELL_NUM}>
                          {fmt(category.amounts[p] ?? 0)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </DataTable>
            </div>
          ) : null}
        </>
      )}

      <BlockFooter commentary={block.commentary} evidence={block.evidence} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* 9. aging_visualization                                                     */
/* -------------------------------------------------------------------------- */

const AGING_CONFIG = {
  amount: { label: "Current ageing", color: "var(--chart-2)" },
  prior: { label: "Prior ageing", color: "var(--chart-4)" },
} satisfies ChartConfig;

const AGING_SUBJECT_LABEL: Record<BlockOf<"aging_visualization">["subject"], string> = {
  receivables: "Receivables",
  payables: "Payables",
  other: "Balances",
};

export function AgingVisualizationBlock({ block }: { block: BlockOf<"aging_visualization"> }) {
  const hasPrior = block.buckets.some((bucket) => bucket.priorAmount !== null);
  const subject = AGING_SUBJECT_LABEL[block.subject];
  const fmt = (value: number) => formatMoney(value, block.currency);

  const data = block.buckets.map((bucket) => ({
    label: bucket.label,
    amount: bucket.amount,
    prior: bucket.priorAmount ?? 0,
  }));

  return (
    <BlockShell
      title={block.title}
      claim={<ClaimBadge claimType={block.claimType} />}
      className={shellToneClass(block.claimType)}
    >
      <ClaimNotice claimType={block.claimType} />

      {block.deteriorating === true ? (
        <Notice icon={RiAlertLine}>
          The ageing profile has deteriorated against the prior ageing date — balance is shifting into the older
          buckets.
        </Notice>
      ) : null}

      <StatStrip>
        <Stat label={`Total ${subject.toLowerCase()}`} value={fmt(block.total)} hint={`as at ${block.asOfDate}`} />
        <Stat
          label="Oldest item"
          value={block.oldestItemDays === null ? "—" : `${block.oldestItemDays} days`}
        />
        <Stat label="Buckets" value={String(block.buckets.length)} />
        <Stat
          label="Trend"
          value={
            block.deteriorating === null
              ? "Not comparable"
              : block.deteriorating
                ? "Deteriorating"
                : "Stable or improving"
          }
          hint={block.deteriorating === null ? "no prior ageing supplied" : null}
        />
      </StatStrip>

      {block.buckets.length === 0 ? (
        <Empty>No ageing buckets.</Empty>
      ) : (
        <>
          <Chart
            label={`${subject} ageing profile as at ${block.asOfDate} in ${block.currency}${
              hasPrior ? ", with the prior ageing date shown alongside" : ""
            }.`}
            config={AGING_CONFIG}
          >
            <BarChart accessibilityLayer data={data} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={72}
                tickFormatter={(value: number) =>
                  new Intl.NumberFormat(undefined, { notation: "compact" }).format(value)
                }
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="amount" fill="var(--color-amount)" radius={[4, 4, 0, 0]} />
              {hasPrior ? <Bar dataKey="prior" fill="var(--color-prior)" radius={[4, 4, 0, 0]} /> : null}
            </BarChart>
          </Chart>

          <div className="mt-4">
            <DataTable caption={`${subject} ageing as at ${block.asOfDate} in ${block.currency}`}>
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th scope="col" className={TABLE_HEAD}>
                    Bucket
                  </th>
                  <th scope="col" className={TABLE_HEAD_NUM}>
                    Amount
                  </th>
                  <th scope="col" className={TABLE_HEAD_NUM}>
                    Share
                  </th>
                  <th scope="col" className={TABLE_HEAD_NUM}>
                    Items
                  </th>
                  {hasPrior ? (
                    <>
                      <th scope="col" className={TABLE_HEAD_NUM}>
                        Prior
                      </th>
                      <th scope="col" className={TABLE_HEAD_NUM}>
                        Movement
                      </th>
                    </>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {block.buckets.map((bucket, i) => (
                  <tr key={`${bucket.label}-${i}`} className="border-b border-border last:border-0">
                    <th scope="row" className={cn(TABLE_CELL, "text-left font-medium")}>
                      {bucket.label}
                    </th>
                    <td className={TABLE_CELL_NUM}>{fmt(bucket.amount)}</td>
                    <td className={TABLE_CELL_NUM}>{formatValue(bucket.percentOfTotal, "percent")}</td>
                    <td className={TABLE_CELL_NUM}>
                      {bucket.itemCount === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        formatValue(bucket.itemCount, "number")
                      )}
                    </td>
                    {hasPrior ? (
                      <>
                        <td className={TABLE_CELL_NUM}>
                          {bucket.priorAmount === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            fmt(bucket.priorAmount)
                          )}
                        </td>
                        <td className={TABLE_CELL_NUM}>
                          {bucket.priorAmount === null ? (
                            <span className="text-muted-foreground">—</span>
                          ) : (
                            fmt(bucket.amount - bucket.priorAmount)
                          )}
                        </td>
                      </>
                    ) : null}
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-border bg-muted/40">
                  <th scope="row" className={cn(TABLE_CELL, "text-left font-medium")}>
                    Total
                  </th>
                  <td className={cn(TABLE_CELL_NUM, "font-medium")}>{fmt(block.total)}</td>
                  <td className={cn(TABLE_CELL_NUM, "font-medium")}>{formatValue(100, "percent")}</td>
                  <td />
                  {hasPrior ? (
                    <>
                      <td />
                      <td />
                    </>
                  ) : null}
                </tr>
              </tfoot>
            </DataTable>
          </div>
        </>
      )}

      <BlockFooter commentary={block.commentary} evidence={block.evidence} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* 10. account_movement_visualization                                         */
/* -------------------------------------------------------------------------- */

const ACCOUNT_MOVEMENT_CONFIG = {
  debits: { label: "Debits", color: "var(--chart-2)" },
  credits: { label: "Credits", color: "var(--chart-5)" },
  net: { label: "Net movement", color: "var(--chart-4)" },
} satisfies ChartConfig;

export function AccountMovementVisualizationBlock({
  block,
}: {
  block: BlockOf<"account_movement_visualization">;
}) {
  const fmt = (value: number) => formatMoney(value, block.currency);
  const dormant = new Set(block.dormantPeriods);
  const unusual = block.movements.filter((movement) => movement.unusual);

  const data = block.movements.map((movement) => ({
    period: movement.periodLabel,
    debits: movement.debits,
    credits: movement.credits,
    net: movement.net,
    unusual: movement.unusual,
  }));

  // Movement after a dormant period is the classic suspense/clearing-account red flag, so it is
  // called out in words rather than left for the reader to spot in the chart.
  const activityAfterDormancy = block.movements.some((movement, i) => {
    if (i === 0) return false;
    const previous = block.movements[i - 1];
    return (
      previous !== undefined &&
      dormant.has(previous.periodLabel) &&
      !dormant.has(movement.periodLabel) &&
      (movement.debits !== 0 || movement.credits !== 0)
    );
  });

  return (
    <BlockShell
      title={block.title}
      claim={<ClaimBadge claimType={block.claimType} />}
      className={shellToneClass(block.claimType)}
    >
      <ClaimNotice claimType={block.claimType} />

      {activityAfterDormancy ? (
        <Notice icon={RiPauseCircleLine}>
          This account records movement immediately after a dormant period. Postings that resume in a quiet
          account are a common route for adjustments that avoid review.
        </Notice>
      ) : null}

      {unusual.length > 0 ? (
        <Notice icon={RiAlertLine}>
          {unusual.length === 1 ? "One period breaks" : `${unusual.length} periods break`} this account&apos;s
          normal pattern. Each is listed with its reason in the table below.
        </Notice>
      ) : null}

      <StatStrip>
        <Stat
          label="Account"
          value={block.accountCode}
          hint={`${block.accountName} · normal balance ${block.normalBalance}`}
        />
        <Stat label="Opening balance" value={fmt(block.openingBalance)} />
        <Stat label="Closing balance" value={fmt(block.closingBalance)} />
        <Stat
          label="Movement"
          value={fmt(block.closingBalance - block.openingBalance)}
          hint="closing less opening"
        />
      </StatStrip>

      {block.expectedPattern ? (
        <Notice tone="neutral" icon={RiInformationLine}>
          Expected pattern: {block.expectedPattern}
        </Notice>
      ) : null}

      {data.length === 0 ? (
        <Empty>No movements in this account.</Empty>
      ) : (
        <>
          <Chart
            label={`Debits, credits and net movement by period for account ${block.accountCode} ${block.accountName}, in ${block.currency}.`}
            config={ACCOUNT_MOVEMENT_CONFIG}
          >
            <ComposedChart accessibilityLayer data={data} margin={{ left: 8, right: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="period" tickLine={false} axisLine={false} />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={72}
                tickFormatter={(value: number) =>
                  new Intl.NumberFormat(undefined, { notation: "compact" }).format(value)
                }
              />
              <ReferenceLine y={0} stroke="var(--border)" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="debits" fill="var(--color-debits)" radius={[4, 4, 0, 0]}>
                {data.map((entry) => (
                  // Tint marks the unusual period; the table carries the actual reason.
                  <Cell
                    key={entry.period}
                    fill={entry.unusual ? "var(--destructive)" : "var(--color-debits)"}
                  />
                ))}
              </Bar>
              <Bar dataKey="credits" fill="var(--color-credits)" radius={[4, 4, 0, 0]} />
              <Line dataKey="net" stroke="var(--color-net)" strokeWidth={2} dot={{ r: 3 }} type="monotone" />
            </ComposedChart>
          </Chart>

          <div className="mt-4">
            <DataTable caption={`Movements on account ${block.accountCode} in ${block.currency}`}>
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th scope="col" className={TABLE_HEAD}>
                    Period
                  </th>
                  <th scope="col" className={TABLE_HEAD_NUM}>
                    Debits
                  </th>
                  <th scope="col" className={TABLE_HEAD_NUM}>
                    Credits
                  </th>
                  <th scope="col" className={TABLE_HEAD_NUM}>
                    Net
                  </th>
                  <th scope="col" className={TABLE_HEAD_NUM}>
                    Entries
                  </th>
                  <th scope="col" className={TABLE_HEAD}>
                    Assessment
                  </th>
                </tr>
              </thead>
              <tbody>
                {block.movements.map((movement, i) => (
                  <tr key={`${movement.periodLabel}-${i}`} className="border-b border-border last:border-0">
                    <th scope="row" className={cn(TABLE_CELL, "text-left font-medium")}>
                      {movement.periodLabel}
                    </th>
                    <td className={TABLE_CELL_NUM}>{fmt(movement.debits)}</td>
                    <td className={TABLE_CELL_NUM}>{fmt(movement.credits)}</td>
                    <td className={TABLE_CELL_NUM}>{fmt(movement.net)}</td>
                    <td className={TABLE_CELL_NUM}>
                      {movement.entryCount === null ? (
                        <span className="text-muted-foreground">—</span>
                      ) : (
                        formatValue(movement.entryCount, "number")
                      )}
                    </td>
                    <td className={TABLE_CELL}>
                      {dormant.has(movement.periodLabel) ? (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <RiPauseCircleLine className="size-3.5 shrink-0" aria-hidden />
                          Dormant
                        </span>
                      ) : movement.unusual ? (
                        <span className="inline-flex items-start gap-1 text-xs font-medium text-amber-800 dark:text-amber-200">
                          <RiAlertLine className="mt-px size-3.5 shrink-0" aria-hidden />
                          <span>Unusual{movement.unusualReason ? `: ${movement.unusualReason}` : ""}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                          <RiCheckboxCircleLine className="size-3.5 shrink-0" aria-hidden />
                          Normal
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </div>

          {/* The net series is charted but only implied by the table's sign, so it is also
              restated for screen readers as an explicit debit/credit ordering. */}
          <ChartDataTable
            caption={`Net movement by period for account ${block.accountCode} in ${block.currency}`}
            columns={["Period", "Net movement"]}
            rows={block.movements.map((movement) => [movement.periodLabel, fmt(movement.net)])}
          />
        </>
      )}

      {block.dormantPeriods.length > 0 ? (
        <p className="mt-3 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
          <RiPauseCircleLine className="size-3.5 shrink-0" aria-hidden />
          Dormant periods:
          {block.dormantPeriods.map((period) => (
            <span key={period} className="rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[11px]">
              {period}
            </span>
          ))}
        </p>
      ) : null}

      <BlockFooter commentary={block.commentary} evidence={block.evidence} />
    </BlockShell>
  );
}
