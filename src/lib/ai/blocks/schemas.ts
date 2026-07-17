import { z } from "zod";

import {
  blockBaseFields,
  chartConfigFields,
  claimTypeSchema,
  confidenceSchema,
  evidenceSchema,
  moneySchema,
  riskLevelSchema,
  seriesPointSchema,
  seriesSchema,
  severitySchema,
  tableDataSchema,
} from "@/lib/ai/blocks/primitives";
import { AUDIT_DOMAINS, type BlockType } from "@/lib/ai/blocks/types";

/**
 * The generative interface vocabulary as zod schemas (PRD §18).
 *
 * The model chooses and arranges these blocks; the platform never decides a finding. Every
 * `.describe()` here is prompt surface — it is sent to the model as JSON Schema `description`
 * and is the only thing telling it *when* a block is the right choice.
 *
 * Two API-measured rules apply to every line below:
 *   1. `.nullable()`, never `.optional()` — strict mode requires every property to be required,
 *      so "no value" is an explicit `null`.
 *   2. No `format: "email"` anywhere — it hangs the Responses API rather than erroring.
 * `.default()` is silently ignored by the API, so nothing here relies on defaults.
 */

/* -------------------------------------------------------------------------- */
/* Local shared pieces                                                        */
/* -------------------------------------------------------------------------- */

const auditDomainSchema = z.enum(AUDIT_DOMAINS);

const prioritySchema = z.enum(["immediate", "high", "medium", "low"]);
const effortSchema = z.enum(["low", "medium", "high"]);
const controlTypeSchema = z.enum(["preventive", "detective", "corrective"]);
const controlOperationSchema = z.enum(["manual", "automated", "hybrid"]);
const valueFormatSchema = z.enum(["number", "currency", "percent"]);

const sliceSchema = z.object({
  label: z.string(),
  value: z.number(),
  percentOfTotal: z.number().nullable().describe("0-100. Compute it; do not leave the renderer to guess."),
  note: z.string().nullable(),
});

const periodRefSchema = z.object({
  label: z.string().describe("How the period is named in the source data, e.g. 'FY2025 Q3'."),
  from: z.string().nullable().describe("ISO date (YYYY-MM-DD) if the source states one."),
  to: z.string().nullable().describe("ISO date (YYYY-MM-DD) if the source states one."),
});

/* -------------------------------------------------------------------------- */
/* Narrative frame                                                            */
/* -------------------------------------------------------------------------- */

export const executiveSummaryBlock = z
  .object({
    type: z.literal("executive_summary"),
    ...blockBaseFields,
    headline: z.string().describe("One sentence a CFO could read alone and still know the outcome."),
    narrative: z
      .array(z.string())
      .describe("2-5 short paragraphs of plain prose. No markdown, no bullet characters."),
    keyTakeaways: z.array(z.string()).describe("3-6 decision-relevant points, most material first."),
    overallRisk: riskLevelSchema,
    findingCounts: z
      .object({
        critical: z.number().int(),
        high: z.number().int(),
        medium: z.number().int(),
        low: z.number().int(),
        info: z.number().int(),
      })
      .describe("Must match the finding_card blocks you actually emit."),
    audience: z.enum(["board", "management", "finance_team", "auditor"]),
  })
  .describe("Open the audit with exactly one of these. Never use it to introduce a single finding.");

export const auditScopeBlock = z
  .object({
    type: z.literal("audit_scope"),
    ...blockBaseFields,
    objective: z.string().describe("What this audit set out to establish, in the user's terms."),
    periods: z.array(periodRefSchema),
    domains: z.array(auditDomainSchema),
    entitiesInScope: z.array(z.string()),
    accountsInScope: z.array(z.string()).describe("Account codes or names. Empty array if not account-scoped."),
    inScope: z.array(z.string()).describe("Areas actually examined."),
    outOfScope: z.array(z.string()).describe("Areas deliberately excluded, including instruction-driven exclusions."),
    drivingInstructions: z.array(z.string()).describe("Titles of the instructions that set this scope."),
    coverageBasis: z
      .enum(["full_population", "sample", "targeted", "analytical_only"])
      .describe("Be honest: use 'targeted' when you only looked where the instructions pointed."),
  })
  .describe("States what was and was not examined. Use once, near the top, whenever inputs were partial.");

export const auditMethodologyBlock = z
  .object({
    type: z.literal("audit_methodology"),
    ...blockBaseFields,
    procedures: z
      .array(
        z.object({
          name: z.string(),
          description: z.string().describe("What was actually done, not what could be done."),
          dataUsed: z.string(),
          toolsUsed: z.string().nullable().describe("Arithmetic/data tools invoked, if any."),
          populationSize: z.number().int().nullable(),
          itemsExamined: z.number().int().nullable(),
        }),
      )
      .describe("One entry per procedure performed, in the order performed."),
    samplingApproach: z
      .string()
      .nullable()
      .describe("How items were selected. Null only if the full population was examined."),
    standardsReferenced: z.array(z.string()).describe("Only standards the instructions or inputs actually invoke."),
    limitationsAcknowledged: z.array(z.string()),
  })
  .describe("How the work was done. Use when the reader needs to judge the reliability of the procedures.");

export const overallRiskRatingBlock = z
  .object({
    type: z.literal("overall_risk_rating"),
    ...blockBaseFields,
    rating: riskLevelSchema,
    ratingBasis: z.string().describe("Why this rating and not the one above or below it."),
    confidence: confidenceSchema,
    dimensions: z
      .array(
        z.object({
          name: z.string().describe("e.g. 'Cut-off', 'Segregation of duties', 'Data quality'."),
          rating: riskLevelSchema,
          rationale: z.string(),
        }),
      )
      .describe("The component ratings that roll up into the headline rating."),
    changeSincePrior: z
      .enum(["improved", "unchanged", "deteriorated", "not_comparable"])
      .nullable()
      .describe("Null unless a prior-period audit is actually among the inputs."),
  })
  .describe("A single aggregate risk verdict. Use at most once per audit, near the summary.");

/* -------------------------------------------------------------------------- */
/* Findings and callouts                                                      */
/* -------------------------------------------------------------------------- */

