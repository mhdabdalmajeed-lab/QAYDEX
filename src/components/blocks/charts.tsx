"use client";

/**
 * Chart renderers for the generative interface (PRD §18).
 *
 * `"use client"` is mandatory: recharts 3 does not server-render. Every chart therefore sits in a
 * fixed-height container so the page does not reflow when hydration fills it in.
 *
 * Accessibility contract (PRD §26.4) — every chart in this file satisfies both halves:
 *
 *  1. **Nothing is signalled by colour alone.** Severity always carries an icon and a word via
 *     `SeverityBadge`; scatter outliers change *shape*, not just hue; waterfall steps carry a
 *     signed value label; bar highlights carry a stroke and a named list.
 *  2. **The numbers are always reachable without seeing the chart.** The recharts SVG is
 *     `role="img"` with a descriptive `aria-label`, and the underlying figures ship as a real
 *     table. Where a chart's numbers are already rendered visibly and in full (pie, donut,
 *     waterfall) that visible table *is* the fallback — duplicating it into an `sr-only` copy
 *     would make screen readers read every figure twice. Everywhere else the fallback is the
 *     `sr-only` `<ChartDataTable />`.
 */

import {
  RiArrowDownLine,
  RiArrowUpLine,
  RiErrorWarningLine,
  RiFocus3Line,
  RiSubtractLine,
} from "@remixicon/react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ReferenceLine,
  Scatter,
  ScatterChart,
  XAxis,
  YAxis,
  ZAxis,
} from "recharts";

import {
  ChartDataTable,
  ClaimBadge,
  Empty,
  EvidenceChips,
  formatValue,
  MissingEvidenceNote,
  SeverityBadge,
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
import type { EvidenceInput } from "@/lib/ai/blocks/primitives";
import type { BlockOf } from "@/lib/ai/blocks/schemas";
import type { ClaimType, Severity } from "@/lib/ai/blocks/types";
import { cn } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/* Local shared plumbing                                                      */
/* -------------------------------------------------------------------------- */

/** The narrow slice of `chartConfigFields` every chart block shares. */
type ValueFormat = "number" | "currency" | "percent" | null;

/** Recharts wants plain rows; the model gives us arbitrary series names, so keys are synthesised. */
type ChartRow = Record<string, string | number | null>;

const CHART_HEIGHT = "aspect-auto h-72 w-full";

/**
 * A claim the model could not tie to evidence must not be able to borrow the authority of one
 * that it could (PRD §10.5, §31). `ClaimBadge` names the claim type; these classes make the
 * whole block read differently at a glance, before any label is parsed.
 */
const SPECULATIVE_CLAIMS: ReadonlySet<ClaimType> = new Set<ClaimType>([
  "unverified_hypothesis",
  "missing_information",
  "judgment_required",
]);

const CLAIM_CAVEAT: Partial<Record<ClaimType, string>> = {
  unverified_hypothesis:
    "This chart illustrates a hypothesis that has not been tested against evidence. Do not rely on it as a finding.",
  missing_information:
    "This chart is drawn from incomplete data. The gaps are material to what it appears to show.",
  judgment_required:
    "Reading this chart requires a qualified professional's judgement; it does not assert a conclusion.",
  reasonable_interpretation:
    "This chart goes beyond what the sources state directly and reflects an interpretation of them.",
  user_claim: "The figures below were supplied by a user and have not been independently corroborated.",
};

function chartColor(index: number): string {
  return `var(--chart-${(index % 5) + 1})`;
}

function seriesKey(index: number): string {
  return `s${index}`;
}

/** Series names are free text and would break `--color-<key>` CSS vars, so keys are synthesised. */
function buildSeriesConfig(series: readonly { name: string }[]): ChartConfig {
  const config: ChartConfig = {};
  series.forEach((s, i) => {
    config[seriesKey(i)] = { label: s.name, color: chartColor(i) };
  });
  return config;
}

/** Union of x labels in first-seen order; a series missing a label contributes an explicit gap. */
function collectLabels(series: readonly { points: readonly { label: string }[] }[]): string[] {
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const s of series) {
    for (const p of s.points) {
      if (!seen.has(p.label)) {
        seen.add(p.label);
        labels.push(p.label);
      }
    }
  }
  return labels;
}

function buildSeriesRows(
  series: readonly { name: string; points: readonly { label: string; value: number }[] }[],
): ChartRow[] {
  return collectLabels(series).map((label) => {
    const row: ChartRow = { label };
    series.forEach((s, i) => {
      const point = s.points.find((p) => p.label === label);
      // null, not 0 — a series with no reading at this label must not draw a floor.
      row[seriesKey(i)] = point ? point.value : null;
    });
    return row;
  });
}

function numberAt(row: ChartRow, key: string): number | null {
  const value = row[key];
  return typeof value === "number" ? value : null;
}

function makeFormatter(format: ValueFormat, currency: string | null): (value: number) => string {
  return (value: number) => formatValue(value, format, currency ?? undefined);
}

