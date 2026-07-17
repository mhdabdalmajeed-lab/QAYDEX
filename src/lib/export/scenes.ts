import type { AuditBlock } from "@/lib/ai/blocks/schemas";
import {
  type ChartScene,
  type ChartSize,
  type ValueFormat,
  buildAreaChartScene,
  buildBarChartScene,
  buildLineChartScene,
  buildPieChartScene,
  buildScatterScene,
  buildSparklineScene,
  buildWaterfallScene,
  formatValue,
} from "@/lib/export/chart-geometry";

/**
 * One block, one chart scene.
 *
 * `chart-geometry` knows how to lay out a bar chart; it does not know what a
 * `supplier_concentration_chart` is. This module is the only place that decides which geometry
 * a block type is drawn with, so the PDF renderer and the HTML renderer cannot end up drawing
 * the same block two different ways.
 *
 * A `null` return is a deliberate answer, not a failure: heatmaps, risk matrices and timelines
 * have no honest reduction to these primitives, so their renderers fall back to a table of the
 * same numbers. That is always better than a chart that misleads.
 */

export function sceneForBlock(block: AuditBlock, size?: ChartSize): ChartScene | null {
  switch (block.type) {
    case "bar_chart":
      return buildBarChartScene({
        series: block.series,
        orientation: block.orientation,
        stacked: block.stacked,
        sortOrder: block.sortOrder,
        highlightLabels: block.highlightLabels,
        valueFormat: block.valueFormat,
        currency: block.currency,
        xLabel: block.xLabel,
        yLabel: block.yLabel,
        size,
      });

    case "line_chart":
      return buildLineChartScene({
        series: block.series,
        showMarkers: block.showMarkers,
        referenceLines: block.referenceLines,
        // The scene draws the marker; the note itself is printed under the chart, where there
        // is room for it to be read.
        annotations: block.annotations.map((a) => ({ xLabel: a.xLabel, note: a.note })),
        valueFormat: block.valueFormat,
        currency: block.currency,
        xLabel: block.xLabel,
        yLabel: block.yLabel,
        size,
      });

    case "area_chart":
      return buildAreaChartScene({
        series: block.series,
        stacked: block.stacked,
        baselineZero: block.baselineZero,
        valueFormat: block.valueFormat,
        currency: block.currency,
        xLabel: block.xLabel,
        yLabel: block.yLabel,
        size,
      });

    case "pie_chart":
      return buildPieChartScene({
        slices: block.slices,
        total: block.total,
        showPercentages: block.showPercentages,
        valueFormat: block.valueFormat,
        currency: block.currency,
        innerRatio: 0,
        center: null,
        size,
      });

    case "donut_chart":
      return buildPieChartScene({
        slices: block.slices,
        total: block.total,
        showPercentages: true,
        valueFormat: block.valueFormat,
        currency: block.currency,
        innerRatio: 0.62,
        center: {
          label: block.centerLabel,
          value: formatValue(block.centerValue, block.centerValueFormat, block.currency),
        },
        size,
      });

    case "waterfall_chart":
      return buildWaterfallScene({
        startLabel: block.startLabel,
        startValue: block.startValue,
        steps: block.steps.map((s) => ({
          label: s.label,
          delta: s.delta,
          category: s.category,
        })),
        endLabel: block.endLabel,
        endValue: block.endValue,
        valueFormat: block.valueFormat,
        currency: block.currency,
        size,
      });

    case "scatter_chart":
      return buildScatterScene({
        points: block.points.map((p) => ({
          x: p.x,
          y: p.y,
          outlier: p.outlier,
          seriesName: p.seriesName,
        })),
        trend:
          block.trendSlope !== null && block.trendIntercept !== null
            ? { slope: block.trendSlope, intercept: block.trendIntercept }
            : null,
        valueFormat: block.valueFormat,
        currency: block.currency,
        xLabel: block.xLabel,
        yLabel: block.yLabel,
        size,
      });

    case "trend_card":
      return buildSparklineScene(block.points, size ?? { width: 160, height: 34 });

    /* ---------------------------------------------------------------- domain */

    case "period_comparison":
      // Each metric is a series across the periods. Metrics with different formats cannot share
      // a y axis honestly, so a mixed-format block gets its table instead of a misleading chart.
      return uniformFormat(block.metrics.map((m) => m.valueFormat)) === undefined
        ? null
        : buildBarChartScene({
            series: block.metrics.map((m) => ({
              name: m.label,
              points: block.periods.map((p, i) => ({
                label: p.label,
                value: m.values[i] ?? 0,
              })),
            })),
            orientation: "vertical",
            stacked: false,
            sortOrder: "as_given",
            highlightLabels: [],
            valueFormat: uniformFormat(block.metrics.map((m) => m.valueFormat)) ?? null,
            currency: block.metrics.find((m) => m.currency)?.currency ?? null,
            xLabel: null,
            yLabel: null,
            size,
          });

    case "entity_comparison":
      return uniformFormat(block.metrics.map((m) => m.valueFormat)) === undefined
        ? null
        : buildBarChartScene({
            series: block.metrics.map((m) => ({
              name: m.label,
              points: block.entities.map((e, i) => ({
                label: e.name,
                value: m.values[i] ?? 0,
              })),
            })),
            orientation: "horizontal",
            stacked: false,
            sortOrder: "as_given",
            highlightLabels: block.outlierEntities,
            valueFormat: uniformFormat(block.metrics.map((m) => m.valueFormat)) ?? null,
            currency: block.metrics.find((m) => m.currency)?.currency ?? null,
            xLabel: null,
            yLabel: null,
            size,
          });

    case "customer_concentration_chart":
      return buildBarChartScene({
        series: [
          {
            name: MEASURE_LABEL[block.measure] ?? block.measure,
            points: block.customers.map((c) => ({ label: c.name, value: c.amount })),
          },
        ],
        orientation: "horizontal",
        stacked: false,
        sortOrder: "value_desc",
        // Concentration is the point: the customers that make up the top-N share are the ones
        // the reader is being asked to look at.
        highlightLabels: topNames(
          block.customers.map((c) => ({ name: c.name, amount: c.amount })),
          block.topNCount,
        ),
        valueFormat: "currency",
        currency: block.currency,
        xLabel: null,
        yLabel: null,
        size,
      });

    case "supplier_concentration_chart":
      return buildBarChartScene({
        series: [
          {
            name: MEASURE_LABEL[block.measure] ?? block.measure,
            points: block.suppliers.map((s) => ({ label: s.name, value: s.amount })),
          },
        ],
        orientation: "horizontal",
        stacked: false,
        sortOrder: "value_desc",
        highlightLabels: topNames(
          block.suppliers.map((s) => ({ name: s.name, amount: s.amount })),
          block.topNCount,
        ),
        valueFormat: block.measure === "invoice_count" ? "number" : "currency",
        currency: block.measure === "invoice_count" ? null : block.currency,
        xLabel: null,
        yLabel: null,
        size,
      });

    case "cash_flow_visualization":
      // Outflows are stored as positive magnitudes, so they are negated to put them below the
      // axis — otherwise the chart reads as though everything is an inflow.
      return buildBarChartScene({
        series: [
          {
            name: "Inflows",
            points: block.periods.map((p, i) => ({ label: p, value: block.inflows[i] ?? 0 })),
          },
          {
            name: "Outflows",
            points: block.periods.map((p, i) => ({ label: p, value: -(block.outflows[i] ?? 0) })),
          },
          {
            name: "Closing balance",
            points: block.periods.map((p, i) => ({
              label: p,
              value: block.closingBalance[i] ?? 0,
            })),
          },
        ],
        orientation: "vertical",
        stacked: false,
        sortOrder: "as_given",
        highlightLabels: block.lowestBalancePeriod ? [block.lowestBalancePeriod] : [],
        valueFormat: "currency",
        currency: block.currency,
        xLabel: null,
        yLabel: null,
        size,
      });

    case "aging_visualization":
      return buildBarChartScene({
        series: [
          {
            name: `${AGING_SUBJECT_LABEL[block.subject]} as at ${block.asOfDate}`,
            points: block.buckets.map((b) => ({ label: b.label, value: b.amount })),
          },
          ...(block.buckets.some((b) => b.priorAmount !== null)
            ? [
                {
                  name: "Prior ageing",
                  points: block.buckets.map((b) => ({
                    label: b.label,
                    value: b.priorAmount ?? 0,
                  })),
                },
              ]
            : []),
        ],
        orientation: "vertical",
        stacked: false,
        sortOrder: "as_given",
        highlightLabels: [],
        valueFormat: "currency",
        currency: block.currency,
        xLabel: null,
        yLabel: null,
        size,
      });

    case "account_movement_visualization":
      return buildBarChartScene({
        series: [
          {
            name: "Debits",
            points: block.movements.map((m) => ({ label: m.periodLabel, value: m.debits })),
          },
          {
            name: "Credits",
            points: block.movements.map((m) => ({ label: m.periodLabel, value: -m.credits })),
          },
        ],
        orientation: "vertical",
        stacked: false,
        sortOrder: "as_given",
        highlightLabels: block.movements.filter((m) => m.unusual).map((m) => m.periodLabel),
        valueFormat: "currency",
        currency: block.currency,
        xLabel: null,
        yLabel: null,
        size,
      });

    default:
      // heatmap, risk_matrix and timeline have no honest reduction to these primitives; their
      // renderers print the underlying numbers as a table instead.
      return null;
  }
}

/** True when a block is drawn as a chart at all, and so is suppressed by `includeCharts: false`. */
export function blockHasChart(block: AuditBlock): boolean {
  return sceneForBlock(block) !== null;
}

const MEASURE_LABEL: Record<string, string> = {
  revenue: "Revenue",
  receivables: "Receivables",
  orders: "Orders",
  spend: "Spend",
  payables: "Payables",
  invoice_count: "Invoices",
};

const AGING_SUBJECT_LABEL: Record<"receivables" | "payables" | "other", string> = {
  receivables: "Receivables",
  payables: "Payables",
  other: "Balances",
};

/**
 * `undefined` when the formats disagree — plotting a percentage and a currency on one axis
 * would produce a chart that is arithmetically true and completely misleading.
 */
function uniformFormat(formats: ValueFormat[]): ValueFormat | undefined {
  if (formats.length === 0) return null;
  const first = formats[0];
  return formats.every((f) => f === first) ? first : undefined;
}

function topNames(items: { name: string; amount: number }[], n: number): string[] {
  if (n <= 0) return [];
  return [...items]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, n)
    .map((item) => item.name);
}
