import { fmtMoney, fmtNumber, fmtPercent } from "@/lib/export/types";

/**
 * Chart geometry for exports.
 *
 * PRD §24 requires that an export preserve charts. recharts cannot help here: it does not
 * server-render at all, so there is no image to embed. Instead every chart is reduced to a flat
 * scene of primitives — rectangles, lines, paths, circles and text — which the PDF renderer
 * draws with `@react-pdf/renderer`'s own SVG components and the HTML renderer draws as inline
 * `<svg>`. One geometry pass, two outputs, no possibility of the two disagreeing.
 *
 * Everything here is pure arithmetic with no DOM and no React, which is also what makes it
 * testable and what makes it safe to call inside a request handler.
 */

export type ValueFormat = "number" | "currency" | "percent" | null;

export type RectShape = {
  kind: "rect";
  x: number;
  y: number;
  w: number;
  h: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
};

export type LineShape = {
  kind: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  strokeWidth: number;
  /** SVG dash array, e.g. "3 2". */
  dash?: string;
  opacity?: number;
};

export type PathShape = {
  kind: "path";
  d: string;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
};

export type CircleShape = {
  kind: "circle";
  cx: number;
  cy: number;
  r: number;
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
};

export type TextShape = {
  kind: "text";
  x: number;
  y: number;
  text: string;
  size: number;
  fill: string;
  anchor: "start" | "middle" | "end";
  bold?: boolean;
};

export type Shape = RectShape | LineShape | PathShape | CircleShape | TextShape;

export type LegendEntry = { label: string; color: string };

export type ChartScene = {
  width: number;
  height: number;
  shapes: Shape[];
  legend: LegendEntry[];
};

/* -------------------------------------------------------------------------- */
/* Palette                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Print-first: fixed hexes rather than CSS variables, because a PDF has no theme to read and a
 * report gets printed in greyscale. The ramp is ordered so that adjacent series stay
 * distinguishable once the colour is gone.
 */
export const CHART_PALETTE = [
  "#2f6feb",
  "#0f9d8b",
  "#8f5ad6",
  "#c2410c",
  "#0e7490",
  "#be185d",
  "#4d7c0f",
  "#57534e",
] as const;

export const INK = "#1f2937";
export const MUTED_INK = "#6b7280";
export const GRID = "#e5e7eb";
export const AXIS = "#9ca3af";
export const POSITIVE = "#0f9d8b";
export const NEGATIVE = "#b42318";
export const NEUTRAL = "#64748b";
export const HIGHLIGHT = "#b42318";

export function seriesColor(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length];
}

/* -------------------------------------------------------------------------- */
/* Scales and ticks                                                           */
/* -------------------------------------------------------------------------- */

export function formatValue(value: number, format: ValueFormat, currency: string | null): string {
  switch (format) {
    case "currency":
      return fmtMoney(value, currency);
    case "percent":
      return fmtPercent(value);
    default:
      return fmtNumber(value, Math.abs(value) >= 100 ? 0 : 2);
  }
}

/** Compact axis labels: an axis of "1,200,000" repeated six times is unreadable. */
export function compactValue(value: number, format: ValueFormat, currency: string | null): string {
  const abs = Math.abs(value);
  if (format === "percent") return `${fmtNumber(value, abs < 10 ? 1 : 0)}%`;

  const prefix = format === "currency" ? currencySymbol(currency) : "";
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000_000) return `${sign}${prefix}${fmtNumber(abs / 1_000_000_000, 1)}bn`;
  if (abs >= 1_000_000) return `${sign}${prefix}${fmtNumber(abs / 1_000_000, 1)}m`;
  if (abs >= 1_000) return `${sign}${prefix}${fmtNumber(abs / 1_000, abs >= 10_000 ? 0 : 1)}k`;
  return `${sign}${prefix}${fmtNumber(abs, abs < 10 ? 2 : 0)}`;
}

function currencySymbol(currency: string | null): string {
  if (!currency) return "";
  try {
    // Intl gives the right glyph for the code without us maintaining a table of them.
    const parts = new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).formatToParts(0);
    return parts.find((p) => p.type === "currency")?.value ?? `${currency} `;
  } catch {
    return `${currency} `;
  }
}

/** Axis ticks on 1/2/5×10ⁿ boundaries — the values a finance reader expects to see. */
export function niceTicks(min: number, max: number, target = 5): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [0];
  if (min === max) {
    if (min === 0) return [0, 1];
    const pad = Math.abs(min) * 0.1;
    min -= pad;
    max += pad;
  }
  const span = max - min;
  const rawStep = span / Math.max(1, target);
  const magnitude = Math.pow(10, Math.floor(Math.log10(rawStep)));
  const normalised = rawStep / magnitude;
  const step = (normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10) * magnitude;

  const first = Math.floor(min / step) * step;
  const last = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  // Guard the loop: a pathological span/step could otherwise spin.
  for (let v = first, i = 0; v <= last + step * 1e-9 && i < 64; v += step, i++) {
    // Re-round: repeated addition of a float step drifts (0.1+0.2 territory).
    ticks.push(Number((Math.round(v / step) * step).toPrecision(12)));
  }
  return ticks;
}