export const findingCardBlock = z
  .object({
    type: z.literal("finding_card"),
    ...blockBaseFields,
    findingRef: z
      .string()
      .describe("Short stable reference you invent, e.g. 'F-03'. Other blocks cite this exact string."),
    summary: z.string().describe("One or two sentences. Must stand alone in an export."),
    detail: z.string().describe("The full explanation: what was tested, what was found, why it is a problem."),
    riskCategory: z
      .string()
      .describe("e.g. 'Revenue recognition', 'Duplicate payments', 'Management override', 'Data integrity'."),
    domain: auditDomainSchema,
    severity: severitySchema.describe(
      "critical = act now, material misstatement or fraud indicator; high = significant; medium = " +
        "should be addressed; low = minor; info = no exception, recorded for completeness.",
    ),
    confidence: confidenceSchema.describe("Your confidence in the finding itself, not in its financial impact."),
    financialImpact: moneySchema
      .nullable()
      .describe("Null unless the amount is genuinely estimable from evidence. Never guess a number."),
    impactBasis: z
      .string()
      .nullable()
      .describe("How the impact was computed or bounded. Must be non-null whenever financialImpact is non-null."),
    affectedPeriods: z.array(z.string()),
    affectedEntities: z.array(z.string()),
    affectedAccounts: z.array(z.string()),
    relevantInstructions: z.array(z.string()).describe("Titles of the instructions that caused this investigation."),
    potentialExplanations: z
      .array(z.string())
      .describe("Innocent explanations too. List them before concluding anything is wrong."),
    recommendedFollowup: z.array(z.string()).describe("What a human should check next to confirm or clear this."),
    recommendedRemediation: z.array(z.string()).describe("What should change if the finding is confirmed."),
    suggestedOwnerRole: z
      .string()
      .nullable()
      .describe("A role, e.g. 'Financial Controller'. Never a named person unless the inputs name them."),
  })
  .describe("The core exception block. One per distinct issue; never bundle two issues into one card.");

export const riskHighlightBlock = z
  .object({
    type: z.literal("risk_highlight"),
    ...blockBaseFields,
    severity: severitySchema,
    riskStatement: z.string().describe("A forward-looking exposure, not a confirmed exception."),
    whyItMatters: z.string(),
    likelihood: z.enum(["almost_certain", "likely", "possible", "unlikely", "rare"]),
    exposure: moneySchema.nullable().describe("Amount at risk if it materialises. Null if not estimable."),
    urgency: z.enum(["immediate", "this_period", "next_period", "monitor"]),
    relatedFindingRefs: z.array(z.string()),
  })
  .describe("Use for a risk that could crystallise, where finding_card would overstate the evidence.");

export const warningBoxBlock = z
  .object({
    type: z.literal("warning_box"),
    ...blockBaseFields,
    severity: severitySchema,
    message: z.string().describe("The caution, in one or two sentences."),
    whatToCheck: z.array(z.string()).describe("Concrete checks the reader should perform."),
  })
  .describe("A short caution attached to nearby content. Not a finding — use finding_card for exceptions.");

export const infoBoxBlock = z
  .object({
    type: z.literal("info_box"),
    ...blockBaseFields,
    message: z.string(),
    bullets: z.array(z.string()).describe("Optional supporting points. Empty array if none."),
    relevance: z.string().nullable().describe("Why this context is worth the reader's attention here."),
  })
  .describe("Neutral context that helps interpret adjacent blocks. Carries no severity by design.");

export const successBoxBlock = z
  .object({
    type: z.literal("success_box"),
    ...blockBaseFields,
    message: z.string().describe("What passed, stated positively."),
    whatWasTested: z.string(),
    resultBasis: z.string().describe("Why the result supports a clean conclusion."),
    coverage: z.string().nullable().describe("e.g. '100% of postings' or '40 of 812 invoices'."),
  })
  .describe("Records a procedure that found no exceptions. Use it — absence of findings must be evidenced too.");

export const dataQualityWarningBlock = z
  .object({
    type: z.literal("data_quality_warning"),
    ...blockBaseFields,
    issueType: z.enum([
      "missing_values",
      "duplicate_records",
      "inconsistent_formats",
      "out_of_range_values",
      "unbalanced_totals",
      "stale_data",
      "encoding_issues",
      "unmapped_accounts",
      "conflicting_sources",
      "other",
    ]),
    severity: severitySchema,
    description: z.string(),
    affectedInputIds: z.array(z.string()).describe("Exact input ids from the manifest."),
    affectedRecordCount: z.number().int().nullable(),
    totalRecordCount: z.number().int().nullable(),
    impactOnConclusions: z.string().describe("Say plainly which conclusions are weakened by this."),
    remediation: z.string().describe("What the client should fix or resupply."),
  })
  .describe("The input data itself is defective. Use before drawing conclusions from the affected data.");

export const missingEvidenceNoticeBlock = z
  .object({
    type: z.literal("missing_evidence_notice"),
    ...blockBaseFields,
    whatIsMissing: z.string(),
    whyItIsNeeded: z.string(),
    severity: severitySchema,
    blockedProcedures: z.array(z.string()).describe("Procedures that could not be performed at all."),
    conclusionsAffected: z.array(z.string()),
    whatWasAssumedInstead: z
      .string()
      .nullable()
      .describe("Null if you performed no work in the gap. Never silently assume."),
    requestedFrom: z.string().nullable().describe("A role or system, e.g. 'AP team', 'bank portal'."),
  })
  .describe("Evidence you needed and do not have. claimType must be missing_information.");

/* -------------------------------------------------------------------------- */
/* Metrics                                                                    */
/* -------------------------------------------------------------------------- */

export const keyMetricCardBlock = z
  .object({
    type: z.literal("key_metric_card"),
    ...blockBaseFields,
    label: z.string(),
    value: z.number(),
    valueFormat: valueFormatSchema,
    currency: z.string().nullable().describe("Required when valueFormat is 'currency'."),
    unit: z.string().nullable().describe("e.g. 'days', 'entries'. Null for plain money or percentages."),
    period: z.string().nullable(),
    calculationBasis: z.string().describe("The exact arithmetic, so a reviewer can reproduce it."),
    context: z.string().nullable().describe("One line on whether this value is normal for this business."),
  })
  .describe("A single headline number with no comparison. If you are comparing periods, use trend_card.");

export const trendCardBlock = z
  .object({
    type: z.literal("trend_card"),
    ...blockBaseFields,
    ...chartConfigFields,
    label: z.string(),
    points: z.array(seriesPointSchema).describe("Ordered oldest to newest. At least three points."),
    currentValue: z.number(),
    previousValue: z.number(),
    changeAbsolute: z.number().describe("currentValue - previousValue."),
    changePercent: z.number().nullable().describe("Null when previousValue is zero."),
    direction: z.enum(["up", "down", "flat"]),
    interpretation: z
      .enum(["favourable", "unfavourable", "neutral"])
      .describe("Direction is arithmetic; interpretation is judgement. A rising cost is 'up' and 'unfavourable'."),
    periodLabel: z.string(),
  })
  .describe("One metric moving over time, with a sparkline. Use when the movement is the point.");

export const comparisonCardBlock = z
  .object({
    type: z.literal("comparison_card"),
    ...blockBaseFields,
    label: z.string(),
    items: z
      .array(
        z.object({
          label: z.string(),
          value: z.number(),
          note: z.string().nullable(),
        }),
      )
      .describe("Two or more things being compared side by side at a single point in time."),
    valueFormat: valueFormatSchema,
    currency: z.string().nullable(),
    basisOfComparison: z.string().describe("What makes these items comparable at all."),
    whatDiffers: z.string().describe("The material difference the reader should take away."),
  })
  .describe("Compares like-for-like items at one point in time. Not for actual-vs-expected — use variance_card.");

