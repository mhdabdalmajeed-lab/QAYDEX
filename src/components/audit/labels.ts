import type { AuditDomain } from "@/lib/ai/blocks/types";

/**
 * Vocabulary shared by the audit setup screens. Kept in one plain module so the server
 * pages and the client components can never disagree about what a value is called.
 */

export const DOMAIN_LABEL: Record<AuditDomain, string> = {
  general: "General",
  ledger: "Ledger",
  budgets: "Budgets",
  cash: "Cash",
  customers: "Customers",
  suppliers: "Suppliers",
};

export const DOMAIN_ORDER: AuditDomain[] = [
  "general",
  "ledger",
  "budgets",
  "cash",
  "customers",
  "suppliers",
];

export type InstructionSource =
  | "platform_safety"
  | "organization_mandatory"
  | "client_mandatory"
  | "template"
  | "saved"
  | "audit_specific"
  | "chat";

/** PRD §9.3 — authority order, highest first. The number is what the user sees as "rank". */
export const SOURCE_ORDER: InstructionSource[] = [
  "platform_safety",
  "organization_mandatory",
  "client_mandatory",
  "template",
  "saved",
  "audit_specific",
  "chat",
];

export const SOURCE_LABEL: Record<InstructionSource, string> = {
  platform_safety: "Platform safety and security",
  organization_mandatory: "Organization mandatory",
  client_mandatory: "Client or entity mandatory",
  template: "Template",
  saved: "Selected saved instructions",
  audit_specific: "Audit-specific",
  chat: "Chat-level",
};

export const SOURCE_EXPLANATION: Record<InstructionSource, string> = {
  platform_safety:
    "Always applied and cannot be removed. Sets the evidence and honesty standards every audit is held to.",
  organization_mandatory:
    "Marked mandatory in your instruction library, so it applies whether or not anyone selects it.",
  client_mandatory:
    "Mandatory for this client or entity. Applies automatically to audits scoped to them.",
  template: "Carried by a template, from before templates were removed.",
  saved: "Reusable instructions someone chose for this audit.",
  audit_specific: "Written for this audit alone.",
  chat: "Added during a conversation about this audit.",
};

export const INSTRUCTION_CATEGORY_LABEL: Record<string, string> = {
  organization: "Organization",
  client: "Client",
  subsidiary: "Subsidiary",
  department: "Department",
  audit_type: "Audit type",
  accounting_standard: "Accounting standard",
  industry: "Industry",
  reporting: "Reporting",
  risk: "Risk",
  data_handling: "Data handling",
  output_formatting: "Output formatting",
};

export const INPUT_STATUS_LABEL: Record<string, string> = {
  pending: "Waiting to be read",
  parsing: "Being read",
  parsed: "Read",
  failed: "Could not be read",
  unsupported: "Format not supported",
};

export const AUDIT_STATUS_LABEL: Record<string, string> = {
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

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