/** Rough advance width for Helvetica at a given size. Good enough for label collision. */
export function textWidth(text: string, size: number): number {
  return text.length * size * 0.52;
}

export function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, Math.max(1, max - 1))}…`;
}

/* -------------------------------------------------------------------------- */
/* Shared plot frame                                                          */
/* -------------------------------------------------------------------------- */

export type ChartSize = { width: number; height: number };

export const DEFAULT_CHART_SIZE: ChartSize = { width: 512, height: 220 };

type Frame = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  innerWidth: number;
  innerHeight: number;
};

function frameOf(size: ChartSize, opts: { left: number; bottom: number; top?: number; right?: number }): Frame {
  const top = opts.top ?? 12;
  const right = opts.right ?? 14;
  return {
    left: opts.left,
    right,
    top,
    bottom: opts.bottom,
    innerWidth: Math.max(10, size.width - opts.left - right),
    innerHeight: Math.max(10, size.height - top - opts.bottom),
  };
}

type AxisArgs = {
  frame: Frame;
  size: ChartSize;
  ticks: number[];
  toY: (v: number) => number;
  format: ValueFormat;
  currency: string | null;
  yLabel: string | null;
  xLabel: string | null;
};

/** Horizontal gridlines, y tick labels and the two axis lines. */
function axisShapes({ frame, size, ticks, toY, format, currency, yLabel, xLabel }: AxisArgs): Shape[] {
  const shapes: Shape[] = [];

  for (const tick of ticks) {
    const y = toY(tick);
    if (y < frame.top - 1 || y > size.height - frame.bottom + 1) continue;
    shapes.push({
      kind: "line",
      x1: frame.left,
      y1: y,
      x2: frame.left + frame.innerWidth,
      y2: y,
      stroke: tick === 0 ? AXIS : GRID,
      strokeWidth: tick === 0 ? 0.8 : 0.5,
    });
    shapes.push({
      kind: "text",
      x: frame.left - 5,
      y: y + 2.6,
      text: compactValue(tick, format, currency),
      size: 7,
      fill: MUTED_INK,
      anchor: "end",
    });
  }

  shapes.push({
    kind: "line",
    x1: frame.left,
    y1: frame.top,
    x2: frame.left,
    y2: size.height - frame.bottom,
    stroke: AXIS,
    strokeWidth: 0.8,
  });

  if (yLabel) {
    shapes.push({
      kind: "text",
      x: frame.left - 5,
      y: frame.top - 4,
      text: truncate(yLabel, 28),
      size: 7,
      fill: MUTED_INK,
      anchor: "end",
      bold: true,
    });
  }
  if (xLabel) {
    shapes.push({
      kind: "text",
      x: frame.left + frame.innerWidth,
      y: size.height - 3,
      text: truncate(xLabel, 40),
      size: 7,
      fill: MUTED_INK,
      anchor: "end",
      bold: true,
    });
  }

  return shapes;
}

/**
 * Category labels along the x axis. Long or numerous labels are thinned rather than overlapped —
 * a chart that prints its labels on top of each other is worse than one that prints every third.
 */
function categoryLabels(
  labels: string[],
  frame: Frame,
  size: ChartSize,
  bandWidth: number,
): Shape[] {
  const maxChars = Math.max(3, Math.floor(bandWidth / 3.9));
  const everyNth = Math.max(1, Math.ceil((labels.length * 34) / Math.max(1, frame.innerWidth)));
  const shapes: Shape[] = [];
  labels.forEach((label, index) => {
    if (index % everyNth !== 0) return;
    shapes.push({
      kind: "text",
      x: frame.left + bandWidth * (index + 0.5),
      y: size.height - frame.bottom + 10,
      text: truncate(label, maxChars),
      size: 7,
      fill: MUTED_INK,
      anchor: "middle",
    });
  });
  return shapes;
}

/* -------------------------------------------------------------------------- */
/* Bar chart                                                                  */
/* -------------------------------------------------------------------------- */

export type SeriesInput = { name: string; points: { label: string; value: number }[] };

export type BarChartArgs = {
  series: SeriesInput[];
  orientation: "vertical" | "horizontal";
  stacked: boolean;
  sortOrder: "as_given" | "value_desc" | "value_asc" | "label_asc";
  highlightLabels: string[];
  valueFormat: ValueFormat;
  currency: string | null;
  xLabel: string | null;
  yLabel: string | null;
  size?: ChartSize;
};

/** The union of every series' labels, in first-seen order — series need not be aligned. */
function unionLabels(series: SeriesInput[]): string[] {
  const seen: string[] = [];
  const set = new Set<string>();
  for (const s of series) {
    for (const p of s.points) {
      if (!set.has(p.label)) {
        set.add(p.label);
        seen.push(p.label);
      }
    }
  }
  return seen;
}

function valueAt(series: SeriesInput, label: string): number | null {
  const point = series.points.find((p) => p.label === label);
  return point ? point.value : null;
}

export function buildBarChartScene(args: BarChartArgs): ChartScene {
  const size = args.size ?? DEFAULT_CHART_SIZE;
  const series = args.series.filter((s) => s.points.length > 0);
  if (series.length === 0) return { width: size.width, height: size.height, shapes: [], legend: [] };

  let labels = unionLabels(series);

  if (args.sortOrder !== "as_given") {
    const totalFor = (label: string) =>
      series.reduce((sum, s) => sum + Math.abs(valueAt(s, label) ?? 0), 0);
    labels = [...labels].sort((a, b) => {
      switch (args.sortOrder) {
        case "value_desc":
          return totalFor(b) - totalFor(a);
        case "value_asc":
          return totalFor(a) - totalFor(b);
        case "label_asc":
          return a.localeCompare(b);
        default:
          return 0;
      }
    });
  }

  const highlight = new Set(args.highlightLabels);
  const legend: LegendEntry[] =
    series.length > 1 ? series.map((s, i) => ({ label: s.name, color: seriesColor(i) })) : [];

  const stackTotals = labels.map((label) =>
    series.reduce((sum, s) => sum + Math.max(0, valueAt(s, label) ?? 0), 0),
  );
  const stackNegatives = labels.map((label) =>
    series.reduce((sum, s) => sum + Math.min(0, valueAt(s, label) ?? 0), 0),
  );

  const allValues = args.stacked
    ? [...stackTotals, ...stackNegatives]
    : labels.flatMap((label) => series.map((s) => valueAt(s, label) ?? 0));

  const dataMin = Math.min(0, ...allValues);
  const dataMax = Math.max(0, ...allValues);
  const ticks = niceTicks(dataMin, dataMax);
  const scaleMin = Math.min(...ticks);
  const scaleMax = Math.max(...ticks);
  const span = scaleMax - scaleMin || 1;

  const shapes: Shape[] = [];

  if (args.orientation === "horizontal") {
    const frame = frameOf(size, { left: 96, bottom: 26 });
    const band = frame.innerHeight / labels.length;
    const toX = (v: number) => frame.left + ((v - scaleMin) / span) * frame.innerWidth;

    for (const tick of ticks) {
      const x = toX(tick);
      shapes.push({
        kind: "line",
        x1: x,
        y1: frame.top,
        x2: x,
        y2: size.height - frame.bottom,
        stroke: tick === 0 ? AXIS : GRID,
        strokeWidth: tick === 0 ? 0.8 : 0.5,
      });
      shapes.push({
        kind: "text",
        x,
        y: size.height - frame.bottom + 10,
        text: compactValue(tick, args.valueFormat, args.currency),
        size: 7,
        fill: MUTED_INK,
        anchor: "middle",
      });
    }

    labels.forEach((label, li) => {
      shapes.push({
        kind: "text",
        x: frame.left - 5,
        y: frame.top + band * (li + 0.5) + 2.6,
        text: truncate(label, 20),
        size: 7,
        fill: highlight.has(label) ? HIGHLIGHT : MUTED_INK,
        anchor: "end",
        bold: highlight.has(label),
      });

      if (args.stacked) {
        let cursorPos = 0;
        let cursorNeg = 0;
        series.forEach((s, si) => {
          const value = valueAt(s, label) ?? 0;
          const from = value >= 0 ? cursorPos : cursorNeg + value;
          const to = value >= 0 ? cursorPos + value : cursorNeg;
          if (value >= 0) cursorPos += value;
          else cursorNeg += value;
          const x0 = toX(from);
          const x1 = toX(to);
          shapes.push({
            kind: "rect",
            x: Math.min(x0, x1),
            y: frame.top + band * li + band * 0.15,
            w: Math.max(0.6, Math.abs(x1 - x0)),
            h: band * 0.7,
            fill: seriesColor(si),
          });
        });
      } else {
        const groupH = (band * 0.72) / series.length;
        series.forEach((s, si) => {
          const value = valueAt(s, label);
          if (value === null) return;
          const x0 = toX(Math.min(0, value));
          const x1 = toX(Math.max(0, value));
          shapes.push({
            kind: "rect",
            x: x0,
            y: frame.top + band * li + band * 0.14 + groupH * si,
            w: Math.max(0.6, x1 - x0),
            h: Math.max(1.5, groupH - 1),
            fill: highlight.has(label) && series.length === 1 ? HIGHLIGHT : seriesColor(si),
          });
        });
      }
    });

    shapes.push({
      kind: "line",
      x1: toX(Math.max(scaleMin, Math.min(scaleMax, 0))),
      y1: frame.top,
      x2: toX(Math.max(scaleMin, Math.min(scaleMax, 0))),
      y2: size.height - frame.bottom,
      stroke: AXIS,
      strokeWidth: 0.8,
    });

    return { width: size.width, height: size.height, shapes, legend };
  }

  const frame = frameOf(size, { left: 54, bottom: 30 });
  const band = frame.innerWidth / labels.length;
  const toY = (v: number) =>
    size.height - frame.bottom - ((v - scaleMin) / span) * frame.innerHeight;

  shapes.push(
    ...axisShapes({
      frame,
      size,
      ticks,
      toY,
      format: args.valueFormat,
      currency: args.currency,
      yLabel: args.yLabel,
      xLabel: args.xLabel,
    }),
  );

  labels.forEach((label, li) => {
    if (args.stacked) {
      let cursorPos = 0;
      let cursorNeg = 0;
      series.forEach((s, si) => {
        const value = valueAt(s, label) ?? 0;
        const from = value >= 0 ? cursorPos : cursorNeg + value;
        const to = value >= 0 ? cursorPos + value : cursorNeg;
        if (value >= 0) cursorPos += value;
        else cursorNeg += value;
        const y0 = toY(to);
        const y1 = toY(from);
        shapes.push({
          kind: "rect",
          x: frame.left + band * li + band * 0.15,
          y: Math.min(y0, y1),
          w: band * 0.7,
          h: Math.max(0.6, Math.abs(y1 - y0)),
          fill: seriesColor(si),
        });
      });
    } else {
      const groupW = (band * 0.72) / series.length;
      series.forEach((s, si) => {
        const value = valueAt(s, label);
        if (value === null) return;
        const yTop = toY(Math.max(0, value));
        const yBottom = toY(Math.min(0, value));
        shapes.push({
          kind: "rect",
          x: frame.left + band * li + band * 0.14 + groupW * si,
          y: yTop,
          w: Math.max(1.5, groupW - 1),
          h: Math.max(0.6, yBottom - yTop),
          fill: highlight.has(label) && series.length === 1 ? HIGHLIGHT : seriesColor(si),
        });
      });
    }
  });

  shapes.push(...categoryLabels(labels, frame, size, band));

  return { width: size.width, height: size.height, shapes, legend };
}

/* -------------------------------------------------------------------------- */
/* Line and area charts                                                       */
/* -------------------------------------------------------------------------- */

export type LineChartArgs = {
  series: SeriesInput[];
  showMarkers: boolean;
  referenceLines: { label: string; value: number; axis: "x" | "y" }[];
  annotations: { xLabel: string; note: string }[];
  valueFormat: ValueFormat;
  currency: string | null;
  xLabel: string | null;
  yLabel: string | null;
  size?: ChartSize;
};

export function buildLineChartScene(args: LineChartArgs): ChartScene {
  const size = args.size ?? DEFAULT_CHART_SIZE;
  const series = args.series.filter((s) => s.points.length > 0);
  if (series.length === 0) return { width: size.width, height: size.height, shapes: [], legend: [] };

  const labels = unionLabels(series);
  const values = series.flatMap((s) => s.points.map((p) => p.value));
  // A y reference line ("Materiality", "Budget") only reads if it is inside the plotted range.
  const refValues = args.referenceLines.filter((r) => r.axis === "y").map((r) => r.value);

  const ticks = niceTicks(Math.min(...values, ...refValues), Math.max(...values, ...refValues));
  const scaleMin = Math.min(...ticks);
  const scaleMax = Math.max(...ticks);
  const span = scaleMax - scaleMin || 1;

  const frame = frameOf(size, { left: 54, bottom: 30 });
  const step = labels.length > 1 ? frame.innerWidth / (labels.length - 1) : 0;
  const toX = (i: number) => (labels.length > 1 ? frame.left + step * i : frame.left + frame.innerWidth / 2);
  const toY = (v: number) => size.height - frame.bottom - ((v - scaleMin) / span) * frame.innerHeight;

  const shapes: Shape[] = axisShapes({
    frame,
    size,
    ticks,
    toY,
    format: args.valueFormat,
    currency: args.currency,
    yLabel: args.yLabel,
    xLabel: args.xLabel,
  });

  for (const ref of args.referenceLines.filter((r) => r.axis === "y")) {
    const y = toY(ref.value);
    shapes.push({
      kind: "line",
      x1: frame.left,
      y1: y,
      x2: frame.left + frame.innerWidth,
      y2: y,
      stroke: HIGHLIGHT,
      strokeWidth: 0.8,
      dash: "3 2",
    });
    shapes.push({
      kind: "text",
      x: frame.left + frame.innerWidth,
      y: y - 3,
      text: truncate(ref.label, 24),
      size: 6.5,
      fill: HIGHLIGHT,
      anchor: "end",
    });
  }

  series.forEach((s, si) => {
    const color = seriesColor(si);
    const pts = labels
      .map((label, i) => {
        const value = valueAt(s, label);
        return value === null ? null : { x: toX(i), y: toY(value) };
      })
      .filter((p): p is { x: number; y: number } => p !== null);
    if (pts.length === 0) return;

    shapes.push({
      kind: "path",
      d: pts.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" "),
      stroke: color,
      strokeWidth: 1.4,
      fill: "none",
    });

    if (args.showMarkers || pts.length === 1) {
      for (const p of pts) {
        shapes.push({ kind: "circle", cx: p.x, cy: p.y, r: 1.9, fill: color });
      }
    }
  });

  for (const annotation of args.annotations) {
    const index = labels.indexOf(annotation.xLabel);
    if (index === -1) continue;
    const x = toX(index);
    shapes.push({
      kind: "line",
      x1: x,
      y1: frame.top,
      x2: x,
      y2: size.height - frame.bottom,
      stroke: HIGHLIGHT,
      strokeWidth: 0.6,
      dash: "2 2",
      opacity: 0.7,
    });
  }

  shapes.push(
    ...categoryLabels(labels, frame, size, labels.length > 1 ? step : frame.innerWidth).map(
      (shape) =>
        // Line charts label points, not bands, so pull the label back onto the tick.
        shape.kind === "text" ? { ...shape, x: shape.x - (labels.length > 1 ? step / 2 : 0) } : shape,
    ),
  );

  const legend: LegendEntry[] =
    series.length > 1 ? series.map((s, i) => ({ label: s.name, color: seriesColor(i) })) : [];

  return { width: size.width, height: size.height, shapes, legend };
}

export type AreaChartArgs = {
  series: SeriesInput[];
  stacked: boolean;
  baselineZero: boolean;
  valueFormat: ValueFormat;
  currency: string | null;
  xLabel: string | null;
  yLabel: string | null;
  size?: ChartSize;
};

export function buildAreaChartScene(args: AreaChartArgs): ChartScene {
  const size = args.size ?? DEFAULT_CHART_SIZE;
  const series = args.series.filter((s) => s.points.length > 0);
  if (series.length === 0) return { width: size.width, height: size.height, shapes: [], legend: [] };

  const labels = unionLabels(series);

  // Stacked areas are read as a total, so the scale must be built from the cumulative height.
  const stacks: number[][] = labels.map(() => []);
  if (args.stacked) {
    labels.forEach((label, li) => {
      let cursor = 0;
      for (const s of series) {
        cursor += valueAt(s, label) ?? 0;
        stacks[li].push(cursor);
      }
    });
  }

  const values = args.stacked
    ? stacks.flat()
    : series.flatMap((s) => s.points.map((p) => p.value));
  const min = args.baselineZero ? Math.min(0, ...values) : Math.min(...values);
  const ticks = niceTicks(min, Math.max(...values, args.baselineZero ? 0 : -Infinity));
  const scaleMin = Math.min(...ticks);
  const scaleMax = Math.max(...ticks);
  const span = scaleMax - scaleMin || 1;

  const frame = frameOf(size, { left: 54, bottom: 30 });
  const step = labels.length > 1 ? frame.innerWidth / (labels.length - 1) : 0;
  const toX = (i: number) => (labels.length > 1 ? frame.left + step * i : frame.left + frame.innerWidth / 2);
  const toY = (v: number) => size.height - frame.bottom - ((v - scaleMin) / span) * frame.innerHeight;

  const shapes: Shape[] = axisShapes({
    frame,
    size,
    ticks,
    toY,
    format: args.valueFormat,
    currency: args.currency,
    yLabel: args.yLabel,
    xLabel: args.xLabel,
  });

  const baseY = toY(Math.max(scaleMin, Math.min(scaleMax, 0)));

  // Painted back-to-front so the first series stays legible under the later ones.
  series.forEach((s, si) => {
    const color = seriesColor(si);
    const top = labels.map((label, li) => ({
      x: toX(li),
      y: toY(args.stacked ? stacks[li][si] : (valueAt(s, label) ?? 0)),
    }));
    const bottom = args.stacked && si > 0
      ? labels.map((_, li) => ({ x: toX(li), y: toY(stacks[li][si - 1]) })).reverse()
      : [
          { x: toX(labels.length - 1), y: baseY },
          { x: toX(0), y: baseY },
        ];

    const d = [
      ...top.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`),
      ...bottom.map((p) => `L${p.x.toFixed(2)} ${p.y.toFixed(2)}`),
      "Z",
    ].join(" ");

    shapes.push({ kind: "path", d, fill: color, opacity: args.stacked ? 0.85 : 0.28 });
    shapes.push({
      kind: "path",
      d: top.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" "),
      stroke: color,
      strokeWidth: 1.2,
      fill: "none",
    });
  });

  shapes.push(
    ...categoryLabels(labels, frame, size, labels.length > 1 ? step : frame.innerWidth).map((shape) =>
      shape.kind === "text" ? { ...shape, x: shape.x - (labels.length > 1 ? step / 2 : 0) } : shape,
    ),
  );

  const legend: LegendEntry[] =
    series.length > 1 ? series.map((s, i) => ({ label: s.name, color: seriesColor(i) })) : [];

  return { width: size.width, height: size.height, shapes, legend };
}

