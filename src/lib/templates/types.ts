import type { AuditDomain, BlockType } from "@/lib/ai/blocks/types";

/**
 * A seeded audit template (PRD §17). Templates are versioned content, not code paths: the
 * `instructions` text is what actually steers the model, so it carries the audit's whole method.
 * Nothing here encodes a finding or a threshold — that stays the model's job (PRD §6.3).
 */
export type RecommendedInput = {
  name: string;
  description: string;
  /** Extensions or source kinds a user would typically provide. */
  formats: string[];
  required: boolean;
};

export type AuditTemplateSeed = {
  /** Stable identifier used for upserts; never reuse across meanings. */
  slug: string;
  name: string;
  category: AuditDomain;
  subcategory: string;
  description: string;
  defaultTitle: string;
  auditDescription: string;
  /**
   * The audit method, written as instructions to the model: objective, scope, materiality framing,
   * risk areas, required comparisons, evidence standards, reporting format, tone, and whether to
   * ask clarifying questions before concluding.
   */
  instructions: string;
  recommendedInputs: RecommendedInput[];
  requiredEvidence: string[];
  suggestedPeriod: "monthly" | "quarterly" | "annual" | "custom";
  /** Blocks the model is expected to produce; guidance, not a hard contract. */
  expectedOutputStructure: BlockType[];
  suggestedFollowups: string[];
  /** Provider keys from `@/lib/integrations/catalog`. */
  relevantIntegrations: string[];
  tags: string[];
};
