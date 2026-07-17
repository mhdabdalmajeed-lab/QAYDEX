"use client";

// recharts 3 does not server-render — this whole module is client-only because of the
// trend_card sparkline. Chart containers therefore carry a fixed height: they are blank
// until hydration and must not shift the document when they fill in.

import {
  RiAlertLine,
  RiArrowDownLine,
  RiArrowUpLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiErrorWarningLine,
  RiInformationLine,
  RiQuestionLine,
  RiSubtractLine,
} from "@remixicon/react";
import type { ComponentType, ReactNode } from "react";
import { Line, LineChart, XAxis, YAxis } from "recharts";

import {
  BlockShell,
  ChartDataTable,
  ClaimBadge,
  EvidenceChips,
  MissingEvidenceNote,
  formatNumber,
  formatPercent,
  formatValue,
} from "@/components/blocks/shared";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BlockOf } from "@/lib/ai/blocks/schemas";
import type { EvidenceInput } from "@/lib/ai/blocks/primitives";
import type { ClaimType } from "@/lib/ai/blocks/types";
import { cn } from "@/lib/utils";

/**
 * The five metric blocks (PRD §18.2).
 *
 * Two product rules are enforced structurally rather than left to each renderer:
 *
 *  - **Nothing is signalled by colour alone** (PRD §26.4). Every direction, verdict and
 *    threshold outcome carries an icon *and* a word, and every chart ships the same numbers
 *    as a screen-reader table.
 *  - **A guess must never look like a fact** (PRD §10.5, §31). Claim type drives the frame
 *    of the card, not just a badge: anything untested is drawn on a dashed, tinted shell and
 *    carries an explicit caveat line above the number it qualifies.
 */

/* -------------------------------------------------------------------------- */
/* Claim honesty                                                              */
/* -------------------------------------------------------------------------- */

/** Claim types whose numbers a reader must not act on without further work. */
const SPECULATIVE_CLAIMS: readonly ClaimType[] = [
  "unverified_hypothesis",
  "missing_information",
  "judgment_required",
];

function isSpeculative(claimType: ClaimType): boolean {
  return SPECULATIVE_CLAIMS.includes(claimType);
}

/** The shell treatment. Dashed + tinted, so a hypothesis reads differently at a glance. */
function claimShellClass(claimType: ClaimType): string | undefined {
  if (isSpeculative(claimType)) {
    return "border-dashed border-amber-500/50 bg-amber-500/5";
  }
  if (claimType === "user_claim") return "border-dashed";
  return undefined;
}

const CLAIM_CAVEATS: Partial<Record<ClaimType, string>> = {
  unverified_hypothesis:
    "Not tested against evidence. Treat the figures below as a lead to investigate, not a finding.",
  missing_information:
    "The evidence needed to substantiate these figures was not available. Read them as incomplete.",
  judgment_required:
    "These figures require a qualified professional's judgement before anyone relies on them.",
  user_claim: "Asserted by a user and not independently corroborated against source data.",
};

/** A text caveat — the icon and the sentence carry the meaning; the tint only reinforces it. */
function ClaimCaveat({ claimType }: { claimType: ClaimType }) {
  const text = CLAIM_CAVEATS[claimType];
  if (!text) return null;
  return (
    <p className="mb-3 flex items-start gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-800 dark:text-amber-200">
      <RiErrorWarningLine className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>{text}</span>
    </p>
  );
}

/** Whether the numbers themselves should be visually de-emphasised. */
function valueToneClass(claimType: ClaimType): string {
  return isSpeculative(claimType) ? "text-muted-foreground" : "text-foreground";
}

/* -------------------------------------------------------------------------- */
/* Small shared bits, local to the metric family                              */
/* -------------------------------------------------------------------------- */

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

/** A label/value pair. Always used inside a `<dl>`. */
function Stat({
  label,
  value,
  hint,
  valueClassName,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  valueClassName?: string;
  className?: string;
}) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-0.5 font-mono text-lg leading-tight font-semibold tabular-nums",
          valueClassName,
        )}
      >
        {value}
      </dd>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