/* -------------------------------------------------------------------------- */
/* Pie and donut                                                              */
/* -------------------------------------------------------------------------- */

function polar(cx: number, cy: number, r: number, angle: number): [number, number] {
  return [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];
}

/** A ring segment. `rInner` of 0 gives a pie wedge. */
function arcPath(
  cx: number,
  cy: number,
  rOuter: number,
  rInner: number,
  start: number,
  end: number,
): string {
  const large = end - start > Math.PI ? 1 : 0;
  const [x0, y0] = polar(cx, cy, rOuter, start);
  const [x1, y1] = polar(cx, cy, rOuter, end);

  if (rInner <= 0) {
    return `M${cx.toFixed(2)} ${cy.toFixed(2)} L${x0.toFixed(2)} ${y0.toFixed(2)} A${rOuter} ${rOuter} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)} Z`;
  }
  const [xi1, yi1] = polar(cx, cy, rInner, end);
  const [xi0, yi0] = polar(cx, cy, rInner, start);
  return [
    `M${x0.toFixed(2)} ${y0.toFixed(2)}`,
    `A${rOuter} ${rOuter} 0 ${large} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`,
    `L${xi1.toFixed(2)} ${yi1.toFixed(2)}`,
    `A${rInner} ${rInner} 0 ${large} 0 ${xi0.toFixed(2)} ${yi0.toFixed(2)}`,
    "Z",
  ].join(" ");
}