export const varianceCardBlock = z
  .object({
    type: z.literal("variance_card"),
    ...blockBaseFields,
    label: z.string(),
    actual: z.number(),
    expected: z.number(),
    expectedBasis: z.enum(["budget", "forecast", "prior_period", "peer", "policy", "model_estimate"]),
    varianceAbsolute: z.number().describe("actual - expected."),
    variancePercent: z.number().nullable().describe("Null when expected is zero."),
    favourable: z.boolean().nullable().describe("Null when the direction has no good/bad meaning."),
    currency: z.string().nullable(),
    thresholdPercent: z.number().nullable().describe("The tolerance the instructions set, if any."),
    exceedsThreshold: z.boolean().nullable(),
    explanation: z.string().nullable().describe("The explanation offered by the data or the client, if any."),
    explanationAccepted: z
      .boolean()
      .nullable()
      .describe("Whether the evidence actually supports the explanation. Null if you did not test it."),
  })
  .describe("Actual against an expectation. The workhorse of budget audits (PRD §12.3).");

export const financialRatioCardBlock = z
  .object({
    type: z.literal("financial_ratio_card"),
    ...blockBaseFields,
    ratioName: z.string().describe("e.g. 'Current ratio', 'DSO', 'Gross margin'."),
    formula: z.string().describe("e.g. 'Trade receivables / Revenue x 365'."),
    numeratorLabel: z.string(),
    numeratorValue: z.number(),
    denominatorLabel: z.string(),
    denominatorValue: z.number(),
    value: z.number(),
    unit: z.enum(["ratio", "percent", "days", "times"]),
    priorValue: z.number().nullable(),
    benchmarkValue: z.number().nullable(),
    benchmarkSource: z
      .string()
      .nullable()
      .describe("Must name a real source in the inputs. Never invent an industry benchmark."),
    interpretation: z.string(),
  })
  .describe("A derived ratio with its inputs exposed so a reviewer can recompute it.");

/* -------------------------------------------------------------------------- */
/* Tables                                                                     */
/* -------------------------------------------------------------------------- */

export const tableBlock = z
  .object({
    type: z.literal("table"),
    ...blockBaseFields,
    data: tableDataSchema,
    sortedBy: z.string().nullable().describe("Column key the rows are ordered by."),
    emphasisRowIndexes: z.array(z.number().int()).describe("Zero-based rows to draw attention to. Empty if none."),
    truncated: z.boolean().describe("True if you showed a subset of a larger result set."),
    fullRowCount: z.number().int().nullable().describe("Row count before truncation."),
  })
  .describe("Generic tabular data. Use a specialised table type whenever one fits.");

export const pivotTableBlock = z
  .object({
    type: z.literal("pivot_table"),
    ...blockBaseFields,
    rowDimension: z.string().describe("What the rows are grouped by, e.g. 'Account'."),
    columnDimension: z.string().describe("What the columns are grouped by, e.g. 'Month'."),
    measureLabel: z.string().describe("What the cells measure, e.g. 'Net posted amount'."),
    aggregation: z.enum(["sum", "count", "average", "min", "max"]),
    valueFormat: valueFormatSchema,
    currency: z.string().nullable(),
    rowHeaders: z.array(z.string()),
    columnHeaders: z.array(z.string()),
    cells: z
      .array(z.array(z.number().nullable()))
      .describe("cells[r][c] aligns to rowHeaders[r] and columnHeaders[c]. Use null for no data, not 0."),
    rowTotals: z.array(z.number()).nullable(),
    columnTotals: z.array(z.number()).nullable(),
    grandTotal: z.number().nullable(),
  })
  .describe("A cross-tabulation. Use when the story is in the intersection of two dimensions.");

export const transactionTableBlock = z
  .object({
    type: z.literal("transaction_table"),
    ...blockBaseFields,
    data: tableDataSchema.describe("One row per transaction. Include a date, a description and an amount column."),
    dateColumnKey: z.string(),
    amountColumnKey: z.string(),
    currency: z.string(),
    selectionBasis: z.string().describe("Why exactly these transactions and not others."),
    populationSize: z.number().int().nullable().describe("How many transactions the selection was drawn from."),
    flaggedRows: z
      .array(
        z.object({
          rowIndex: z.number().int().describe("Zero-based index into data.rows."),
          flag: z.enum([
            "duplicate",
            "round_number",
            "backdated",
            "weekend_or_holiday",
            "out_of_period",
            "unusual_user",
            "missing_description",
            "large_manual",
            "related_party",
            "sequence_gap",
          ]),
          reason: z.string(),
          severity: severitySchema,
        }),
      )
      .describe("Empty array if nothing is flagged — that is a meaningful result, not an omission."),
  })
  .describe("Individual transactions under scrutiny, with per-row flags. The evidence behind most findings.");

export const ledgerTableBlock = z
  .object({
    type: z.literal("ledger_table"),
    ...blockBaseFields,
    data: tableDataSchema.describe("Journal-style rows: date, journal ref, account, description, debit, credit."),
    debitColumnKey: z.string(),
    creditColumnKey: z.string(),
    accountColumnKey: z.string(),
    currency: z.string(),
    periodLabel: z.string(),
    debitTotal: z.number(),
    creditTotal: z.number(),
    balanced: z.boolean().describe("False is itself a finding — pair this with a finding_card."),
    postingSources: z
      .array(z.enum(["manual", "system", "integration", "adjustment", "recurring", "unknown"]))
      .describe("Which posting sources appear in these rows."),
  })
  .describe("Double-entry ledger extract with debit/credit integrity. Use instead of table for journal data.");

export const agingTableBlock = z
  .object({
    type: z.literal("aging_table"),
    ...blockBaseFields,
    subject: z.enum(["receivables", "payables", "other"]),
    agingBasis: z.enum(["invoice_date", "due_date"]),
    asOfDate: z.string().describe("ISO date the ageing is struck at."),
    currency: z.string(),
    buckets: z
      .array(
        z.object({
          label: z.string().describe("e.g. 'Current', '31-60', '90+'."),
          fromDays: z.number().int(),
          toDays: z.number().int().nullable().describe("Null means open-ended ('and over')."),
        }),
      )
      .describe("Contiguous, non-overlapping, oldest bucket last."),
    rows: z
      .array(
        z.object({
          entityName: z.string().describe("Customer or supplier name."),
          entityId: z.string().nullable(),
          bucketAmounts: z.array(z.number()).describe("One value per bucket, same order as buckets."),
          total: z.number(),
          disputed: z.boolean().nullable(),
          creditLimitExceeded: z.boolean().nullable(),
        }),
      )
      .describe("Ordered by total descending unless the instructions say otherwise."),
    bucketTotals: z.array(z.number()).describe("Column totals, same order as buckets."),
    grandTotal: z.number(),
  })
  .describe("Per-entity balances split into ageing buckets. For the shape of the ageing only, use aging_visualization.");

