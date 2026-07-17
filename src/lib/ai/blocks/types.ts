/**
 * The generative interface vocabulary (PRD §18.2).
 *
 * This list is the single source of truth for three things that must never drift apart:
 * the JSON schema the model is allowed to emit, the `output_blocks.type` column, and the
 * React renderer registry. Adding a block type means adding a schema and a renderer.
 */
export const BLOCK_TYPES = [
  // Narrative frame
  "executive_summary",
  "audit_scope",
  "audit_methodology",
  "overall_risk_rating",
  // Findings and callouts
  "finding_card",
  "risk_highlight",
  "warning_box",
  "info_box",
  "success_box",
  "data_quality_warning",
  "missing_evidence_notice",
  // Metrics
  "key_metric_card",
  "trend_card",
  "comparison_card",
  "variance_card",
  "financial_ratio_card",
  // Tables
  "table",
  "pivot_table",
  "transaction_table",
  "ledger_table",
  "aging_table",
  "reconciliation_table",
  // Charts
  "bar_chart",
  "line_chart",
  "area_chart",
  "pie_chart",
  "donut_chart",
  "waterfall_chart",
  "scatter_chart",
  "heatmap",
  "risk_matrix",
  "timeline",
  // Domain visualisations
  "period_comparison",
  "entity_comparison",
  "customer_concentration_chart",
  "supplier_concentration_chart",
  "cash_flow_visualization",
  "aging_visualization",
  "account_movement_visualization",
  // Evidence
  "evidence_list",
  "source_citation",
  // Actions
  "recommendation_card",
  "action_plan",
  "management_question",
  "root_cause_analysis",
  "control_weakness",
  "control_recommendation",
  // Epistemic hygiene
  "assumption_box",
  "limitation_box",
  "contradiction_alert",
  "follow_up_request",
  // Closing
  "appendix",
  "methodology_explanation",
  "audit_conclusion",
  "management_letter_section",
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export const BLOCK_TYPE_SET: ReadonlySet<string> = new Set(BLOCK_TYPES);

export function isBlockType(value: string): value is BlockType {
  return BLOCK_TYPE_SET.has(value);
}

/** Severity is never communicated by colour alone (PRD §26.4). */
export const SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;
export type Severity = (typeof SEVERITIES)[number];

export const CONFIDENCES = ["high", "medium", "low"] as const;
export type Confidence = (typeof CONFIDENCES)[number];

/**
 * How much epistemic weight a statement carries (PRD §10.5, §31). The model must label every
 * claim, and the evidence-review stage demotes anything it cannot tie back to a source.
 */
export const CLAIM_TYPES = [
  "evidence_supported",
  "reasonable_interpretation",
  "unverified_hypothesis",
  "missing_information",
  "user_claim",
  "judgment_required",
] as const;
export type ClaimType = (typeof CLAIM_TYPES)[number];

export const RISK_LEVELS = ["critical", "high", "medium", "low", "none"] as const;
export type RiskLevel = (typeof RISK_LEVELS)[number];

export const AUDIT_DOMAINS = [
  "general",
  "ledger",
  "budgets",
  "cash",
  "customers",
  "suppliers",
] as const;
export type AuditDomain = (typeof AUDIT_DOMAINS)[number];