export type PieChartArgs = {
  slices: { label: string; value: number; percentOfTotal: number | null }[];
  total: number;
  showPercentages: boolean;
  valueFormat: ValueFormat;
  currency: string | null;
  /** 0 for a pie; ~0.62 for a donut. */
  innerRatio: number;
  center: { label: string; value: string } | null;
  size?: ChartSize;
};

export function buildPieChartScene(args: PieChartArgs): ChartScene {
  const size = args.size ?? { width: 512, height: 236 };
  const slices = args.slices.filter((s) => Number.isFinite(s.value) && s.value > 0);
  if (slices.length === 0) return { width: size.width, height: size.height, shapes: [], legend: [] };

  const sum = slices.reduce((acc, s) => acc + s.value, 0);
  const cx = 108;
  const cy = size.height / 2;
  const rOuter = Math.min(cy - 12, 96);
  const rInner = rOuter * args.innerRatio;

  const shapes: Shape[] = [];
  const legend: LegendEntry[] = [];

  // Start at twelve o'clock and go clockwise, which is how a reader expects shares to be read.
  let angle = -Math.PI / 2;
  slices.forEach((slice, i) => {
    const sweep = (slice.value / sum) * Math.PI * 2;
    const color = seriesColor(i);

    if (slices.length === 1) {
      // A single 100% slice cannot be drawn as an arc — the start and end points coincide.
      shapes.push({ kind: "circle", cx, cy, r: rOuter, fill: color });
      if (rInner > 0) shapes.push({ kind: "circle", cx, cy, r: rInner, fill: "#ffffff" });
    } else {
      shapes.push({
        kind: "path",
        d: arcPath(cx, cy, rOuter, rInner, angle, angle + sweep),
        fill: color,
        stroke: "#ffffff",
        strokeWidth: 0.8,
      });
    }
    angle += sweep;
    legend.push({ label: slice.label, color });
  });

  if (args.center) {
    shapes.push({
      kind: "text",
      x: cx,
      y: cy - 1,
      text: truncate(args.center.value, 14),
      size: 12,
      fill: INK,
      anchor: "middle",
      bold: true,
    });
    shapes.push({
      kind: "text",
      x: cx,
      y: cy + 10,
      text: truncate(args.center.label, 22),
      size: 6.5,
      fill: MUTED_INK,
      anchor: "middle",
    });
  }

  // The legend doubles as the data table: label, value and share, so the chart never depends on
  // colour matching alone to be read.
  const legendX = 232;
  const rowH = Math.min(16, (size.height - 24) / Math.max(1, slices.length));
  const legendTop = Math.max(12, cy - (slices.length * rowH) / 2);

  slices.forEach((slice, i) => {
    const y = legendTop + rowH * i;
    shapes.push({ kind: "rect", x: legendX, y: y + 2, w: 7, h: 7, fill: seriesColor(i) });
    shapes.push({
      kind: "text",
      x: legendX + 12,
      y: y + 8.5,
      text: truncate(slice.label, 30),
      size: 7.5,
      fill: INK,
      anchor: "start",
    });
    shapes.push({
      kind: "text",
      x: size.width - 46,
      y: y + 8.5,
      text: formatValue(slice.value, args.valueFormat, args.currency),
      size: 7.5,
      fill: INK,
      anchor: "end",
    });
    if (args.showPercentages) {
      const percent = slice.percentOfTotal ?? (slice.value / sum) * 100;
      shapes.push({
        kind: "text",
        x: size.width - 4,
        y: y + 8.5,
        text: fmtPercent(percent),
        size: 7.5,
        fill: MUTED_INK,
        anchor: "end",
      });
    }
  });

  return { width: size.width, height: size.height, shapes, legend: [] };
}