export const reconciliationTableBlock = z
  .object({
    type: z.literal("reconciliation_table"),
    ...blockBaseFields,
    currency: z.string(),
    sideALabel: z.string().describe("e.g. 'General ledger cash account 1010'."),
    sideASource: z.string(),
    sideAAmount: z.number(),
    sideBLabel: z.string().describe("e.g. 'Bank statement, HSBC 4471'."),
    sideBSource: z.string(),
    sideBAmount: z.number(),
    asOfDate: z.string(),
    differenceBefore: z.number().describe("sideAAmount - sideBAmount."),
    reconcilingItems: z.array(
      z.object({
        description: z.string(),
        amount: z.number().describe("Signed, in the direction that moves the reconciliation towards zero."),
        appliesTo: z.enum(["side_a", "side_b"]),
        itemType: z.enum([
          "timing_difference",
          "unrecorded_transaction",
          "error",
          "duplicate",
          "fx_difference",
          "fee_or_charge",
          "unexplained",
        ]),
        ageDays: z.number().int().nullable().describe("How long the item has been outstanding."),
        evidenceLabel: z.string().nullable(),
      }),
    ),
    residualDifference: z.number().describe("What remains after every reconciling item. Non-zero is a finding."),
    reconciled: z.boolean(),
  })
  .describe("Two independent sources brought to agreement. Use for bank, intercompany and control-account recs.");

/* -------------------------------------------------------------------------- */
/* Charts                                                                     */
/* -------------------------------------------------------------------------- */

export const barChartBlock = z
  .object({
    type: z.literal("bar_chart"),
    ...blockBaseFields,
    ...chartConfigFields,
    series: z.array(seriesSchema).describe("One entry for a simple bar chart; several to group or stack."),
    orientation: z.enum(["vertical", "horizontal"]).describe("Use horizontal when category labels are long."),
    stacked: z.boolean(),
    sortOrder: z.enum(["as_given", "value_desc", "value_asc", "label_asc"]),
    highlightLabels: z.array(z.string()).describe("Categories to emphasise, e.g. the exceptions. Empty if none."),
  })
  .describe("Compares magnitudes across categories. The default chart when in doubt.");

export const lineChartBlock = z
  .object({
    type: z.literal("line_chart"),
    ...blockBaseFields,
    ...chartConfigFields,
    series: z.array(seriesSchema).describe("Every series must share the same ordered x labels."),
    xAxisType: z.enum(["category", "time"]),
    showMarkers: z.boolean(),
    referenceLines: z
      .array(
        z.object({
          label: z.string().describe("e.g. 'Budget', 'Materiality'."),
          value: z.number(),
          axis: z.enum(["x", "y"]),
        }),
      )
      .describe("Thresholds worth drawing. Empty if none."),
    annotations: z
      .array(
        z.object({
          xLabel: z.string(),
          note: z.string(),
          severity: severitySchema.nullable(),
        }),
      )
      .describe("Call out specific points, e.g. the month a pattern breaks. Empty if none."),
  })
  .describe("Change over an ordered axis, especially time. Use for trends with more than one series.");

export const areaChartBlock = z
  .object({
    type: z.literal("area_chart"),
    ...blockBaseFields,
    ...chartConfigFields,
    series: z.array(seriesSchema),
    stacked: z.boolean().describe("True when the series sum to a meaningful total."),
    cumulative: z.boolean().describe("True when values are running totals rather than period amounts."),
    baselineZero: z.boolean().describe("False only when values cannot be negative and zero would mislead."),
  })
  .describe("Composition changing over time. Prefer line_chart when the total has no meaning.");

export const pieChartBlock = z
  .object({
    type: z.literal("pie_chart"),
    ...blockBaseFields,
    slices: z.array(sliceSchema).describe("Parts of one whole. Six slices or fewer; roll the rest into 'Other'."),
    total: z.number().describe("Must equal the sum of the slice values."),
    valueFormat: valueFormatSchema,
    currency: z.string().nullable(),
    otherSliceLabel: z.string().nullable().describe("Name of the roll-up slice, if you made one."),
    showPercentages: z.boolean(),
  })
  .describe("Share of a single total. Never use for change over time.");

export const donutChartBlock = z
  .object({
    type: z.literal("donut_chart"),
    ...blockBaseFields,
    slices: z.array(sliceSchema),
    total: z.number(),
    valueFormat: valueFormatSchema,
    currency: z.string().nullable(),
    centerLabel: z.string().describe("What the hole reports, e.g. 'Total spend'."),
    centerValue: z.number(),
    centerValueFormat: valueFormatSchema,
  })
  .describe("Like pie_chart, but when the total itself is a headline number worth putting in the middle.");

export const waterfallChartBlock = z
  .object({
    type: z.literal("waterfall_chart"),
    ...blockBaseFields,
    startLabel: z.string().describe("e.g. 'Opening balance' or 'Budgeted margin'."),
    startValue: z.number(),
    steps: z.array(
      z.object({
        label: z.string(),
        delta: z.number().describe("Signed. Negative decreases the running total."),
        category: z
          .enum(["increase", "decrease", "subtotal"])
          .describe("'subtotal' bars restate the running total and must have delta 0."),
        note: z.string().nullable(),
        severity: severitySchema.nullable().describe("Set when this step is itself an exception."),
      }),
    ),
    endLabel: z.string(),
    endValue: z.number().describe("Must equal startValue plus every non-subtotal delta."),
    reconciles: z.boolean().describe("False means the bridge does not tie — say so rather than forcing it."),
    valueFormat: valueFormatSchema,
    currency: z.string().nullable(),
  })
  .describe("Bridges one number to another through signed steps. The right choice for any 'why did X change' story.");

export const scatterChartBlock = z
  .object({
    type: z.literal("scatter_chart"),
    ...blockBaseFields,
    ...chartConfigFields,
    points: z.array(
      z.object({
        x: z.number(),
        y: z.number(),
        label: z.string().nullable().describe("The record this point represents, e.g. an invoice number."),
        seriesName: z.string().nullable(),
        size: z.number().nullable().describe("Optional third dimension, e.g. transaction count."),
        outlier: z.boolean(),
      }),
    ),
    outlierCriterion: z.string().nullable().describe("The rule used to mark outliers. Non-null if any are marked."),
    trendSlope: z.number().nullable(),
    trendIntercept: z.number().nullable(),
    trendRSquared: z.number().nullable().describe("0-1. Null unless you actually fitted a line."),
  })
  .describe("Relationship between two numeric variables. Use to expose outliers against a population.");

export const heatmapBlock = z
  .object({
    type: z.literal("heatmap"),
    ...blockBaseFields,
    xLabels: z.array(z.string()),
    yLabels: z.array(z.string()),
    rows: z
      .array(z.array(z.number().nullable()))
      .describe("rows[y][x] aligns to yLabels[y] and xLabels[x]. Null where there is no data."),
    valueFormat: valueFormatSchema,
    currency: z.string().nullable(),
    colourScale: z.enum(["sequential", "diverging"]).describe("'diverging' only when zero is a meaningful midpoint."),
    minValue: z.number().nullable(),
    maxValue: z.number().nullable(),
    intensityMeaning: z
      .string()
      .describe("What a hot cell means in words — intensity must never be the only signal."),
  })
  .describe("Density across two categorical axes, e.g. postings by user by day. Good for behavioural patterns.");

