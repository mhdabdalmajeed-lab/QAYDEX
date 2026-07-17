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

export const DOMAIN_BLURBS: Record<LibraryDomain, string> = {
  ledger:
    "Every audit categorised as a ledger audit. There is no persistent global ledger — the " +
    "ledger files and parsed tables live inside the audit they were provided for.",
  budgets:
    "Every audit categorised as a budget audit. There is no platform-wide budget database — " +
    "budgets and forecasts live inside the audit they were provided for.",
  cash:
    "Every audit categorised as a cash audit. Bank statements and cash records stay inside " +
    "the audit they were provided for.",
  customers:
    "Every audit categorised as a customer or receivables audit. There is no customer master " +
    "here — customer data lives inside the audit it was provided for.",
  suppliers:
    "Every audit categorised as a supplier, purchasing or payables audit. There is no supplier " +
    "management module — supplier data lives inside the audit it was provided for.",
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

export type DomainFilter = {
  /** The `?filter=` value. Surfaced as tabs on the domain page itself, not in the sidebar. */
  key: string;
  label: string;
  /**
   * Template tags that mark an audit as belonging to this sub-library. An audit is
   * matched through the template it was created from, which is the only durable signal
   * we have — the platform stores no separate taxonomy of its own.
   */
  tags: string[];
};

export const DOMAIN_FILTERS: Record<LibraryDomain, DomainFilter[]> = {
  ledger: [
    { key: "general_ledger", label: "General ledger audits", tags: ["general-ledger"] },
    {
      key: "journal_entry",
      label: "Journal entry audits",
      tags: ["journal-entries", "journals", "manual-journals", "entry-testing"],
    },
    { key: "trial_balance", label: "Trial balance audits", tags: ["trial-balance"] },
    {
      key: "account_classification",
      label: "Account classification audits",
      tags: ["classification", "chart-of-accounts", "expense-classification", "coding-consistency"],
    },
    {
      key: "period_end",
      label: "Period-end audits",
      tags: ["period-end", "period-close", "close-process", "closing-balances", "cut-off"],
    },
    {
      key: "intercompany",
      label: "Intercompany audits",
      tags: ["intercompany", "consolidation", "multi-entity", "elimination"],
    },
    {
      key: "suspense_account",
      label: "Suspense account audits",
      tags: ["suspense", "clearing-accounts", "dormant-accounts"],
    },
    {
      key: "reconciliation",
      label: "Ledger reconciliation audits",
      tags: ["reconciliation", "roll-forward", "substantiation"],
    },
  ],
  budgets: [
    {
      key: "variance",
      label: "Budget variance audits",
      tags: ["variance", "varianceanalysis", "budgetvsactual"],
    },
    {
      key: "forecast_accuracy",
      label: "Forecast accuracy audits",
      tags: ["forecast", "forecastaccuracy", "rolling-forecast", "reforecast"],
    },
    {
      key: "department",
      label: "Department budget audits",
      tags: ["departmentbudget", "costcentre", "recharges"],
    },
    {
      key: "capital",
      label: "Capital budget audits",
      tags: ["capital", "capitalbudget", "capex", "project"],
    },
    {
      key: "cash_budget",
      label: "Cash budget audits",
      tags: ["cashbudget", "liquidity", "workingcapital", "funding-gap"],
    },
    {
      key: "assumptions",
      label: "Budget assumption audits",
      tags: ["assumptions", "sensitivity", "scenario", "modelreview", "bias"],
    },
    {
      key: "approval",
      label: "Budget approval audits",
      tags: ["approval", "budgetapproval", "governance", "delegation", "change-control"],
    },
  ],
  cash: [
    {
      key: "bank_reconciliation",
      label: "Bank reconciliation audits",
      tags: ["reconciliation", "bank-statements", "deposits-in-transit", "bank"],
    },
    { key: "cash_flow", label: "Cash-flow audits", tags: ["cash-flow", "forecast", "forecasting"] },
    {
      key: "liquidity",
      label: "Liquidity audits",
      tags: ["liquidity", "solvency", "working-capital", "covenants"],
    },
    {
      key: "payments",
      label: "Payment audits",
      tags: ["payments", "duplicate-payments", "payee-master", "beneficiaries"],
    },
    { key: "receipts", label: "Receipt audits", tags: ["receipts", "lapping", "cash-application"] },
    { key: "petty_cash", label: "Petty-cash audits", tags: ["petty-cash", "imprest", "custody"] },
    {
      key: "treasury",
      label: "Treasury audits",
      tags: ["treasury", "pooling", "hedging", "escrow", "restricted-cash"],
    },
  ],
  customers: [
    {
      key: "accounts_receivable",
      label: "Accounts receivable audits",
      tags: ["receivables", "dso", "unapplied-cash"],
    },
    { key: "revenue", label: "Revenue audits", tags: ["revenue", "revenue-leakage", "pricing"] },
    { key: "aging", label: "Customer aging audits", tags: ["aging", "collections", "dunning"] },
    {
      key: "credit",
      label: "Customer credit audits",
      tags: ["credit-control", "credit-risk", "bad-debt", "expected-loss", "collectability"],
    },
    {
      key: "revenue_recognition",
      label: "Revenue recognition audits",
      tags: ["revenue-recognition", "cut-off", "deferred-revenue", "accounting-policy"],
    },
    { key: "refunds", label: "Refund audits", tags: ["refunds", "returns", "revenue-reversal"] },
    { key: "credit_notes", label: "Credit-note audits", tags: ["credit-notes", "adjustments"] },
  ],
  suppliers: [
    {
      key: "accounts_payable",
      label: "Accounts payable audits",
      tags: ["payables", "aging", "liabilities"],
    },
    {
      key: "procurement",
      label: "Procurement audits",
      tags: ["procurement", "maverick-spend", "policy-compliance", "spend"],
    },
    { key: "duplicate_invoices", label: "Duplicate invoice audits", tags: ["duplicates", "invoices"] },
    {
      key: "duplicate_payments",
      label: "Duplicate payment audits",
      tags: ["duplicate-payments", "payments"],
    },
    {
      key: "supplier_master",
      label: "Supplier master audits",
      tags: ["master-data", "supplier-records", "onboarding", "vendor-risk"],
    },
    {
      key: "purchase_orders",
      label: "Purchase-order audits",
      tags: ["purchase-orders", "commitment-control", "split-purchases"],
    },
    {
      key: "three_way_match",
      label: "Three-way matching audits",
      tags: ["three-way-match", "goods-receipt", "tolerances"],
    },
  ],
};

export function domainFilter(domain: LibraryDomain, key: string | undefined): DomainFilter | null {
  if (!key) return null;
  return DOMAIN_FILTERS[domain].find((f) => f.key === key) ?? null;
}

/** `?a=1&a=2` resolves to an array; every filter here is single-valued. */
export function firstParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value?.trim() ? value.trim() : undefined;
}
