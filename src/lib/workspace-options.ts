/**
 * The choices offered when a workspace is created (PRD §27 "Workspace").
 *
 * Shared verbatim between the onboarding form and the server action that
 * validates it, so the two can never drift apart.
 */

export const WORKSPACE_TYPES = [
  {
    value: "internal",
    label: "Internal company",
    description:
      "One organisation auditing itself. Audits are grouped by entity and reporting period.",
  },
  {
    value: "firm",
    label: "Audit firm",
    description:
      "You audit other organisations. Adds clients and engagements, kept separate from one another.",
  },
] as const;

export const ACCOUNTING_STANDARDS = [
  { value: "ifrs", label: "IFRS" },
  { value: "us_gaap", label: "US GAAP" },
  { value: "uk_gaap", label: "UK GAAP" },
  { value: "ind_as", label: "Ind AS" },
  { value: "aasb", label: "AASB" },
  { value: "aspe", label: "ASPE" },
  { value: "local_gaap", label: "Local GAAP" },
] as const;

export const ACCOUNTING_STANDARD_VALUES = [
  "ifrs",
  "us_gaap",
  "uk_gaap",
  "ind_as",
  "aasb",
  "aspe",
  "local_gaap",
] as const;

export type AccountingStandard = (typeof ACCOUNTING_STANDARD_VALUES)[number];

export const BASE_CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "CHF",
  "CAD",
  "AUD",
  "JPY",
  "CNY",
  "INR",
  "SGD",
  "AED",
  "SAR",
  "ZAR",
  "BRL",
  "MXN",
] as const;

export const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" },
] as const;

export const INDUSTRIES = [
  "Financial services",
  "Manufacturing",
  "Retail and e-commerce",
  "Technology and software",
  "Healthcare",
  "Energy and utilities",
  "Construction and real estate",
  "Transport and logistics",
  "Hospitality",
  "Public sector",
  "Non-profit",
  "Professional services",
] as const;

/** The form field name a single accounting-standard checkbox submits under. */
export function standardFieldName(value: AccountingStandard): string {
  return `standard.${value}`;
}