export const riskMatrixBlock = z
  .object({
    type: z.literal("risk_matrix"),
    ...blockBaseFields,
    likelihoodAxis: z
      .array(
        z.object({
          level: z.number().int().describe("1 is lowest. Levels must be consecutive from 1."),
          label: z.string(),
        }),
      )
      .describe("Usually 3 or 5 levels."),
    impactAxis: z.array(
      z.object({
        level: z.number().int(),
        label: z.string(),
        monetaryThreshold: z.number().nullable().describe("The amount this impact level starts at, if defined."),
      }),
    ),
    currency: z.string().nullable(),
    items: z.array(
      z.object({
        label: z.string(),
        likelihood: z.number().int().describe("Must match a likelihoodAxis level."),
        impact: z.number().int().describe("Must match an impactAxis level."),
        severity: severitySchema.describe("The resulting rating, stated explicitly — never left to the cell colour."),
        findingRef: z.string().nullable(),
        note: z.string().nullable(),
      }),
    ),
    scoringNote: z.string().describe("How a cell maps to a severity."),
  })
  .describe("Plots risks on likelihood x impact. Use to prioritise several risks against each other.");

export const timelineBlock = z
  .object({
    type: z.literal("timeline"),
    ...blockBaseFields,
    from: z.string().nullable().describe("ISO date bounding the axis."),
    to: z.string().nullable(),
    orientation: z.enum(["horizontal", "vertical"]),
    events: z.array(
      z.object({
        date: z.string().describe("ISO date, or ISO date-time where the time of day matters."),
        label: z.string(),
        description: z.string().nullable(),
        category: z.enum([
          "transaction",
          "control_event",
          "approval",
          "adjustment",
          "policy_change",
          "external_event",
          "finding",
        ]),
        severity: severitySchema.nullable(),
        evidenceLabel: z.string().nullable(),
      }),
    ),
  })
  .describe("Ordered events in time. Use for sequence-of-events narratives, e.g. backdating or override chains.");

/* -------------------------------------------------------------------------- */
/* Domain visualisations                                                      */
/* -------------------------------------------------------------------------- */

export const periodComparisonBlock = z
  .object({
    type: z.literal("period_comparison"),
    ...blockBaseFields,
    periods: z.array(periodRefSchema).describe("Ordered oldest to newest."),
    metrics: z.array(
      z.object({
        label: z.string(),
        values: z.array(z.number()).describe("One value per period, same order as periods."),
        valueFormat: valueFormatSchema,
        currency: z.string().nullable(),
        changePercent: z.number().nullable().describe("First period to last. Null if not meaningful."),
        interpretation: z.enum(["favourable", "unfavourable", "neutral"]),
      }),
    ),
    basis: z
      .enum(["like_for_like", "as_reported"])
      .describe("Use 'as_reported' when the periods are not truly comparable, and say why in commentary."),
    notableShifts: z.array(z.string()).describe("Movements a reader should not miss."),
  })
  .describe("Several metrics across several periods. Use for period-over-period reviews.");

export const entityComparisonBlock = z
  .object({
    type: z.literal("entity_comparison"),
    ...blockBaseFields,
    entities: z.array(
      z.object({
        name: z.string(),
        entityId: z.string().nullable(),
        note: z.string().nullable(),
      }),
    ),
    metrics: z.array(
      z.object({
        label: z.string(),
        values: z.array(z.number()).describe("One value per entity, same order as entities."),
        valueFormat: valueFormatSchema,
        currency: z.string().nullable(),
        higherIsBetter: z.boolean().nullable(),
      }),
    ),
    normalisation: z
      .enum(["absolute", "percent_of_total", "per_entity_scale"])
      .describe("Entities of different sizes must be normalised before their metrics are compared."),
    outlierEntities: z.array(z.string()).describe("Entities whose profile does not fit the group."),
  })
  .describe("Same metrics across subsidiaries, departments or branches. Use to find the odd one out.");

export const customerConcentrationChartBlock = z
  .object({
    type: z.literal("customer_concentration_chart"),
    ...blockBaseFields,
    measure: z.enum(["revenue", "receivables", "orders"]),
    period: z.string(),
    currency: z.string(),
    customers: z.array(
      z.object({
        name: z.string(),
        customerId: z.string().nullable(),
        amount: z.number(),
        percentOfTotal: z.number().describe("0-100."),
        relatedParty: z.boolean().nullable(),
        newInPeriod: z.boolean().nullable(),
      }),
    ),
    total: z.number(),
    topNCount: z.number().int().describe("How many customers the topNPercent covers, e.g. 5."),
    topNPercent: z.number().describe("Share of total held by the top N customers, 0-100."),
    herfindahlIndex: z.number().nullable().describe("Sum of squared shares. Null if not computed."),
    thresholdPercent: z.number().nullable().describe("The concentration limit the instructions set, if any."),
  })
  .describe("Revenue or receivables dependence on a few customers (PRD §14.3).");

export const supplierConcentrationChartBlock = z
  .object({
    type: z.literal("supplier_concentration_chart"),
    ...blockBaseFields,
    measure: z.enum(["spend", "payables", "invoice_count"]),
    period: z.string(),
    currency: z.string(),
    suppliers: z.array(
      z.object({
        name: z.string(),
        supplierId: z.string().nullable(),
        amount: z.number(),
        percentOfTotal: z.number().describe("0-100."),
        underContract: z.boolean().nullable(),
        newInPeriod: z.boolean().nullable(),
        bankDetailsChangedInPeriod: z.boolean().nullable().describe("A classic payment-diversion indicator."),
      }),
    ),
    total: z.number(),
    topNCount: z.number().int(),
    topNPercent: z.number().describe("0-100."),
    singleSourceRisk: z.string().nullable().describe("Where dependence on one supplier cannot be substituted."),
  })
  .describe("Spend dependence and supplier-side fraud indicators (PRD §15.3).");

export const cashFlowVisualizationBlock = z
  .object({
    type: z.literal("cash_flow_visualization"),
    ...blockBaseFields,
    view: z.enum(["direct", "indirect"]),
    currency: z.string(),
    periods: z.array(z.string()).describe("Ordered oldest to newest."),
    openingBalance: z.number().describe("Balance at the start of the first period."),
    inflows: z.array(z.number()).describe("Positive. One per period."),
    outflows: z.array(z.number()).describe("Positive magnitudes, not negatives. One per period."),
    netMovement: z.array(z.number()).describe("inflows[i] - outflows[i]."),
    closingBalance: z.array(z.number()).describe("Running balance at the end of each period."),
    categories: z.array(
      z.object({
        name: z.string().describe("e.g. 'Customer receipts', 'Payroll'."),
        direction: z.enum(["inflow", "outflow"]),
        amounts: z.array(z.number()).describe("One per period, positive magnitudes."),
      }),
    ),
    lowestBalancePeriod: z.string().nullable(),
    lowestBalanceValue: z.number().nullable(),
    wentNegative: z.boolean().describe("True if any closing balance is below zero."),
  })
  .describe("Cash in, cash out and the running balance (PRD §13.3). Use for liquidity and leakage questions.");