/* -------------------------------------------------------------------------- */
/* Waterfall                                                                  */
/* -------------------------------------------------------------------------- */

export type WaterfallArgs = {
  startLabel: string;
  startValue: number;
  steps: { label: string; delta: number; category: "increase" | "decrease" | "subtotal" }[];
  endLabel: string;
  endValue: number;
  valueFormat: ValueFormat;
  currency: string | null;
  size?: ChartSize;
};

export function buildWaterfallScene(args: WaterfallArgs): ChartScene {
  const size = args.size ?? { width: 512, height: 240 };

  type Bar = { label: string; from: number; to: number; fill: string; anchored: boolean };
  const bars: Bar[] = [];

  let running = args.startValue;
  bars.push({ label: args.startLabel, from: 0, to: args.startValue, fill: NEUTRAL, anchored: true });

  for (const step of args.steps) {
    if (step.category === "subtotal") {
      bars.push({ label: step.label, from: 0, to: running, fill: NEUTRAL, anchored: true });
      continue;
    }
    const next = running + step.delta;
    bars.push({
      label: step.label,
      from: running,
      to: next,
      fill: step.delta >= 0 ? POSITIVE : NEGATIVE,
      anchored: false,
    });
    running = next;
  }

  bars.push({ label: args.endLabel, from: 0, to: args.endValue, fill: NEUTRAL, anchored: true });

  const extremes = bars.flatMap((b) => [b.from, b.to]);
  const ticks = niceTicks(Math.min(0, ...extremes), Math.max(0, ...extremes));
  const scaleMin = Math.min(...ticks);
  const scaleMax = Math.max(...ticks);
  const span = scaleMax - scaleMin || 1;

  const frame = frameOf(size, { left: 54, bottom: 34 });
  const band = frame.innerWidth / bars.length;
  const toY = (v: number) => size.height - frame.bottom - ((v - scaleMin) / span) * frame.innerHeight;

  const shapes: Shape[] = axisShapes({
    frame,
    size,
    ticks,
    toY,
    format: args.valueFormat,
    currency: args.currency,
    yLabel: null,
    xLabel: null,
  });

  bars.forEach((bar, i) => {
    const x = frame.left + band * i + band * 0.16;
    const w = band * 0.68;
    const y0 = toY(bar.to);
    const y1 = toY(bar.from);
    shapes.push({
      kind: "rect",
      x,
      y: Math.min(y0, y1),
      w,
      h: Math.max(1, Math.abs(y1 - y0)),
      fill: bar.fill,
    });

    // The connector is what makes a waterfall a bridge rather than a row of bars.
    if (i < bars.length - 1 && !bars[i + 1].anchored) {
      const y = toY(bar.to);
      shapes.push({
        kind: "line",
        x1: x + w,
        y1: y,
        x2: frame.left + band * (i + 1) + band * 0.16,
        y2: y,
        stroke: AXIS,
        strokeWidth: 0.5,
        dash: "2 2",
      });
    }

    shapes.push({
      kind: "text",
      x: x + w / 2,
      y: Math.min(y0, y1) - 3,
      text: compactValue(bar.to - bar.from || bar.to, args.valueFormat, args.currency),
      size: 6,
      fill: MUTED_INK,
      anchor: "middle",
    });
  });

  shapes.push(
    ...categoryLabels(
      bars.map((b) => b.label),
      frame,
      size,
      band,
    ),
  );

  return { width: size.width, height: size.height, shapes, legend: [] };
}