/** Icon + word. Never a bare colour. */
function Verdict({
  icon: Icon,
  label,
  tone,
  className,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  tone: "positive" | "negative" | "neutral" | "caution";
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        tone === "positive" && "border-emerald-600/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
        tone === "negative" && "border-destructive/40 bg-destructive/10 text-destructive",
        tone === "caution" && "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300",
        tone === "neutral" && "border-border bg-muted text-muted-foreground",
        className,
      )}
    >
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {label}
    </span>
  );
}

/** The formula/derivation strip an auditor uses to recompute a number by hand. */
function Derivation({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="mt-3 rounded-md bg-muted/50 px-3 py-2">
      <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-0.5 text-xs leading-relaxed text-foreground/90">{children}</p>
    </div>
  );
}

type NumericFormat = "number" | "currency" | "percent";

function fmt(value: number, format: NumericFormat | null, currency: string | null): string {
  return formatValue(value, format, currency ?? undefined);
}

/** Signed presentation, so `+`/`-` reads before the magnitude does. */
function fmtSigned(value: number, format: NumericFormat | null, currency: string | null): string {
  const body = fmt(Math.abs(value), format, currency);
  if (value > 0) return `+${body}`;
  if (value < 0) return `−${body}`;
  return body;
}

function fmtSignedPercent(value: number): string {
  if (value > 0) return `+${formatPercent(value)}`;
  if (value < 0) return `−${formatPercent(Math.abs(value))}`;
  return formatPercent(value);
}

/* -------------------------------------------------------------------------- */
/* key_metric_card                                                            */
/* -------------------------------------------------------------------------- */