export const agingVisualizationBlock = z
  .object({
    type: z.literal("aging_visualization"),
    ...blockBaseFields,
    subject: z.enum(["receivables", "payables", "other"]),
    asOfDate: z.string(),
    currency: z.string(),
    total: z.number(),
    buckets: z.array(
      z.object({
        label: z.string(),
        amount: z.number(),
        percentOfTotal: z.number().describe("0-100."),
        itemCount: z.number().int().nullable(),
        priorAmount: z.number().nullable().describe("Same bucket at the prior ageing date, if available."),
      }),
    ),
    oldestItemDays: z.number().int().nullable(),
    deteriorating: z.boolean().nullable().describe("Null unless prior-period buckets are actually available."),
  })
  .describe("The shape of an ageing profile and how it is moving. For per-entity detail, use aging_table.");

export const accountMovementVisualizationBlock = z
  .object({
    type: z.literal("account_movement_visualization"),
    ...blockBaseFields,
    accountCode: z.string(),
    accountName: z.string(),
    normalBalance: z.enum(["debit", "credit"]),
    currency: z.string(),
    openingBalance: z.number(),
    closingBalance: z.number(),
    movements: z.array(
      z.object({
        periodLabel: z.string(),
        debits: z.number(),
        credits: z.number(),
        net: z.number().describe("debits - credits."),
        entryCount: z.number().int().nullable(),
        unusual: z.boolean().describe("True where the movement breaks the account's normal pattern."),
        unusualReason: z.string().nullable(),
      }),
    ),
    expectedPattern: z.string().nullable().describe("What this account normally does, so deviation is visible."),
    dormantPeriods: z.array(z.string()).describe("Periods with no movement. Activity after dormancy is a red flag."),
  })
  .describe("One account's behaviour over time. Use for suspense, dormant and clearing-account work (PRD §11.3).");

/* -------------------------------------------------------------------------- */
/* Evidence                                                                   */
/* -------------------------------------------------------------------------- */

export const evidenceListBlock = z
  .object({
    type: z.literal("evidence_list"),
    ...blockBaseFields,
    items: z.array(
      z.object({
        label: z.string().describe("Human-readable citation, e.g. 'Bank statement, HSBC 4471, Mar 2026'."),
        inputId: z.string().describe("Exact id from the input manifest."),
        documentId: z.string().nullable(),
        whatItShows: z.string(),
        reliability: z
          .enum([
            "source_system",
            "third_party",
            "client_prepared",
            "management_representation",
            "derived_by_analysis",
          ])
          .describe("Ordered strongest to weakest. A management representation corroborates nothing on its own."),
        sufficientAlone: z.boolean(),
        relatedFindingRefs: z.array(z.string()),
      }),
    ),
    sufficiencyAssessment: z.string().describe("Whether the body of evidence as a whole supports the conclusions."),
  })
  .describe("Enumerates the evidence relied on and grades it. Use to close out a section or a whole audit.");

export const sourceCitationBlock = z
  .object({
    type: z.literal("source_citation"),
    ...blockBaseFields,
    source: evidenceSchema.describe("The single pinpoint reference this block exists to show."),
    quotedText: z.string().nullable().describe("Verbatim only. Never paraphrase inside quotes."),
    quotedValue: z.number().nullable().describe("The exact figure as it appears in the source."),
    howUsed: z.string().describe("What this citation is being used to prove."),
    verificationStatus: z.enum(["verified_against_source", "not_verified", "source_unavailable"]),
    retrievedAt: z.string().nullable().describe("ISO date-time, if the input records one."),
  })
  .describe("Pins one claim to one exact place in one source. Use when a number needs to be traceable inline.");

/* -------------------------------------------------------------------------- */
/* Actions                                                                    */
/* -------------------------------------------------------------------------- */

export const recommendationCardBlock = z
  .object({
    type: z.literal("recommendation_card"),
    ...blockBaseFields,
    recommendation: z.string().describe("An imperative sentence: what should be done."),
    rationale: z.string().describe("The evidence-based reason it is worth doing."),
    priority: prioritySchema,
    effort: effortSchema,
    expectedBenefit: z.string(),
    benefitQuantified: moneySchema.nullable(),
    ownerRole: z.string().nullable(),
    timeframe: z.string().nullable().describe("e.g. 'Before year-end close'."),
    dependencies: z.array(z.string()),
    relatedFindingRefs: z.array(z.string()).describe("Every recommendation should trace to a finding."),
  })
  .describe("A single recommendation. For a sequence of dependent steps, use action_plan.");

export const actionPlanBlock = z
  .object({
    type: z.literal("action_plan"),
    ...blockBaseFields,
    objective: z.string().describe("The end state the plan reaches."),
    steps: z.array(
      z.object({
        order: z.number().int().describe("1-based execution order."),
        action: z.string(),
        ownerRole: z.string().nullable(),
        targetTimeframe: z.string().nullable(),
        dependsOnStep: z.number().int().nullable().describe("The order number this step waits on."),
        successCriteria: z.string().describe("How the reader will know the step is done."),
        priority: prioritySchema,
      }),
    ),
    relatedFindingRefs: z.array(z.string()),
    estimatedDuration: z.string().nullable(),
  })
  .describe("An ordered, owned remediation plan. Use when several actions must happen in sequence.");

export const managementQuestionBlock = z
  .object({
    type: z.literal("management_question"),
    ...blockBaseFields,
    context: z.string().nullable().describe("What prompted these questions."),
    questions: z.array(
      z.object({
        question: z.string().describe("A direct, answerable question. Not a rhetorical one."),
        whyAsked: z.string(),
        informationNeeded: z.string().describe("What an adequate answer must contain."),
        addressedToRole: z.string().nullable(),
        blocksConclusion: z.boolean().describe("True if you cannot conclude the area without an answer."),
        relatedFindingRefs: z.array(z.string()),
      }),
    ),
  })
  .describe("Questions to put to management. Use instead of speculating when only they hold the answer.");

export const rootCauseAnalysisBlock = z
  .object({
    type: z.literal("root_cause_analysis"),
    ...blockBaseFields,
    symptom: z.string().describe("The observed problem the analysis starts from."),
    relatedFindingRefs: z.array(z.string()),
    analysisMethod: z.enum([
      "five_whys",
      "fishbone",
      "control_gap_trace",
      "data_lineage",
      "hypothesis_elimination",
    ]),
    causeChain: z.array(
      z.object({
        level: z.number().int().describe("1 is the immediate cause; higher numbers are deeper."),
        statement: z.string(),
        evidenceLabel: z.string().nullable(),
        verified: z.boolean().describe("False means this link is reasoning, not evidence."),
      }),
    ),
    rootCauses: z.array(
      z.object({
        statement: z.string(),
        category: z.enum(["process", "people", "system", "data", "policy", "external"]),
        confidence: confidenceSchema,
      }),
    ),
    ruledOut: z.array(z.string()).describe("Candidate causes tested and eliminated, with what eliminated them."),
    systemic: z.boolean().describe("True if the cause would produce the same symptom elsewhere."),
  })
  .describe("Traces a symptom to its cause. Use when the fix depends on knowing why, not just what.");