/* -------------------------------------------------------------------------- */
/* Scatter                                                                    */
/* -------------------------------------------------------------------------- */

export type ScatterArgs = {
  points: { x: number; y: number; outlier: boolean; seriesName: string | null }[];
  trend: { slope: number; intercept: number } | null;
  valueFormat: ValueFormat;
  currency: string | null;
  xLabel: string | null;
  yLabel: string | null;
  size?: ChartSize;
};

export function buildScatterScene(args: ScatterArgs): ChartScene {
  const size = args.size ?? DEFAULT_CHART_SIZE;
  const points = args.points.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (points.length === 0) return { width: size.width, height: size.height, shapes: [], legend: [] };

  const yTicks = niceTicks(
    Math.min(...points.map((p) => p.y)),
    Math.max(...points.map((p) => p.y)),
  );
  const xTicks = niceTicks(
    Math.min(...points.map((p) => p.x)),
    Math.max(...points.map((p) => p.x)),
    4,
  );

  const yMin = Math.min(...yTicks);
  const yMax = Math.max(...yTicks);
  const xMin = Math.min(...xTicks);
  const xMax = Math.max(...xTicks);
  const ySpan = yMax - yMin || 1;
  const xSpan = xMax - xMin || 1;

  const frame = frameOf(size, { left: 54, bottom: 30 });
  const toX = (v: number) => frame.left + ((v - xMin) / xSpan) * frame.innerWidth;
  const toY = (v: number) => size.height - frame.bottom - ((v - yMin) / ySpan) * frame.innerHeight;

  const shapes: Shape[] = axisShapes({
    frame,
    size,
    ticks: yTicks,
    toY,
    format: args.valueFormat,
    currency: args.currency,
    yLabel: args.yLabel,
    xLabel: args.xLabel,
  });

  for (const tick of xTicks) {
    shapes.push({
      kind: "text",
      x: toX(tick),
      y: size.height - frame.bottom + 10,
      text: compactValue(tick, "number", null),
      size: 7,
      fill: MUTED_INK,
      anchor: "middle",
    });
  }

  if (args.trend) {
    const y0 = args.trend.intercept + args.trend.slope * xMin;
    const y1 = args.trend.intercept + args.trend.slope * xMax;
    shapes.push({
      kind: "line",
      x1: toX(xMin),
      y1: toY(Math.max(yMin, Math.min(yMax, y0))),
      x2: toX(xMax),
      y2: toY(Math.max(yMin, Math.min(yMax, y1))),
      stroke: MUTED_INK,
      strokeWidth: 0.8,
      dash: "3 2",
    });
  }

  const seriesNames = [...new Set(points.map((p) => p.seriesName).filter((n): n is string => Boolean(n)))];

  for (const point of points) {
    const seriesIndex = point.seriesName ? seriesNames.indexOf(point.seriesName) : 0;
    // Outliers are the reason a scatter is in an audit report, so they are marked by shape and
    // stroke as well as colour — a greyscale print must still show them.
    shapes.push({
      kind: "circle",
      cx: toX(point.x),
      cy: toY(point.y),
      r: point.outlier ? 3 : 1.8,
      fill: point.outlier ? "#ffffff" : seriesColor(seriesIndex),
      stroke: point.outlier ? HIGHLIGHT : undefined,
      strokeWidth: point.outlier ? 1.2 : undefined,
      opacity: point.outlier ? 1 : 0.75,
    });
  }

  const legend: LegendEntry[] =
    seriesNames.length > 1 ? seriesNames.map((name, i) => ({ label: name, color: seriesColor(i) })) : [];

  return { width: size.width, height: size.height, shapes, legend };
}

/* -------------------------------------------------------------------------- */
/* Sparkline                                                                  */
/* -------------------------------------------------------------------------- */

export function buildSparklineScene(
  points: { label: string; value: number }[],
  size: ChartSize = { width: 160, height: 34 },
): ChartScene {
  if (points.length < 2) return { width: size.width, height: size.height, shapes: [], legend: [] };

  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = size.width / (points.length - 1);
  const toY = (v: number) => size.height - 3 - ((v - min) / span) * (size.height - 6);

  const coords = points.map((p, i) => ({ x: step * i, y: toY(p.value) }));
  const d = coords.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");

  const last = coords[coords.length - 1];
  return {
    width: size.width,
    height: size.height,
    shapes: [
      { kind: "path", d, stroke: CHART_PALETTE[0], strokeWidth: 1.2, fill: "none" },
      { kind: "circle", cx: last.x, cy: last.y, r: 2, fill: CHART_PALETTE[0] },
    ],
    legend: [],
  };
}