export function KeyMetricCardBlock({ block }: { block: BlockOf<"key_metric_card"> }) {
  const value = fmt(block.value, block.valueFormat, block.currency);

  return (
    <BlockShell
      title={block.title}
      claim={<ClaimBadge claimType={block.claimType} />}
      className={claimShellClass(block.claimType)}
    >
      <ClaimCaveat claimType={block.claimType} />

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p
          className={cn(
            "font-mono text-3xl leading-none font-semibold tabular-nums",
            valueToneClass(block.claimType),
          )}
        >
          {value}
        </p>
        {block.unit ? <span className="text-sm text-muted-foreground">{block.unit}</span> : null}
      </div>

      <p className="mt-1.5 text-sm font-medium text-foreground">{block.label}</p>
      {block.period ? <p className="text-xs text-muted-foreground">{block.period}</p> : null}

      {block.context ? (
        <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
          <RiInformationLine className="mt-px size-3.5 shrink-0" aria-hidden />
          <span>{block.context}</span>
        </p>
      ) : null}

      <Derivation label="How this was calculated">{block.calculationBasis}</Derivation>

      <BlockFooter commentary={block.commentary} evidence={block.evidence} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* trend_card                                                                 */
/* -------------------------------------------------------------------------- */

const DIRECTION_META: Record<
  BlockOf<"trend_card">["direction"],
  { label: string; icon: ComponentType<{ className?: string }> }
> = {
  up: { label: "Up", icon: RiArrowUpLine },
  down: { label: "Down", icon: RiArrowDownLine },
  flat: { label: "Flat", icon: RiSubtractLine },
};

const INTERPRETATION_META: Record<
  BlockOf<"trend_card">["interpretation"],
  { label: string; icon: ComponentType<{ className?: string }>; tone: "positive" | "negative" | "neutral" }
> = {
  favourable: { label: "Favourable", icon: RiCheckboxCircleLine, tone: "positive" },
  unfavourable: { label: "Unfavourable", icon: RiAlertLine, tone: "negative" },
  neutral: { label: "Neutral", icon: RiInformationLine, tone: "neutral" },
};

export function TrendCardBlock({ block }: { block: BlockOf<"trend_card"> }) {
  const direction = DIRECTION_META[block.direction];
  const DirectionIcon = direction.icon;
  const interpretation = INTERPRETATION_META[block.interpretation];

  const chartConfig: ChartConfig = {
    value: { label: block.label, color: "var(--chart-2)" },
  };

  const data = block.points.map((point) => ({ label: point.label, value: point.value }));

  const chartDescription = `Trend of ${block.label} across ${block.points.length} periods, ${
    block.points[0]?.label ?? "start"
  } to ${block.points[block.points.length - 1]?.label ?? "end"}. Overall direction: ${
    direction.label
  }, interpreted as ${interpretation.label}.`;

  return (
    <BlockShell
      title={block.title}
      claim={<ClaimBadge claimType={block.claimType} />}
      className={claimShellClass(block.claimType)}
    >
      <ClaimCaveat claimType={block.claimType} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <p
              className={cn(
                "font-mono text-3xl leading-none font-semibold tabular-nums",
                valueToneClass(block.claimType),
              )}
            >
              {fmt(block.currentValue, block.valueFormat, block.currency)}
            </p>
            <span className="inline-flex items-center gap-1 font-mono text-sm tabular-nums text-muted-foreground">
              <DirectionIcon className="size-4 shrink-0" aria-hidden />
              <span className="sr-only">{direction.label}: </span>
              {fmtSigned(block.changeAbsolute, block.valueFormat, block.currency)}
              {block.changePercent !== null ? ` (${fmtSignedPercent(block.changePercent)})` : null}
            </span>
          </div>
          <p className="mt-1.5 text-sm font-medium text-foreground">{block.label}</p>
          <p className="text-xs text-muted-foreground">
            {block.periodLabel} · previous {fmt(block.previousValue, block.valueFormat, block.currency)}
            {block.changePercent === null ? " · percentage change not meaningful (previous was zero)" : null}
          </p>
        </div>
        <Verdict icon={interpretation.icon} label={interpretation.label} tone={interpretation.tone} />
      </div>

      {/* Fixed height: recharts renders nothing until hydration, so the box must be reserved. */}
      <div className="mt-4 h-28" role="img" aria-label={chartDescription}>
        <ChartContainer config={chartConfig} className="aspect-auto h-full w-full">
          <LineChart accessibilityLayer data={data} margin={{ top: 6, right: 6, bottom: 0, left: 6 }}>
            <XAxis dataKey="label" hide />
            <YAxis hide domain={["auto", "auto"]} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
            <Line
              dataKey="value"
              type="monotone"
              stroke="var(--color-value)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 3 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ChartContainer>
      </div>

      <ChartDataTable
        caption={chartDescription}
        columns={[block.xLabel ?? "Period", block.yLabel ?? block.label]}
        rows={block.points.map((point) => [
          point.label,
          fmt(point.value, block.valueFormat, block.currency),
        ])}
      />

      <BlockFooter commentary={block.commentary} evidence={block.evidence} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* comparison_card                                                            */
/* -------------------------------------------------------------------------- */

export function ComparisonCardBlock({ block }: { block: BlockOf<"comparison_card"> }) {
  const magnitudes = block.items.map((item) => Math.abs(item.value));
  const scale = Math.max(...magnitudes, 0);

  return (
    <BlockShell
      title={block.title}
      claim={<ClaimBadge claimType={block.claimType} />}
      className={claimShellClass(block.claimType)}
    >
      <ClaimCaveat claimType={block.claimType} />

      <p className="text-sm font-medium text-foreground">{block.label}</p>

      <div className="mt-3">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead scope="col">Item</TableHead>
              <TableHead scope="col" className="text-right">
                Value
              </TableHead>
              <TableHead scope="col" className="w-32">
                <span className="sr-only">Relative magnitude</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {block.items.map((item, index) => {
              const width = scale > 0 ? (Math.abs(item.value) / scale) * 100 : 0;
              return (
                <TableRow key={`${item.label}-${index}`}>
                  <TableCell className="align-top font-medium">
                    {item.label}
                    {item.note ? (
                      <p className="mt-0.5 text-xs font-normal text-muted-foreground">{item.note}</p>
                    ) : null}
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right align-top font-mono tabular-nums",
                      valueToneClass(block.claimType),
                    )}
                  >
                    {fmt(item.value, block.valueFormat, block.currency)}
                  </TableCell>
                  <TableCell className="align-middle">
                    {/* Decorative: every value it encodes is already in the column to its left. */}
                    <div className="h-1.5 w-full rounded-full bg-muted" aria-hidden>
                      <div
                        className="h-1.5 rounded-full bg-[var(--chart-2)]"
                        style={{ width: `${width}%` }}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Derivation label="Basis of comparison">{block.basisOfComparison}</Derivation>

      <p className="mt-3 flex items-start gap-1.5 text-sm">
        <RiInformationLine className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span>
          <span className="font-medium">What differs: </span>
          <span className="text-muted-foreground">{block.whatDiffers}</span>
        </span>
      </p>

      <BlockFooter commentary={block.commentary} evidence={block.evidence} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* variance_card                                                              */
/* -------------------------------------------------------------------------- */

const EXPECTED_BASIS_LABELS: Record<BlockOf<"variance_card">["expectedBasis"], string> = {
  budget: "Budget",
  forecast: "Forecast",
  prior_period: "Prior period",
  peer: "Peer benchmark",
  policy: "Policy",
  model_estimate: "Model estimate",
};

export function VarianceCardBlock({ block }: { block: BlockOf<"variance_card"> }) {
  const numberFormat: NumericFormat = block.currency ? "currency" : "number";
  const basisLabel = EXPECTED_BASIS_LABELS[block.expectedBasis];

  return (
    <BlockShell
      title={block.title}
      claim={<ClaimBadge claimType={block.claimType} />}
      className={claimShellClass(block.claimType)}
    >
      <ClaimCaveat claimType={block.claimType} />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <p className="text-sm font-medium text-foreground">{block.label}</p>
        <div className="flex flex-wrap items-center gap-2">
          {block.favourable === true ? (
            <Verdict icon={RiCheckboxCircleLine} label="Favourable variance" tone="positive" />
          ) : block.favourable === false ? (
            <Verdict icon={RiAlertLine} label="Unfavourable variance" tone="negative" />
          ) : (
            <Verdict icon={RiInformationLine} label="Direction not scored" tone="neutral" />
          )}
          {block.exceedsThreshold === true ? (
            <Verdict icon={RiErrorWarningLine} label="Exceeds tolerance" tone="caution" />
          ) : block.exceedsThreshold === false ? (
            <Verdict icon={RiCheckboxCircleLine} label="Within tolerance" tone="neutral" />
          ) : null}
        </div>
      </div>

      <dl className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat
          label="Actual"
          value={fmt(block.actual, numberFormat, block.currency)}
          valueClassName={valueToneClass(block.claimType)}
        />
        <Stat
          label={`Expected (${basisLabel.toLowerCase()})`}
          value={fmt(block.expected, numberFormat, block.currency)}
          valueClassName={valueToneClass(block.claimType)}
        />
        <Stat
          label="Variance"
          value={
            <>
              {fmtSigned(block.varianceAbsolute, numberFormat, block.currency)}
              {block.variancePercent !== null ? (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  {fmtSignedPercent(block.variancePercent)}
                </span>
              ) : null}
            </>
          }
          valueClassName={valueToneClass(block.claimType)}
          hint={block.variancePercent === null ? "Percentage not meaningful (expected was zero)." : undefined}
        />
      </dl>

      <Derivation label="Variance basis">
        Actual less expected, where expected is the {basisLabel.toLowerCase()}.
        {block.thresholdPercent !== null
          ? ` Tolerance set at ±${formatPercent(block.thresholdPercent)}.`
          : " No tolerance was set by the instructions."}
      </Derivation>

      {block.explanation ? (
        <div className="mt-3 rounded-md border border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
              Explanation offered
            </p>
            {block.explanationAccepted === true ? (
              <Verdict icon={RiCheckboxCircleLine} label="Supported by evidence" tone="positive" />
            ) : block.explanationAccepted === false ? (
              <Verdict icon={RiCloseCircleLine} label="Not supported by evidence" tone="negative" />
            ) : (
              <Verdict icon={RiQuestionLine} label="Not tested" tone="caution" />
            )}
          </div>
          <p className="mt-1.5 text-sm leading-relaxed text-foreground/90">{block.explanation}</p>
        </div>
      ) : null}

      <BlockFooter commentary={block.commentary} evidence={block.evidence} />
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* financial_ratio_card                                                       */
/* -------------------------------------------------------------------------- */

type RatioUnit = BlockOf<"financial_ratio_card">["unit"];

function formatRatio(value: number, unit: RatioUnit): string {
  switch (unit) {
    case "percent":
      return formatPercent(value);
    case "days":
      return `${formatNumber(value)} days`;
    case "times":
      return `${formatNumber(value)}×`;
    case "ratio":
      return formatNumber(value);
  }
}

export function FinancialRatioCardBlock({ block }: { block: BlockOf<"financial_ratio_card"> }) {
  const priorDelta = block.priorValue !== null ? block.value - block.priorValue : null;
  const benchmarkDelta = block.benchmarkValue !== null ? block.value - block.benchmarkValue : null;

  return (
    <BlockShell
      title={block.title}
      claim={<ClaimBadge claimType={block.claimType} />}
      className={claimShellClass(block.claimType)}
    >
      <ClaimCaveat claimType={block.claimType} />

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p
          className={cn(
            "font-mono text-3xl leading-none font-semibold tabular-nums",
            valueToneClass(block.claimType),
          )}
        >
          {formatRatio(block.value, block.unit)}
        </p>
        {priorDelta !== null ? (
          <span className="inline-flex items-center gap-1 font-mono text-sm tabular-nums text-muted-foreground">
            {priorDelta > 0 ? (
              <RiArrowUpLine className="size-4 shrink-0" aria-hidden />
            ) : priorDelta < 0 ? (
              <RiArrowDownLine className="size-4 shrink-0" aria-hidden />
            ) : (
              <RiSubtractLine className="size-4 shrink-0" aria-hidden />
            )}
            <span className="sr-only">
              {priorDelta > 0 ? "Up" : priorDelta < 0 ? "Down" : "Unchanged"} against prior:{" "}
            </span>
            {priorDelta === 0 ? "no change" : formatRatio(Math.abs(priorDelta), block.unit)} vs prior
          </span>
        ) : null}
      </div>

      <p className="mt-1.5 text-sm font-medium text-foreground">{block.ratioName}</p>

      <dl className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label={block.numeratorLabel} value={formatNumber(block.numeratorValue)} />
        <Stat label={block.denominatorLabel} value={formatNumber(block.denominatorValue)} />
        <Stat
          label="Prior period"
          value={block.priorValue !== null ? formatRatio(block.priorValue, block.unit) : "—"}
          hint={block.priorValue === null ? "No prior-period value among the inputs." : undefined}
        />
      </dl>

      <Derivation label="Formula">
        <span className="font-mono">{block.formula}</span>
      </Derivation>

      {block.benchmarkValue !== null ? (
        <div className="mt-3 rounded-md border border-border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[0.6875rem] font-medium tracking-wide text-muted-foreground uppercase">
              Benchmark
            </p>
            {benchmarkDelta !== null ? (
              <span className="font-mono text-xs tabular-nums text-muted-foreground">
                {benchmarkDelta === 0
                  ? "In line with benchmark"
                  : `${benchmarkDelta > 0 ? "Above" : "Below"} benchmark by ${formatRatio(
                      Math.abs(benchmarkDelta),
                      block.unit,
                    )}`}
              </span>
            ) : null}
          </div>
          <p className="mt-1 font-mono text-sm font-semibold tabular-nums">
            {formatRatio(block.benchmarkValue, block.unit)}
          </p>
          {block.benchmarkSource ? (
            <p className="mt-1 text-xs text-muted-foreground">Source: {block.benchmarkSource}</p>
          ) : (
            <p className="mt-1 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
              <RiErrorWarningLine className="size-3.5 shrink-0" aria-hidden />
              No source named for this benchmark — do not rely on it.
            </p>
          )}
        </div>
      ) : null}

      <p className="mt-3 flex items-start gap-1.5 text-sm">
        <RiInformationLine className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <span>
          <span className="font-medium">Interpretation: </span>
          <span className="text-muted-foreground">{block.interpretation}</span>
        </span>
      </p>

      <BlockFooter commentary={block.commentary} evidence={block.evidence} />
    </BlockShell>
  );
}