/** Compact tick labels: an axis full of "$1,240,000" is unreadable at 72px of height. */
function makeTickFormatter(format: ValueFormat, currency: string | null): (value: number) => string {
  const full = makeFormatter(format, currency);
  return (value: number) => {
    if (!Number.isFinite(value)) return "";
    const magnitude = Math.abs(value);
    if (format !== "percent" && magnitude >= 1_000_000) return `${full(value / 1_000_000)}M`;
    if (format !== "percent" && magnitude >= 10_000) return `${full(value / 1_000)}k`;
    return full(value);
  };
}

function seriesTable(
  series: readonly { name: string; points: readonly { label: string; value: number }[] }[],
  rows: readonly ChartRow[],
  format: ValueFormat,
  currency: string | null,
  xLabel: string | null,
): { columns: string[]; rows: (string | number)[][] } {
  const fmt = makeFormatter(format, currency);
  return {
    columns: [xLabel ?? "Category", ...series.map((s) => s.name)],
    rows: rows.map((row) => {
      const label = row.label;
      const cells: (string | number)[] = [typeof label === "string" ? label : ""];
      series.forEach((_, i) => {
        const value = numberAt(row, seriesKey(i));
        cells.push(value === null ? "No data" : fmt(value));
      });
      return cells;
    }),
  };
}

/**
 * The chrome every chart block shares. Kept local rather than in `shared.tsx` because it encodes
 * chart-specific rules (fixed height, claim-aware framing, evidence footer ordering).
 */
function ChartBlockFrame({
  title,
  claimType,
  commentary,
  evidence,
  aside,
  children,
}: {
  title: string;
  claimType: ClaimType;
  commentary: string | null;
  evidence: EvidenceInput[];
  /** Chart-specific context rendered between the header and the chart (thresholds, criteria). */
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  const speculative = SPECULATIVE_CLAIMS.has(claimType);
  const caveat = CLAIM_CAVEAT[claimType];

  return (
    <section
      className={cn(
        "rounded-xl bg-card p-5 text-card-foreground ring-1 ring-foreground/10",
        // A guess is framed like a guess: dashed, tinted, unmistakably not a finding.
        speculative && "border border-dashed border-amber-500/50 bg-amber-500/[0.03] ring-0",
      )}
    >
      <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <h3 className="font-heading text-base leading-snug font-medium">{title}</h3>
        <ClaimBadge claimType={claimType} />
      </header>

      {caveat ? (
        <p
          className={cn(
            "mb-3 flex items-start gap-1.5 text-xs leading-relaxed",
            speculative ? "text-amber-700 dark:text-amber-300" : "text-muted-foreground",
          )}
        >
          {speculative ? <RiErrorWarningLine className="mt-px size-3.5 shrink-0" aria-hidden /> : null}
          <span>{caveat}</span>
        </p>
      ) : null}

      {aside ? <div className="mb-3">{aside}</div> : null}

      {children}

      {commentary ? (
        <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{commentary}</p>
      ) : null}

      <footer className="mt-4 border-t border-border pt-3">
        {evidence.length > 0 ? <EvidenceChips evidence={evidence} /> : <MissingEvidenceNote />}
      </footer>
    </section>
  );
}

/** A visible, non-colour key. Charts lean on this so hue is never load-bearing on its own. */
function ChartKey({
  items,
}: {
  items: { label: string; color?: string; icon?: React.ReactNode; note?: string }[];
}) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          {item.icon ?? (
            <span
              aria-hidden
              className="size-2.5 shrink-0 rounded-[2px]"
              style={{ backgroundColor: item.color }}
            />
          )}
          <span className="text-foreground">{item.label}</span>
          {item.note ? <span>{item.note}</span> : null}
        </li>
      ))}
    </ul>
  );
}

/* -------------------------------------------------------------------------- */
/* bar_chart                                                                  */
/* -------------------------------------------------------------------------- */

