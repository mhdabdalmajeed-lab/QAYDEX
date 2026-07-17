import {
  ActionPlanBlock,
  ControlRecommendationBlock,
  ControlWeaknessBlock,
  EvidenceListBlock,
  ManagementQuestionBlock,
  RecommendationCardBlock,
  RootCauseAnalysisBlock,
  SourceCitationBlock,
} from "@/components/blocks/actions";
import {
  AssumptionBoxBlock,
  ContradictionAlertBlock,
  DataQualityWarningBlock,
  FindingCardBlock,
  FollowUpRequestBlock,
  InfoBoxBlock,
  LimitationBoxBlock,
  MissingEvidenceNoticeBlock,
  RiskHighlightBlock,
  SuccessBoxBlock,
  WarningBoxBlock,
} from "@/components/blocks/callouts";
import {
  AreaChartBlock,
  BarChartBlock,
  DonutChartBlock,
  LineChartBlock,
  PieChartBlock,
  ScatterChartBlock,
  WaterfallChartBlock,
} from "@/components/blocks/charts";
import {
  ComparisonCardBlock,
  FinancialRatioCardBlock,
  KeyMetricCardBlock,
  TrendCardBlock,
  VarianceCardBlock,
} from "@/components/blocks/metrics";
import {
  AppendixBlock,
  AuditConclusionBlock,
  AuditMethodologyBlock,
  AuditScopeBlock,
  ExecutiveSummaryBlock,
  ManagementLetterSectionBlock,
  MethodologyExplanationBlock,
  OverallRiskRatingBlock,
} from "@/components/blocks/narrative";
import {
  AgingTableBlock,
  LedgerTableBlock,
  PivotTableBlock,
  ReconciliationTableBlock,
  TableBlock,
  TransactionTableBlock,
} from "@/components/blocks/tables";
import {
  AccountMovementVisualizationBlock,
  AgingVisualizationBlock,
  CashFlowVisualizationBlock,
  CustomerConcentrationChartBlock,
  EntityComparisonBlock,
  HeatmapBlock,
  PeriodComparisonBlock,
  RiskMatrixBlock,
  SupplierConcentrationChartBlock,
  TimelineBlock,
} from "@/components/blocks/visualizations";
import type { AuditBlock } from "@/lib/ai/blocks/schemas";

/**
 * Renders one model-authored block.
 *
 * The switch is exhaustive by construction: `AuditBlock` is a discriminated union, so adding
 * a block type to the schema without a renderer here is a TypeScript error at the
 * `never` case rather than a blank space in a published audit.
 */
export function AuditBlockView({ block }: { block: AuditBlock }) {
  switch (block.type) {
    // Narrative frame
    case "executive_summary":
      return <ExecutiveSummaryBlock block={block} />;
    case "audit_scope":
      return <AuditScopeBlock block={block} />;
    case "audit_methodology":
      return <AuditMethodologyBlock block={block} />;
    case "overall_risk_rating":
      return <OverallRiskRatingBlock block={block} />;
    case "methodology_explanation":
      return <MethodologyExplanationBlock block={block} />;
    case "audit_conclusion":
      return <AuditConclusionBlock block={block} />;
    case "management_letter_section":
      return <ManagementLetterSectionBlock block={block} />;
    case "appendix":
      return <AppendixBlock block={block} />;

    // Findings and callouts
    case "finding_card":
      return <FindingCardBlock block={block} />;
    case "risk_highlight":
      return <RiskHighlightBlock block={block} />;
    case "warning_box":
      return <WarningBoxBlock block={block} />;
    case "info_box":
      return <InfoBoxBlock block={block} />;
    case "success_box":
      return <SuccessBoxBlock block={block} />;
    case "data_quality_warning":
      return <DataQualityWarningBlock block={block} />;
    case "missing_evidence_notice":
      return <MissingEvidenceNoticeBlock block={block} />;
    case "contradiction_alert":
      return <ContradictionAlertBlock block={block} />;
    case "assumption_box":
      return <AssumptionBoxBlock block={block} />;
    case "limitation_box":
      return <LimitationBoxBlock block={block} />;
    case "follow_up_request":
      return <FollowUpRequestBlock block={block} />;

    // Metrics
    case "key_metric_card":
      return <KeyMetricCardBlock block={block} />;
    case "trend_card":
      return <TrendCardBlock block={block} />;
    case "comparison_card":
      return <ComparisonCardBlock block={block} />;
    case "variance_card":
      return <VarianceCardBlock block={block} />;
    case "financial_ratio_card":
      return <FinancialRatioCardBlock block={block} />;

    // Tables
    case "table":
      return <TableBlock block={block} />;
    case "pivot_table":
      return <PivotTableBlock block={block} />;
    case "transaction_table":
      return <TransactionTableBlock block={block} />;
    case "ledger_table":
      return <LedgerTableBlock block={block} />;
    case "aging_table":
      return <AgingTableBlock block={block} />;
    case "reconciliation_table":
      return <ReconciliationTableBlock block={block} />;

    // Charts
    case "bar_chart":
      return <BarChartBlock block={block} />;
    case "line_chart":
      return <LineChartBlock block={block} />;
    case "area_chart":
      return <AreaChartBlock block={block} />;
    case "pie_chart":
      return <PieChartBlock block={block} />;
    case "donut_chart":
      return <DonutChartBlock block={block} />;
    case "scatter_chart":
      return <ScatterChartBlock block={block} />;
    case "waterfall_chart":
      return <WaterfallChartBlock block={block} />;

    // Domain visualisations
    case "heatmap":
      return <HeatmapBlock block={block} />;
    case "risk_matrix":
      return <RiskMatrixBlock block={block} />;
    case "timeline":
      return <TimelineBlock block={block} />;
    case "period_comparison":
      return <PeriodComparisonBlock block={block} />;
    case "entity_comparison":
      return <EntityComparisonBlock block={block} />;
    case "customer_concentration_chart":
      return <CustomerConcentrationChartBlock block={block} />;
    case "supplier_concentration_chart":
      return <SupplierConcentrationChartBlock block={block} />;
    case "cash_flow_visualization":
      return <CashFlowVisualizationBlock block={block} />;
    case "aging_visualization":
      return <AgingVisualizationBlock block={block} />;
    case "account_movement_visualization":
      return <AccountMovementVisualizationBlock block={block} />;

    // Evidence and actions
    case "evidence_list":
      return <EvidenceListBlock block={block} />;
    case "source_citation":
      return <SourceCitationBlock block={block} />;
    case "recommendation_card":
      return <RecommendationCardBlock block={block} />;
    case "action_plan":
      return <ActionPlanBlock block={block} />;
    case "management_question":
      return <ManagementQuestionBlock block={block} />;
    case "root_cause_analysis":
      return <RootCauseAnalysisBlock block={block} />;
    case "control_weakness":
      return <ControlWeaknessBlock block={block} />;
    case "control_recommendation":
      return <ControlRecommendationBlock block={block} />;

    default: {
      // Exhaustiveness check: if this stops compiling, a block type has no renderer.
      const unhandled: never = block;
      void unhandled;
      return null;
    }
  }
}