export const controlWeaknessBlock = z
  .object({
    type: z.literal("control_weakness"),
    ...blockBaseFields,
    controlRef: z.string().nullable().describe("The client's own control identifier, if the inputs give one."),
    controlName: z.string(),
    controlObjective: z.string().describe("What the control is supposed to prevent or detect."),
    controlType: controlTypeSchema,
    operation: controlOperationSchema,
    deficiencyType: z
      .enum(["design_deficiency", "operating_deficiency", "both"])
      .describe("Design = the control could not work even if performed. Operating = it was not performed properly."),
    gapDescription: z.string().describe("Precisely what is missing or failing."),
    howIdentified: z.string(),
    severity: severitySchema,
    populationTested: z.number().int().nullable(),
    exceptionsFound: z.number().int().nullable(),
    failureFrequency: z.string().nullable().describe("e.g. '3 of 12 months'."),
    exposure: moneySchema.nullable().describe("Value exposed by the gap. Null if not estimable."),
    exposureBasis: z.string().nullable().describe("Non-null whenever exposure is non-null."),
    compensatingControls: z.array(z.string()).describe("Empty array means nothing else catches this."),
    couldEnableFraud: z.boolean().describe("True where the gap would let an override go undetected."),
    relatedFindingRefs: z.array(z.string()),
  })
  .describe("A specific control that does not work. Pair with control_recommendation.");

export const controlRecommendationBlock = z
  .object({
    type: z.literal("control_recommendation"),
    ...blockBaseFields,
    addressesControlRef: z.string().nullable().describe("The controlRef of the control_weakness this answers."),
    recommendedControl: z.string().describe("The control as it should be stated in a control matrix."),
    controlType: controlTypeSchema,
    operation: controlOperationSchema,
    frequency: z.string().describe("How often the control should run, e.g. 'Every payment run'."),
    implementationSteps: z.array(z.string()),
    ownerRole: z.string().nullable(),
    cost: effortSchema,
    priority: prioritySchema,
    residualRiskAfter: riskLevelSchema.describe("The risk that remains once this control operates as designed."),
    testingApproach: z.string().nullable().describe("How a future audit should test that it works."),
  })
  .describe("The control that should exist. Use only alongside a stated weakness or risk.");

/* -------------------------------------------------------------------------- */
/* Epistemic hygiene                                                          */
/* -------------------------------------------------------------------------- */

export const assumptionBoxBlock = z
  .object({
    type: z.literal("assumption_box"),
    ...blockBaseFields,
    assumptions: z.array(
      z.object({
        assumption: z.string().describe("Something you took to be true without proving it."),
        basis: z.string().describe("Why the assumption is reasonable."),
        ifWrongThen: z.string().describe("The concrete consequence for the conclusions if it is false."),
        materialToConclusion: z.boolean(),
        validationSuggestion: z.string().nullable(),
      }),
    ),
  })
  .describe("Surfaces what you assumed. Emit one whenever any conclusion rests on an unproven premise.");

export const limitationBoxBlock = z
  .object({
    type: z.literal("limitation_box"),
    ...blockBaseFields,
    limitations: z.array(
      z.object({
        limitation: z.string(),
        cause: z.enum([
          "data_unavailable",
          "data_quality",
          "scope_restriction",
          "time_constraint",
          "system_access",
          "tooling",
          "expertise_required",
        ]),
        effectOnConclusions: z.string(),
        workaroundApplied: z.string().nullable(),
      }),
    ),
    overallEffect: z.enum(["none", "minor", "significant", "conclusions_qualified"]),
  })
  .describe("What constrained the work. Use for constraints on you; use data_quality_warning for defective inputs.");

export const contradictionAlertBlock = z
  .object({
    type: z.literal("contradiction_alert"),
    ...blockBaseFields,
    severity: severitySchema,
    statementAClaim: z.string(),
    statementASourceLabel: z.string(),
    statementBClaim: z.string(),
    statementBSourceLabel: z.string(),
    natureOfConflict: z.enum([
      "value_mismatch",
      "timing_mismatch",
      "classification_mismatch",
      "policy_vs_practice",
      "statement_vs_data",
      "instruction_conflict",
    ]),
    magnitude: moneySchema.nullable().describe("The size of the disagreement, where it is monetary."),
    whichIsMoreReliable: z.enum(["a", "b", "undetermined"]),
    reliabilityRationale: z.string().describe("Why you weighted one source over the other, or why you cannot."),
    resolutionNeeded: z.string().describe("What would settle it."),
  })
  .describe("Two sources disagree. Never silently pick a winner — emit this instead.");

export const followUpRequestBlock = z
  .object({
    type: z.literal("follow_up_request"),
    ...blockBaseFields,
    requestedItems: z.array(
      z.object({
        item: z.string().describe("The specific document, extract or access being requested."),
        purpose: z.string(),
        fromRole: z.string().nullable(),
        format: z.string().nullable().describe("e.g. 'CSV export with posting user and timestamp'."),
        blocking: z.boolean().describe("True if the audit cannot be completed without it."),
      }),
    ),
    ifNotProvided: z.string().describe("How the audit will be qualified if the request goes unmet."),
    targetTimeframe: z.string().nullable(),
    wouldEnable: z.array(z.string()).describe("The procedures that become possible once supplied."),
  })
  .describe("A concrete data request. Use when more evidence would change the conclusion.");

/* -------------------------------------------------------------------------- */
/* Closing                                                                    */
/* -------------------------------------------------------------------------- */

export const appendixBlock = z
  .object({
    type: z.literal("appendix"),
    ...blockBaseFields,
    contentType: z.enum([
      "raw_data_extract",
      "calculation_detail",
      "definitions",
      "full_transaction_list",
      "instruction_text",
      "other",
    ]),
    sections: z.array(
      z.object({
        heading: z.string(),
        body: z.string().describe("Plain prose or preformatted text. No markdown headings."),
      }),
    ),
    referencedByBlockTitles: z.array(z.string()).describe("The blocks that send the reader here."),
  })
  .describe("Supporting detail that would break the flow of the main narrative. Always place last.");

export const methodologyExplanationBlock = z
  .object({
    type: z.literal("methodology_explanation"),
    ...blockBaseFields,
    technique: z.string().describe("The named method, e.g. 'Benford's law first-digit test'."),
    plainLanguageExplanation: z.string().describe("Explain it to a reader who has never heard of it."),
    whyThisTechnique: z.string(),
    howToReadResults: z.string().describe("What a pass and a fail actually look like."),
    parameters: z.array(
      z.object({
        name: z.string(),
        value: z.string(),
        rationale: z.string().describe("Why this value and not another."),
      }),
    ),
    knownLimitations: z.array(z.string()).describe("Where the technique is known to mislead."),
    audience: z.enum(["board", "management", "finance_team", "auditor"]),
  })
  .describe("Explains one technique in depth. Use audit_methodology for the whole approach; this for one method.");

