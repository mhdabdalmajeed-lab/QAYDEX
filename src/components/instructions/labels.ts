import type { instructionCategoryEnum, instructionSourceEnum } from "@/db/schema";

/**
 * The vocabulary of the instructions library (PRD §9), in one place so the list, the
 * detail page and the form cannot drift apart.
 */

export type InstructionCategory = (typeof instructionCategoryEnum.enumValues)[number];

/** PRD §9.1 — the eleven categories, in the order the PRD lists them. */
export const CATEGORY_ORDER = [
  "organization",
  "client",
  "subsidiary",
  "department",
  "audit_type",
  "accounting_standard",
  "industry",
  "reporting",
  "risk",
  "data_handling",
  "output_formatting",
] as const satisfies readonly InstructionCategory[];

export const CATEGORY_LABELS: Record<InstructionCategory, string> = {
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

/** What the category means for the model — shown next to the picker so it is a choice, not a guess. */
export const CATEGORY_BLURBS: Record<InstructionCategory, string> = {
  organization: "How your firm audits, regardless of client or engagement.",
  client: "Rules that hold for one client's engagements.",
  subsidiary: "Rules for a specific legal entity within a group.",
  department: "Rules for one department's figures.",
  audit_type: "Rules tied to a kind of audit rather than a client.",
  accounting_standard: "Which framework applies, and how to read it.",
  industry: "Sector-specific treatment and expectations.",
  reporting: "What the written result must contain.",
  risk: "What to treat as risky, and how severely.",
  data_handling: "What the model may do with the evidence it is given.",
  output_formatting: "How findings are laid out and worded.",
};

export function isInstructionCategory(value: string): value is InstructionCategory {
  return (CATEGORY_ORDER as readonly string[]).includes(value);
}

export type InstructionStatus = "draft" | "active" | "archived";

export const STATUS_ORDER = ["draft", "active", "archived"] as const;

export const STATUS_LABELS: Record<InstructionStatus, string> = {
  draft: "Draft",
  active: "Active",
  archived: "Archived",
};

export const STATUS_BLURBS: Record<InstructionStatus, string> = {
  draft: "Not offered to any audit yet.",
  active: "Available to audits, and applied automatically if mandatory.",
  archived: "No longer offered to new audits. Audits that already used it are unchanged.",
};

export function isInstructionStatus(value: string): value is InstructionStatus {
  return (STATUS_ORDER as readonly string[]).includes(value);
}

export type InstructionVisibility = "workspace" | "private" | "client" | "system";

export const USER_VISIBILITIES = ["workspace", "private", "client"] as const;

export const VISIBILITY_LABELS: Record<InstructionVisibility, string> = {
  workspace: "Everyone in the workspace",
  private: "Only me",
  client: "Workspace, and the client it names",
  system: "Platform instruction",
};

/** Mirrors `MODULES` in `src/server/actions/instruction.ts`. */
export const INSTRUCTION_MODULES = [
  "general",
  "ledger",
  "budgets",
  "cash",
  "customers",
  "suppliers",
] as const;

export type InstructionModule = (typeof INSTRUCTION_MODULES)[number];

export const MODULE_LABELS: Record<InstructionModule, string> = {
  general: "General",
  ledger: "Ledger",
  budgets: "Budgets",
  cash: "Cash",
  customers: "Customers",
  suppliers: "Suppliers",
};

export function isInstructionModule(value: string): value is InstructionModule {
  return (INSTRUCTION_MODULES as readonly string[]).includes(value);
}

export type InstructionSource = (typeof instructionSourceEnum.enumValues)[number];

/**
 * PRD §9.3, in order. The rank is the position in this list: lower wins a conflict.
 * It is stated here rather than inferred so the page can explain the hierarchy in the
 * same terms the audit engine resolves it in.
 */
export const AUTHORITY_ORDER = [
  "platform_safety",
  "organization_mandatory",
  "client_mandatory",
  "template",
  "saved",
  "audit_specific",
  "chat",
] as const satisfies readonly InstructionSource[];

export const AUTHORITY_LABELS: Record<InstructionSource, string> = {
  platform_safety: "Platform safety and security requirements",
  organization_mandatory: "Organization mandatory instructions",
  client_mandatory: "Client or entity mandatory instructions",
  template: "Template instructions",
  saved: "User-selected reusable instructions",
  audit_specific: "Audit-specific instructions",
  chat: "Chat-level instructions",
};

export const AUTHORITY_BLURBS: Record<InstructionSource, string> = {
  platform_safety: "Set by the platform. Nothing in this library can override them.",
  organization_mandatory: "An Organization instruction marked mandatory.",
  client_mandatory: "A Client or Subsidiary instruction marked mandatory.",
  template: "Carried by the template the audit was started from.",
  saved: "An instruction from this library that the user attached to the audit.",
  audit_specific: "Written for that one audit, in its setup.",
  chat: "Asked for during a conversation about the audit.",
};

/**
 * Where an instruction in this library lands in §9.3, given what it is. This is a
 * statement about the hierarchy, not a prediction about a particular audit: a
 * non-mandatory instruction only reaches an audit if someone selects it.
 */
export function authorityFor(
  category: InstructionCategory,
  mandatory: boolean,
): InstructionSource {
  if (!mandatory) return "saved";
  if (category === "organization") return "organization_mandatory";
  if (category === "client" || category === "subsidiary") return "client_mandatory";
  // Every other mandatory category is workspace-wide policy in practice.
  return "organization_mandatory";
}

export function authorityRank(source: InstructionSource): number {
  return AUTHORITY_ORDER.indexOf(source) + 1;
}