export function BarChartBlock({ block }: { block: BlockOf<"bar_chart"> }) {
  const { series, orientation, stacked, sortOrder, highlightLabels, valueFormat, currency } = block;

  if (series.length === 0 || series.every((s) => s.points.length === 0)) {
    return (
      <ChartBlockFrame
        title={block.title}
        claimType={block.claimType}
        commentary={block.commentary}
        evidence={block.evidence}
      >
        <Empty>No categories were returned for this chart.</Empty>
      </ChartBlockFrame>
    );
  }

  const keys = series.map((_, i) => seriesKey(i));
  const rows = sortRows(buildSeriesRows(series), keys, sortOrder);
  const config = buildSeriesConfig(series);
  const highlighted = new Set(highlightLabels);
  const horizontal = orientation === "horizontal";
  const tick = makeTickFormatter(valueFormat, currency);
  const table = seriesTable(series, rows, valueFormat, currency, block.xLabel);

  // Long category labels get laid on their side rather than truncated into ambiguity.
  const slanted = !horizontal && rows.length > 6;

  return (
    <ChartBlockFrame
      title={block.title}
      claimType={block.claimType}
      commentary={block.commentary}
      evidence={block.evidence}
      aside={
        highlightLabels.length > 0 ? (
          <ChartKey
            items={[
              {
                label: "Emphasised",
                icon: <RiFocus3Line className="size-3.5 shrink-0" aria-hidden />,
                note: highlightLabels.join(", "),
              },
            ]}
          />
        ) : null
      }
    >
      <ChartContainer
        config={config}
        className={CHART_HEIGHT}
        role="img"
        aria-label={`Bar chart. ${block.title}. ${series.length} series across ${rows.length} categories. The figures follow in a table.`}
      >
        <BarChart
          accessibilityLayer
          data={rows}
          layout={horizontal ? "vertical" : "horizontal"}
          margin={{ top: 8, right: 12, bottom: 4, left: 4 }}
        >
          <CartesianGrid vertical={horizontal} horizontal={!horizontal} strokeDasharray="3 3" />
          {/* Both axes are direct children in every orientation — recharts identifies them by
              walking its immediate children, so they must never be wrapped or conditional. */}
          <XAxis
            type={horizontal ? "number" : "category"}
            dataKey={horizontal ? undefined : "label"}
            tickFormatter={horizontal ? tick : undefined}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval={0}
            angle={slanted ? -35 : 0}
            textAnchor={slanted ? "end" : "middle"}
            height={slanted ? 64 : 30}
          />
          <YAxis
            type={horizontal ? "category" : "number"}
            dataKey={horizontal ? "label" : undefined}
            tickFormatter={horizontal ? undefined : tick}
            tickLine={false}
            axisLine={false}
            width={horizontal ? 120 : 72}
            tickMargin={8}
          />
          <ChartTooltip content={<ChartTooltipContent labelKey="label" />} />
          {series.map((s, i) => (
            <Bar
              key={s.name}
              dataKey={seriesKey(i)}
              name={s.name}
              stackId={stacked ? "stack" : undefined}
              fill={`var(--color-${seriesKey(i)})`}
              radius={stacked ? 0 : 3}
              isAnimationActive={false}
            >
              {rows.map((row) => {
                const label = row.label;
                const isHighlighted = typeof label === "string" && highlighted.has(label);
                return (
                  <Cell
                    key={String(label)}
                    // Emphasis is an outline, not a hue swap — the category is also named above.
                    stroke={isHighlighted ? "var(--foreground)" : undefined}
                    strokeWidth={isHighlighted ? 2 : 0}
                  />
                );
              })}
            </Bar>
          ))}
        </BarChart>
      </ChartContainer>

      <ChartDataTable caption={`${block.title} — chart data`} columns={table.columns} rows={table.rows} />
    </ChartBlockFrame>
  );
}

function sortRows(
  rows: ChartRow[],
  keys: readonly string[],
  order: BlockOf<"bar_chart">["sortOrder"],
): ChartRow[] {
  if (order === "as_given") return rows;

  const total = (row: ChartRow): number =>
    keys.reduce((acc, key) => acc + (numberAt(row, key) ?? 0), 0);

  const sorted = [...rows];
  if (order === "label_asc") {
    sorted.sort((a, b) => String(a.label).localeCompare(String(b.label)));
  } else if (order === "value_desc") {
    sorted.sort((a, b) => total(b) - total(a));
  } else {
    sorted.sort((a, b) => total(a) - total(b));
  }
  return sorted;
}

/* -------------------------------------------------------------------------- */
/* line_chart                                                                 */
/* -------------------------------------------------------------------------- */

