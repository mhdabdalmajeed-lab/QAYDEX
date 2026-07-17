import { BLOCK_TYPE_SET } from "@/lib/ai/blocks/types";
import { INTEGRATION_PROVIDER_KEYS } from "@/lib/integrations/catalog";
import { budgetTemplatesA } from "@/lib/templates/data/budgets-a";
import { budgetTemplatesB } from "@/lib/templates/data/budgets-b";
import { cashTemplatesA } from "@/lib/templates/data/cash-a";
import { cashTemplatesB } from "@/lib/templates/data/cash-b";
import { customerTemplatesA } from "@/lib/templates/data/customers-a";
import { customerTemplatesB } from "@/lib/templates/data/customers-b";
import { generalTemplatesA } from "@/lib/templates/data/general-a";
import { generalTemplatesB } from "@/lib/templates/data/general-b";
import { ledgerTemplatesA } from "@/lib/templates/data/ledger-a";
import { ledgerTemplatesB } from "@/lib/templates/data/ledger-b";
import { ledgerTemplatesC } from "@/lib/templates/data/ledger-c";
import { supplierTemplatesA } from "@/lib/templates/data/suppliers-a";
import { supplierTemplatesB } from "@/lib/templates/data/suppliers-b";
import type { AuditTemplateSeed } from "@/lib/templates/types";

export type { AuditTemplateSeed, RecommendedInput } from "@/lib/templates/types";

/** The system template library (PRD §17.1: at least 100 at launch). */
export const AUDIT_TEMPLATES: AuditTemplateSeed[] = [
  ...generalTemplatesA,
  ...generalTemplatesB,
  ...ledgerTemplatesA,
  ...ledgerTemplatesB,
  ...ledgerTemplatesC,
  ...budgetTemplatesA,
  ...budgetTemplatesB,
  ...cashTemplatesA,
  ...cashTemplatesB,
  ...customerTemplatesA,
  ...customerTemplatesB,
  ...supplierTemplatesA,
  ...supplierTemplatesB,
];

/**
 * The seed data is authored by hand across many files, so it is checked rather than
 * trusted: a bad slug or an invented block type would otherwise surface as a broken
 * audit long after seeding. Called by the seed script and by the template test.
 */
export function validateTemplates(templates = AUDIT_TEMPLATES): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();

  for (const t of templates) {
    if (seen.has(t.slug)) problems.push(`duplicate slug: ${t.slug}`);
    seen.add(t.slug);

    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(t.slug)) {
      problems.push(`slug is not kebab-case: ${t.slug}`);
    }
    if (!t.instructions || t.instructions.length < 400) {
      problems.push(`${t.slug}: instructions too short to be a real method`);
    }
    for (const block of t.expectedOutputStructure) {
      if (!BLOCK_TYPE_SET.has(block)) {
        problems.push(`${t.slug}: unknown block type "${block}"`);
      }
    }
    for (const key of t.relevantIntegrations) {
      if (!INTEGRATION_PROVIDER_KEYS.includes(key)) {
        problems.push(`${t.slug}: unknown integration "${key}"`);
      }
    }
    if (t.recommendedInputs.length === 0) {
      problems.push(`${t.slug}: no recommended inputs`);
    }
  }

  return problems;
}

export function templatesByCategory(category: AuditTemplateSeed["category"]) {
  return AUDIT_TEMPLATES.filter((t) => t.category === category);
}

export const TEMPLATE_COUNTS = {
  total: AUDIT_TEMPLATES.length,
  general: templatesByCategory("general").length,
  ledger: templatesByCategory("ledger").length,
  budgets: templatesByCategory("budgets").length,
  cash: templatesByCategory("cash").length,
  customers: templatesByCategory("customers").length,
  suppliers: templatesByCategory("suppliers").length,
};
