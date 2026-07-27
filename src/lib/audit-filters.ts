import type { AuditDomain } from "@/lib/ai/blocks/types";

/**
 * Shared vocabulary for the audit library and the domain libraries.
 *
 * The product is audit-first (PRD "Revised navigation"): `/w/<slug>/ledger` is a
 * *filtered view of the audit library*, not a ledger. Everything here therefore
 * describes how to narrow a set of audits — never how to browse accounting records.
 */

export const AUDIT_DOMAINS = [
  "general",
  "ledger",
  "budgets",
  "cash",
  "customers",
  "suppliers",
] as const;

/** The five domains that have their own nav section and library page. */
export const LIBRARY_DOMAINS = ["ledger", "budgets", "cash", "customers", "suppliers"] as const;

export type LibraryDomain = (typeof LIBRARY_DOMAINS)[number];

export function isLibraryDomain(value: string): value is LibraryDomain {
  return (LIBRARY_DOMAINS as readonly string[]).includes(value);
}

export const DOMAIN_LABELS: Record<AuditDomain, string> = {
  general: "General",
  ledger: "Ledger",
  budgets: "Budgets",
  cash: "Cash",
  customers: "Customers",
  suppliers: "Suppliers",
};

/** Singular, lowercase — for sentences like "Create ledger audit". */
export const DOMAIN_NOUNS: Record<LibraryDomain, string> = {
  ledger: "ledger",
  budgets: "budget",
  cash: "cash",
  customers: "customer",
  suppliers: "supplier",
};


export const AUDIT_STATUSES = [
  "draft",
  "queued",
  "processing",
  "needs_input",
  "completed",
  "review_needed",
  "approved",
  "failed",
  "archived",
] as const;

export type AuditStatus = (typeof AUDIT_STATUSES)[number];

export const STATUS_LABELS: Record<AuditStatus, string> = {
  draft: "Draft",
  queued: "Queued",
  processing: "Processing",
  needs_input: "Needs input",
  completed: "Completed",
  review_needed: "Review needed",
  approved: "Approved",
  failed: "Failed",
  archived: "Archived",
};

export function isAuditStatus(value: string): value is AuditStatus {
  return (AUDIT_STATUSES as readonly string[]).includes(value);
}

/**
 * The tabs on the audit library, in the order an auditor triages. `all` deliberately
 * excludes archived audits — archive is its own tab, not part of the working set.
 */
export const LIBRARY_TABS = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "processing", label: "Processing" },
  { value: "completed", label: "Completed" },
  { value: "needs_input", label: "Needs input" },
  { value: "review_needed", label: "Needs review" },
  { value: "approved", label: "Approved" },
  { value: "archived", label: "Archived" },
] as const;

export const RISK_LEVELS = ["critical", "high", "medium", "low", "none"] as const;

export type RiskLevel = (typeof RISK_LEVELS)[number];

export const RISK_LABELS: Record<RiskLevel, string> = {
  critical: "Critical risk",
  high: "High risk",
  medium: "Medium risk",
  low: "Low risk",
  none: "No risk identified",
};

export function isRiskLevel(value: string): value is RiskLevel {
  return (RISK_LEVELS as readonly string[]).includes(value);
}

export const SEVERITIES = ["critical", "high", "medium", "low", "info"] as const;

export type SeverityLevel = (typeof SEVERITIES)[number];

export const SEVERITY_LABELS: Record<SeverityLevel, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Info",
};

/**
 * Finding categories (PRD §20 "Finding category"). `findings.riskCategory` is free text
 * written by the model, so the filter is a contains-match against these headings rather
 * than an enum — the list is the vocabulary we suggest, not a constraint we impose.
 */
export const FINDING_CATEGORIES = [
  "accuracy",
  "completeness",
  "compliance",
  "control",
  "cut-off",
  "classification",
  "duplication",
  "fraud",
  "valuation",
  "disclosure",
  "process",
  "data quality",
] as const;


/** `?a=1&a=2` resolves to an array; every filter here is single-valued. */
export function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value?.trim() ? value.trim() : undefined;
}