export const auditConclusionBlock = z
  .object({
    type: z.literal("audit_conclusion"),
    ...blockBaseFields,
    conclusion: z.string().describe("The answer to the audit objective, stated plainly."),
    conclusionType: z
      .enum([
        "no_material_issues",
        "issues_identified",
        "significant_issues_identified",
        "unable_to_conclude",
      ])
      .describe("Use 'unable_to_conclude' honestly rather than concluding on inadequate evidence."),
    overallRisk: riskLevelSchema,
    confidence: confidenceSchema,
    basisForConclusion: z.array(z.string()).describe("The specific work that supports it."),
    keyFindingRefs: z.array(z.string()),
    residualUncertainties: z.array(z.string()),
    nextSteps: z.array(z.string()),
    professionalReviewRequired: z
      .boolean()
      .describe("True whenever a qualified human must sign off before anyone relies on this."),
  })
  .describe("Closes the audit. At most one per audit, after the findings. This is not a statutory audit opinion.");

export const managementLetterSectionBlock = z
  .object({
    type: z.literal("management_letter_section"),
    ...blockBaseFields,
    sectionRef: z.string().nullable().describe("e.g. 'ML-2'."),
    addresseeRole: z.string().nullable(),
    criteria: z.string().describe("What should be the case — the policy, standard or expectation."),
    condition: z.string().describe("What is actually the case."),
    cause: z.string().describe("Why the gap exists."),
    effect: z.string().describe("What the gap costs or risks."),
    recommendation: z.string().describe("What management should do about it."),
    severity: severitySchema,
    priorYearRepeat: z.boolean().describe("True only if a prior-period report among the inputs raised the same point."),
    responseRequestedBy: z.string().nullable().describe("A date or milestone for management's written response."),
  })
  .describe("A formal letter section in criteria/condition/cause/effect form. Use for the deliverable to management.");

/* -------------------------------------------------------------------------- */
/* The union                                                                  */
/* -------------------------------------------------------------------------- */

export const auditBlockSchema = z.discriminatedUnion("type", [
  executiveSummaryBlock,
  auditScopeBlock,
  auditMethodologyBlock,
  overallRiskRatingBlock,
  findingCardBlock,
  riskHighlightBlock,
  warningBoxBlock,
  infoBoxBlock,
  successBoxBlock,
  dataQualityWarningBlock,
  missingEvidenceNoticeBlock,
  keyMetricCardBlock,
  trendCardBlock,
  comparisonCardBlock,
  varianceCardBlock,
  financialRatioCardBlock,
  tableBlock,
  pivotTableBlock,
  transactionTableBlock,
  ledgerTableBlock,
  agingTableBlock,
  reconciliationTableBlock,
  barChartBlock,
  lineChartBlock,
  areaChartBlock,
  pieChartBlock,
  donutChartBlock,
  waterfallChartBlock,
  scatterChartBlock,
  heatmapBlock,
  riskMatrixBlock,
  timelineBlock,
  periodComparisonBlock,
  entityComparisonBlock,
  customerConcentrationChartBlock,
  supplierConcentrationChartBlock,
  cashFlowVisualizationBlock,
  agingVisualizationBlock,
  accountMovementVisualizationBlock,
  evidenceListBlock,
  sourceCitationBlock,
  recommendationCardBlock,
  actionPlanBlock,
  managementQuestionBlock,
  rootCauseAnalysisBlock,
  controlWeaknessBlock,
  controlRecommendationBlock,
  assumptionBoxBlock,
  limitationBoxBlock,
  contradictionAlertBlock,
  followUpRequestBlock,
  appendixBlock,
  methodologyExplanationBlock,
  auditConclusionBlock,
  managementLetterSectionBlock,
]);

export type AuditBlock = z.infer<typeof auditBlockSchema>;

/** Narrows the union to one variant, e.g. `BlockOf<"finding_card">`. */
export type BlockOf<T extends BlockType> = Extract<AuditBlock, { type: T }>;

/**
 * Per-type schemas for validating a single block (e.g. on regenerate, or when re-validating a
 * row out of `output_blocks`). The mapped type makes TypeScript reject any drift from BLOCK_TYPES.
 */
export const BLOCK_SCHEMAS: { [K in BlockType]: z.ZodType<BlockOf<K>> } = {
  executive_summary: executiveSummaryBlock,
  audit_scope: auditScopeBlock,
  audit_methodology: auditMethodologyBlock,
  overall_risk_rating: overallRiskRatingBlock,
  finding_card: findingCardBlock,
  risk_highlight: riskHighlightBlock,
  warning_box: warningBoxBlock,
  info_box: infoBoxBlock,
  success_box: successBoxBlock,
  data_quality_warning: dataQualityWarningBlock,
  missing_evidence_notice: missingEvidenceNoticeBlock,
  key_metric_card: keyMetricCardBlock,
  trend_card: trendCardBlock,
  comparison_card: comparisonCardBlock,
  variance_card: varianceCardBlock,
  financial_ratio_card: financialRatioCardBlock,
  table: tableBlock,
  pivot_table: pivotTableBlock,
  transaction_table: transactionTableBlock,
  ledger_table: ledgerTableBlock,
  aging_table: agingTableBlock,
  reconciliation_table: reconciliationTableBlock,
  bar_chart: barChartBlock,
  line_chart: lineChartBlock,
  area_chart: areaChartBlock,
  pie_chart: pieChartBlock,
  donut_chart: donutChartBlock,
  waterfall_chart: waterfallChartBlock,
  scatter_chart: scatterChartBlock,
  heatmap: heatmapBlock,
  risk_matrix: riskMatrixBlock,
  timeline: timelineBlock,
  period_comparison: periodComparisonBlock,
  entity_comparison: entityComparisonBlock,
  customer_concentration_chart: customerConcentrationChartBlock,
  supplier_concentration_chart: supplierConcentrationChartBlock,
  cash_flow_visualization: cashFlowVisualizationBlock,
  aging_visualization: agingVisualizationBlock,
  account_movement_visualization: accountMovementVisualizationBlock,
  evidence_list: evidenceListBlock,
  source_citation: sourceCitationBlock,
  recommendation_card: recommendationCardBlock,
  action_plan: actionPlanBlock,
  management_question: managementQuestionBlock,
  root_cause_analysis: rootCauseAnalysisBlock,
  control_weakness: controlWeaknessBlock,
  control_recommendation: controlRecommendationBlock,
  assumption_box: assumptionBoxBlock,
  limitation_box: limitationBoxBlock,
  contradiction_alert: contradictionAlertBlock,
  follow_up_request: followUpRequestBlock,
  appendix: appendixBlock,
  methodology_explanation: methodologyExplanationBlock,
  audit_conclusion: auditConclusionBlock,
  management_letter_section: managementLetterSectionBlock,
};

/** Re-exported so the claim-type vocabulary travels with the block schemas. */
export { claimTypeSchema };