export function LineChartBlock({ block }: { block: BlockOf<"line_chart"> }) {
  const { series, showMarkers, referenceLines, annotations, valueFormat, currency } = block;

  if (series.length === 0 || series.every((s) => s.points.length === 0)) {
    return (
      <ChartBlockFrame
        title={block.title}
        claimType={block.claimType}
        commentary={block.commentary}
        evidence={block.evidence}
      >
        <Empty>No points were returned for this chart.</Empty>
      </ChartBlockFrame>
    );
  }

  const rows = buildSeriesRows(series);
  const config = buildSeriesConfig(series);
  const fmt = makeFormatter(valueFormat, currency);
  const tick = makeTickFormatter(valueFormat, currency);
  const table = seriesTable(series, rows, valueFormat, currency, block.xLabel ?? "Period");

  // A reference line on the x axis needs a category, and the schema types it as a number, so only
  // y-axis thresholds can be drawn. All of them are listed in words below so none is lost.
  const drawableReferenceLines = referenceLines.filter((line) => line.axis === "y");

  return (
    <ChartBlockFrame
      title={block.title}
      claimType={block.claimType}
      commentary={block.commentary}
      evidence={block.evidence}
      aside={
        referenceLines.length > 0 ? (
          <ChartKey
            items={referenceLines.map((line) => ({
              label: line.label,
              icon: <span aria-hidden className="h-px w-4 shrink-0 border-t border-dashed border-foreground" />,
              note: `${fmt(line.value)} (${line.axis} axis)`,
            }))}
          />
        ) : null
      }
    >
      <ChartContainer
        config={config}
        className={CHART_HEIGHT}
        role="img"
        aria-label={`Line chart. ${block.title}. ${series.length} series across ${rows.length} points on the ${
          block.xAxisType === "time" ? "time" : "category"
        } axis. The figures follow in a table.`}
      >
        <LineChart accessibilityLayer data={rows} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
          <YAxis tickFormatter={tick} tickLine={false} axisLine={false} width={72} tickMargin={8} />
          <ChartTooltip content={<ChartTooltipContent labelKey="label" />} />
          {drawableReferenceLines.map((line) => (
            <ReferenceLine
              key={`${line.label}-${line.value}`}
              y={line.value}
              stroke="var(--foreground)"
              strokeDasharray="4 4"
              strokeOpacity={0.6}
              label={{ value: line.label, position: "insideTopRight", fontSize: 11 }}
            />
          ))}
          {annotations.map((annotation) => (
            <ReferenceLine
              key={`${annotation.xLabel}-${annotation.note}`}
              x={annotation.xLabel}
              stroke="var(--muted-foreground)"
              strokeDasharray="2 4"
            />
          ))}
          {series.map((s, i) => (
            <Line
              key={s.name}
              type="monotone"
              dataKey={seriesKey(i)}
              name={s.name}
              stroke={`var(--color-${seriesKey(i)})`}
              strokeWidth={2}
              dot={showMarkers ? { r: 2.5 } : false}
              activeDot={{ r: 4 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ChartContainer>

      <ChartDataTable caption={`${block.title} — chart data`} columns={table.columns} rows={table.rows} />

      {annotations.length > 0 ? (
        <ul className="mt-3 space-y-1.5">
          {annotations.map((annotation) => (
            <li
              key={`${annotation.xLabel}-${annotation.note}`}
              className="flex flex-wrap items-baseline gap-2 text-sm"
            >
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {annotation.xLabel}
              </span>
              {annotation.severity ? <SeverityBadge severity={annotation.severity} /> : null}
              <span className="text-foreground">{annotation.note}</span>
            </li>
          ))}
        </ul>
      ) : null}
    </ChartBlockFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* area_chart                                                                 */
/* -------------------------------------------------------------------------- */

export function AreaChartBlock({ block }: { block: BlockOf<"area_chart"> }) {
  const { series, stacked, cumulative, baselineZero, valueFormat, currency } = block;

  if (series.length === 0 || series.every((s) => s.points.length === 0)) {
    return (
      <ChartBlockFrame
        title={block.title}
        claimType={block.claimType}
        commentary={block.commentary}
        evidence={block.evidence}
      >
        <Empty>No points were returned for this chart.</Empty>
      </ChartBlockFrame>
    );
  }

  const rows = buildSeriesRows(series);
  const config = buildSeriesConfig(series);
  const tick = makeTickFormatter(valueFormat, currency);
  const table = seriesTable(series, rows, valueFormat, currency, block.xLabel ?? "Period");

  const basisNotes: string[] = [];
  if (stacked) basisNotes.push("Series are stacked and sum to the total.");
  if (cumulative) basisNotes.push("Values are running totals, not per-period amounts.");
  // A truncated axis can make a 2% move look like a collapse — say so rather than let it mislead.
  if (!baselineZero) basisNotes.push("The value axis does not start at zero.");

  return (
    <ChartBlockFrame
      title={block.title}
      claimType={block.claimType}
      commentary={block.commentary}
      evidence={block.evidence}
      aside={
        basisNotes.length > 0 ? (
          <p className="text-xs text-muted-foreground">{basisNotes.join(" ")}</p>
        ) : null
      }
    >
      <ChartContainer
        config={config}
        className={CHART_HEIGHT}
        role="img"
        aria-label={`Area chart. ${block.title}. ${series.length} ${
          stacked ? "stacked " : ""
        }series across ${rows.length} points. The figures follow in a table.`}
      >
        <AreaChart accessibilityLayer data={rows} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} minTickGap={16} />
          <YAxis
            tickFormatter={tick}
            tickLine={false}
            axisLine={false}
            width={72}
            tickMargin={8}
            domain={baselineZero ? [0, "auto"] : ["auto", "auto"]}
          />
          <ChartTooltip content={<ChartTooltipContent labelKey="label" />} />
          {series.map((s, i) => (
            <Area
              key={s.name}
              type="monotone"
              dataKey={seriesKey(i)}
              name={s.name}
              stackId={stacked ? "stack" : undefined}
              stroke={`var(--color-${seriesKey(i)})`}
              fill={`var(--color-${seriesKey(i)})`}
              fillOpacity={stacked ? 0.55 : 0.2}
              strokeWidth={2}
              connectNulls={false}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ChartContainer>

      <ChartDataTable caption={`${block.title} — chart data`} columns={table.columns} rows={table.rows} />
    </ChartBlockFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* pie_chart / donut_chart                                                    */
/* -------------------------------------------------------------------------- */

type SliceInput = {
  label: string;
  value: number;
  percentOfTotal: number | null;
  note: string | null;
};

type SliceRow = {
  label: string;
  value: number;
  percent: number | null;
  percentLabel: string;
  note: string | null;
  color: string;
};

function buildSlices(slices: readonly SliceInput[], total: number): SliceRow[] {
  return slices.map((slice, i) => {
    // The schema asks the model to compute percentOfTotal; deriving it is a fallback, never a guess.
    const percent =
      slice.percentOfTotal ?? (total !== 0 ? (slice.value / total) * 100 : null);
    return {
      label: slice.label,
      value: slice.value,
      percent,
      percentLabel: percent === null ? "" : `${percent.toFixed(1)}%`,
      note: slice.note,
      color: chartColor(i),
    };
  });
}

function buildSliceConfig(rows: readonly SliceRow[]): ChartConfig {
  const config: ChartConfig = {};
  rows.forEach((row, i) => {
    config[seriesKey(i)] = { label: row.label, color: row.color };
  });
  return config;
}

/** A part-to-whole chart whose parts do not make the whole is a defect worth naming, not hiding. */
function totalMismatch(slices: readonly SliceInput[], total: number): number | null {
  const sum = slices.reduce((acc, s) => acc + s.value, 0);
  const difference = sum - total;
  const scale = Math.max(Math.abs(total), Math.abs(sum));
  if (scale === 0) return null;
  return Math.abs(difference) / scale > 0.005 ? difference : null;
}

function TotalMismatchNotice({
  difference,
  format,
  currency,
}: {
  difference: number;
  format: ValueFormat;
  currency: string | null;
}) {
  const fmt = makeFormatter(format, currency);
  return (
    <p className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300">
      <RiErrorWarningLine className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>
        The slices sum to {fmt(difference > 0 ? difference : -difference)}{" "}
        {difference > 0 ? "more" : "less"} than the stated total. The parts do not make the whole.
      </span>
    </p>
  );
}

/** The visible legend doubles as the accessible data table — see the header note. */
function SliceLegend({
  rows,
  total,
  totalLabel,
  format,
  currency,
  caption,
}: {
  rows: readonly SliceRow[];
  total: number;
  totalLabel: string;
  format: ValueFormat;
  currency: string | null;
  caption: string;
}) {
  const fmt = makeFormatter(format, currency);
  return (
    <Table>
      <caption className="sr-only">{caption}</caption>
      <TableHeader>
        <TableRow>
          <TableHead>Slice</TableHead>
          <TableHead className="text-right">Value</TableHead>
          <TableHead className="text-right">Share</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.label}>
            <TableCell>
              <span className="flex items-center gap-2">
                <span
                  aria-hidden
                  className="size-2.5 shrink-0 rounded-[2px]"
                  style={{ backgroundColor: row.color }}
                />
                <span className="font-medium text-foreground">{row.label}</span>
              </span>
              {row.note ? <span className="mt-0.5 block text-xs text-muted-foreground">{row.note}</span> : null}
            </TableCell>
            <TableCell className="text-right font-mono tabular-nums">{fmt(row.value)}</TableCell>
            <TableCell className="text-right font-mono text-muted-foreground tabular-nums">
              {row.percent === null ? "—" : `${row.percent.toFixed(1)}%`}
            </TableCell>
          </TableRow>
        ))}
        <TableRow className="border-t-2 border-border font-medium">
          <TableCell>{totalLabel}</TableCell>
          <TableCell className="text-right font-mono tabular-nums">{fmt(total)}</TableCell>
          <TableCell className="text-right font-mono text-muted-foreground tabular-nums">100.0%</TableCell>
        </TableRow>
      </TableBody>
    </Table>
  );
}

export function PieChartBlock({ block }: { block: BlockOf<"pie_chart"> }) {
  const { slices, total, valueFormat, currency, showPercentages, otherSliceLabel } = block;

  if (slices.length === 0) {
    return (
      <ChartBlockFrame
        title={block.title}
        claimType={block.claimType}
        commentary={block.commentary}
        evidence={block.evidence}
      >
        <Empty>No slices were returned for this chart.</Empty>
      </ChartBlockFrame>
    );
  }

  const rows = buildSlices(slices, total);
  const config = buildSliceConfig(rows);
  const mismatch = totalMismatch(slices, total);

  return (
    <ChartBlockFrame
      title={block.title}
      claimType={block.claimType}
      commentary={block.commentary}
      evidence={block.evidence}
      aside={
        otherSliceLabel ? (
          <p className="text-xs text-muted-foreground">
            Smaller items are rolled up into “{otherSliceLabel}”.
          </p>
        ) : null
      }
    >
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:items-center">
        <ChartContainer
          config={config}
          className={CHART_HEIGHT}
          role="img"
          aria-label={`Pie chart. ${block.title}. ${rows.length} slices of a total. The values are listed in the accompanying table.`}
        >
          <PieChart>
            <ChartTooltip content={<ChartTooltipContent nameKey="label" hideLabel />} />
            <Pie data={rows} dataKey="value" nameKey="label" outerRadius="80%" isAnimationActive={false}>
              {rows.map((row) => (
                <Cell key={row.label} fill={row.color} stroke="var(--background)" strokeWidth={1} />
              ))}
              {showPercentages ? (
                <LabelList dataKey="percentLabel" className="fill-background" fontSize={11} />
              ) : null}
            </Pie>
          </PieChart>
        </ChartContainer>

        <SliceLegend
          rows={rows}
          total={total}
          totalLabel="Total"
          format={valueFormat}
          currency={currency}
          caption={`${block.title} — slice values`}
        />
      </div>

      {mismatch !== null ? (
        <div className="mt-3">
          <TotalMismatchNotice difference={mismatch} format={valueFormat} currency={currency} />
        </div>
      ) : null}
    </ChartBlockFrame>
  );
}

export function DonutChartBlock({ block }: { block: BlockOf<"donut_chart"> }) {
  const { slices, total, valueFormat, currency, centerLabel, centerValue, centerValueFormat } = block;

  if (slices.length === 0) {
    return (
      <ChartBlockFrame
        title={block.title}
        claimType={block.claimType}
        commentary={block.commentary}
        evidence={block.evidence}
      >
        <Empty>No slices were returned for this chart.</Empty>
      </ChartBlockFrame>
    );
  }

  const rows = buildSlices(slices, total);
  const config = buildSliceConfig(rows);
  const mismatch = totalMismatch(slices, total);
  const centerText = formatValue(centerValue, centerValueFormat, currency ?? undefined);

  return (
    <ChartBlockFrame
      title={block.title}
      claimType={block.claimType}
      commentary={block.commentary}
      evidence={block.evidence}
    >
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] md:items-center">
        <div className="relative">
          <ChartContainer
            config={config}
            className={CHART_HEIGHT}
            role="img"
            aria-label={`Donut chart. ${block.title}. ${centerLabel} is ${centerText}, split into ${rows.length} slices. The values are listed in the accompanying table.`}
          >
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="label" hideLabel />} />
              <Pie
                data={rows}
                dataKey="value"
                nameKey="label"
                innerRadius="58%"
                outerRadius="82%"
                paddingAngle={1}
                isAnimationActive={false}
              >
                {rows.map((row) => (
                  <Cell key={row.label} fill={row.color} stroke="var(--background)" strokeWidth={1} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          {/* The hole reports the headline number; `aria-hidden` because the chart's own label says it. */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-0.5 text-center"
          >
            <span className="font-mono text-xl leading-none font-semibold tabular-nums">{centerText}</span>
            <span className="max-w-[8rem] text-xs leading-tight text-muted-foreground">{centerLabel}</span>
          </div>
        </div>

        <SliceLegend
          rows={rows}
          total={total}
          totalLabel={centerLabel}
          format={valueFormat}
          currency={currency}
          caption={`${block.title} — slice values`}
        />
      </div>

      {mismatch !== null ? (
        <div className="mt-3">
          <TotalMismatchNotice difference={mismatch} format={valueFormat} currency={currency} />
        </div>
      ) : null}
    </ChartBlockFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* scatter_chart                                                              */
/* -------------------------------------------------------------------------- */

type ScatterPoint = {
  x: number;
  y: number;
  label: string | null;
  seriesName: string | null;
  size: number | null;
  outlier: boolean;
};

export function ScatterChartBlock({ block }: { block: BlockOf<"scatter_chart"> }) {
  const { points, outlierCriterion, trendSlope, trendIntercept, trendRSquared, valueFormat, currency } =
    block;

  if (points.length === 0) {
    return (
      <ChartBlockFrame
        title={block.title}
        claimType={block.claimType}
        commentary={block.commentary}
        evidence={block.evidence}
      >
        <Empty>No points were returned for this chart.</Empty>
      </ChartBlockFrame>
    );
  }

  const groups = groupScatter(points);
  const config: ChartConfig = {};
  groups.forEach((group, i) => {
    config[seriesKey(i)] = { label: group.name, color: chartColor(i) };
  });

  const hasSize = points.some((p) => p.size !== null);
  const outlierCount = points.filter((p) => p.outlier).length;
  const xValues = points.map((p) => p.x);
  const xMin = Math.min(...xValues);
  const xMax = Math.max(...xValues);
  const yFmt = makeFormatter(valueFormat, currency);
  const yTick = makeTickFormatter(valueFormat, currency);
  const xFmt = makeFormatter("number", null);

  const hasTrend = trendSlope !== null && trendIntercept !== null;

  return (
    <ChartBlockFrame
      title={block.title}
      claimType={block.claimType}
      commentary={block.commentary}
      evidence={block.evidence}
      aside={
        <div className="space-y-2">
          <ChartKey
            items={[
              ...groups.map((group, i) => ({ label: group.name, color: chartColor(i) })),
              ...(outlierCount > 0
                ? [
                    {
                      label: `Outlier (${outlierCount})`,
                      // Shape, not colour: outliers are diamonds among circles.
                      icon: (
                        <span
                          aria-hidden
                          className="size-2 shrink-0 rotate-45 border border-foreground bg-foreground/30"
                        />
                      ),
                    },
                  ]
                : []),
            ]}
          />
          {outlierCount > 0 && outlierCriterion ? (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Outlier criterion:</span> {outlierCriterion}
            </p>
          ) : null}
          {hasTrend ? (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Fitted line:</span> y ={" "}
              {trendSlope.toFixed(4)}x + {trendIntercept.toFixed(4)}
              {trendRSquared !== null ? ` · R² ${trendRSquared.toFixed(3)}` : ""}
            </p>
          ) : null}
        </div>
      }
    >
      <ChartContainer
        config={config}
        className={CHART_HEIGHT}
        role="img"
        aria-label={`Scatter chart. ${block.title}. ${points.length} points${
          outlierCount > 0 ? `, of which ${outlierCount} are marked as outliers` : ""
        }. The coordinates follow in a table.`}
      >
        <ScatterChart accessibilityLayer margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="x"
            name={block.xLabel ?? "x"}
            tickFormatter={xFmt}
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            domain={["dataMin", "dataMax"]}
          />
          <YAxis
            type="number"
            dataKey="y"
            name={block.yLabel ?? "y"}
            tickFormatter={yTick}
            tickLine={false}
            axisLine={false}
            width={72}
            tickMargin={8}
          />
          {hasSize ? <ZAxis type="number" dataKey="size" range={[36, 320]} /> : null}
          <ChartTooltip cursor={{ strokeDasharray: "3 3" }} content={<ChartTooltipContent hideLabel />} />
          {hasTrend ? (
            <ReferenceLine
              segment={[
                { x: xMin, y: trendSlope * xMin + trendIntercept },
                { x: xMax, y: trendSlope * xMax + trendIntercept },
              ]}
              stroke="var(--foreground)"
              strokeDasharray="5 4"
              strokeOpacity={0.55}
              ifOverflow="extendDomain"
            />
          ) : null}
          {groups.map((group, i) => (
            <Scatter
              key={`${group.name}-normal`}
              name={group.name}
              data={group.normal}
              fill={`var(--color-${seriesKey(i)})`}
              shape="circle"
              isAnimationActive={false}
            />
          ))}
          {groups.map((group, i) =>
            group.outliers.length > 0 ? (
              <Scatter
                key={`${group.name}-outlier`}
                name={`${group.name} — outlier`}
                data={group.outliers}
                fill={`var(--color-${seriesKey(i)})`}
                stroke="var(--foreground)"
                strokeWidth={1.5}
                shape="diamond"
                isAnimationActive={false}
              />
            ) : null,
          )}
        </ScatterChart>
      </ChartContainer>

      <ChartDataTable
        caption={`${block.title} — chart data`}
        columns={[
          "Record",
          "Series",
          block.xLabel ?? "x",
          block.yLabel ?? "y",
          ...(hasSize ? ["Size"] : []),
          "Outlier",
        ]}
        rows={points.map((point) => [
          point.label ?? "Unlabelled",
          point.seriesName ?? "All records",
          xFmt(point.x),
          yFmt(point.y),
          ...(hasSize ? [point.size === null ? "—" : xFmt(point.size)] : []),
          point.outlier ? "Yes" : "No",
        ])}
      />
    </ChartBlockFrame>
  );
}

function groupScatter(points: readonly ScatterPoint[]): {
  name: string;
  normal: ScatterPoint[];
  outliers: ScatterPoint[];
}[] {
  const groups = new Map<string, { name: string; normal: ScatterPoint[]; outliers: ScatterPoint[] }>();
  for (const point of points) {
    const name = point.seriesName ?? "All records";
    let group = groups.get(name);
    if (!group) {
      group = { name, normal: [], outliers: [] };
      groups.set(name, group);
    }
    if (point.outlier) group.outliers.push(point);
    else group.normal.push(point);
  }
  return [...groups.values()];
}

/* -------------------------------------------------------------------------- */
/* waterfall_chart                                                            */
/* -------------------------------------------------------------------------- */

type WaterfallKind = "total" | "increase" | "decrease";

type WaterfallRow = {
  label: string;
  range: [number, number];
  kind: WaterfallKind;
  delta: number | null;
  running: number;
  note: string | null;
  severity: Severity | null;
  deltaLabel: string;
};

const WATERFALL_COLOR: Record<WaterfallKind, string> = {
  total: "var(--muted-foreground)",
  increase: "var(--chart-2)",
  decrease: "var(--chart-4)",
};

export function WaterfallChartBlock({ block }: { block: BlockOf<"waterfall_chart"> }) {
  const { startLabel, startValue, steps, endLabel, endValue, reconciles, valueFormat, currency } = block;

  const fmt = makeFormatter(valueFormat, currency);
  const tick = makeTickFormatter(valueFormat, currency);
  const rows = buildWaterfall(block, fmt);

  // Recompute the bridge rather than take `reconciles` on trust — the arithmetic is the point.
  const computedEnd = startValue + steps.reduce((acc, s) => acc + (s.category === "subtotal" ? 0 : s.delta), 0);
  const residual = computedEnd - endValue;
  const scale = Math.max(Math.abs(endValue), Math.abs(computedEnd), 1);
  const tiesArithmetically = Math.abs(residual) / scale <= 0.005;
  const flagged = steps.filter((step) => step.severity !== null);

  return (
    <ChartBlockFrame
      title={block.title}
      claimType={block.claimType}
      commentary={block.commentary}
      evidence={block.evidence}
      aside={
        <ChartKey
          items={[
            { label: "Opening / closing", color: WATERFALL_COLOR.total },
            { label: "Increase", color: WATERFALL_COLOR.increase },
            { label: "Decrease", color: WATERFALL_COLOR.decrease },
          ]}
        />
      }
    >
      {!reconciles || !tiesArithmetically ? (
        <p className="mb-3 flex items-start gap-1.5 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <RiErrorWarningLine className="mt-px size-3.5 shrink-0" aria-hidden />
          <span>
            <span className="font-medium">This bridge does not tie.</span> {fmt(startValue)} plus the steps
            below gives {fmt(computedEnd)}, against a stated {endLabel.toLowerCase()} of {fmt(endValue)} — a
            residual of {fmt(residual)}. The steps do not explain the whole movement.
          </span>
        </p>
      ) : null}

      <ChartContainer
        config={{ range: { label: "Value" } }}
        className={CHART_HEIGHT}
        role="img"
        aria-label={`Waterfall chart bridging ${startLabel} of ${fmt(startValue)} to ${endLabel} of ${fmt(
          endValue,
        )} through ${steps.length} steps. Every step is listed in the table below.`}
      >
        <BarChart data={rows} margin={{ top: 20, right: 12, bottom: 4, left: 4 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tickMargin={8}
            interval={0}
            angle={rows.length > 5 ? -35 : 0}
            textAnchor={rows.length > 5 ? "end" : "middle"}
            height={rows.length > 5 ? 64 : 30}
          />
          <YAxis tickFormatter={tick} tickLine={false} axisLine={false} width={72} tickMargin={8} />
          <ReferenceLine y={0} stroke="var(--border)" />
          <Bar dataKey="range" radius={2} isAnimationActive={false}>
            {rows.map((row) => (
              <Cell key={row.label} fill={WATERFALL_COLOR[row.kind]} />
            ))}
            {/* The signed amount above each bar carries the direction in text, not only in hue. */}
            <LabelList dataKey="deltaLabel" position="top" fontSize={11} className="fill-foreground" />
          </Bar>
        </BarChart>
      </ChartContainer>

      {/* Visible, and therefore the accessible fallback: an auditor wants these figures anyway. */}
      <div className="mt-4">
        <Table>
          <caption className="sr-only">{block.title} — bridge steps</caption>
          <TableHeader>
            <TableRow>
              <TableHead>Step</TableHead>
              <TableHead className="text-right">Movement</TableHead>
              <TableHead className="text-right">Running total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.label} className={row.kind === "total" ? "bg-muted/40 font-medium" : undefined}>
                <TableCell>
                  <span className="flex flex-wrap items-center gap-2">
                    <DirectionIcon delta={row.delta} />
                    <span className="text-foreground">{row.label}</span>
                    {row.severity ? <SeverityBadge severity={row.severity} /> : null}
                  </span>
                  {row.note ? <span className="mt-0.5 block text-xs text-muted-foreground">{row.note}</span> : null}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">
                  {row.delta === null ? "—" : row.deltaLabel}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums">{fmt(row.running)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {flagged.length > 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {flagged.length === 1 ? "One step is" : `${flagged.length} steps are`} flagged as an exception in
          their own right; see the severity labels above.
        </p>
      ) : null}
    </ChartBlockFrame>
  );
}

function DirectionIcon({ delta }: { delta: number | null }) {
  if (delta === null || delta === 0) {
    return <RiSubtractLine className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />;
  }
  return delta > 0 ? (
    <RiArrowUpLine className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
  ) : (
    <RiArrowDownLine className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
  );
}

function buildWaterfall(
  block: BlockOf<"waterfall_chart">,
  fmt: (value: number) => string,
): WaterfallRow[] {
  const rows: WaterfallRow[] = [];
  let running = block.startValue;

  rows.push({
    label: block.startLabel,
    range: [Math.min(0, running), Math.max(0, running)],
    kind: "total",
    delta: null,
    running,
    note: null,
    severity: null,
    deltaLabel: fmt(running),
  });

  for (const step of block.steps) {
    if (step.category === "subtotal") {
      // A subtotal restates the running total; its delta is defined as zero by the schema.
      rows.push({
        label: step.label,
        range: [Math.min(0, running), Math.max(0, running)],
        kind: "total",
        delta: null,
        running,
        note: step.note,
        severity: step.severity,
        deltaLabel: fmt(running),
      });
      continue;
    }

    const next = running + step.delta;
    rows.push({
      label: step.label,
      range: [Math.min(running, next), Math.max(running, next)],
      kind: step.delta >= 0 ? "increase" : "decrease",
      delta: step.delta,
      running: next,
      note: step.note,
      severity: step.severity,
      deltaLabel: `${step.delta > 0 ? "+" : step.delta < 0 ? "−" : ""}${fmt(Math.abs(step.delta))}`,
    });
    running = next;
  }

  rows.push({
    label: block.endLabel,
    range: [Math.min(0, block.endValue), Math.max(0, block.endValue)],
    kind: "total",
    delta: null,
    running: block.endValue,
    note: null,
    severity: null,
    deltaLabel: fmt(block.endValue),
  });

  return rows;
}
