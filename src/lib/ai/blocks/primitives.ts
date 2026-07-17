import { z } from "zod";

import { BLOCK_TYPES, CLAIM_TYPES, CONFIDENCES, RISK_LEVELS, SEVERITIES } from "@/lib/ai/blocks/types";

/**
 * Shared pieces every block schema is built from.
 *
 * Two rules govern everything in this file, both measured against the live Responses API:
 *
 *  1. **`.nullable()`, never `.optional()`.** Strict mode requires every key in `properties`
 *     to appear in `required`; `.optional()` removes it and the request is rejected. An
 *     absent value is therefore expressed as an explicit `null`.
 *  2. **No `format: "email"`** anywhere — it hangs the request rather than erroring.
 *
 * `.describe()` text is sent to the model as JSON Schema `description`, so it is prompt
 * surface, not documentation for us. Keep it instructive.
 */

export const severitySchema = z.enum(SEVERITIES);
export const confidenceSchema = z.enum(CONFIDENCES);
export const riskLevelSchema = z.enum(RISK_LEVELS);
export const blockTypeSchema = z.enum(BLOCK_TYPES);

export const claimTypeSchema = z
  .enum(CLAIM_TYPES)
  .describe(
    "How much weight this statement carries. evidence_supported = tied to a specific source; " +
      "reasonable_interpretation = a defensible reading that goes beyond what is directly shown; " +
      "unverified_hypothesis = plausible but untested; missing_information = you could not check; " +
      "user_claim = asserted by the user, not corroborated; judgment_required = needs a " +
      "professional's decision. Never label something evidence_supported without a citation.",
  );

/**
 * A pointer back into an input. The audit is only as trustworthy as these — every material
 * claim carries at least one, and the evidence-review stage rejects any that do not resolve
 * to a real input/document (PRD §6.2, §22.6).
 */
export const evidenceSchema = z.object({
  inputId: z.string().describe("The exact id of the audit input, taken from the input manifest."),
  documentId: z
    .string()
    .nullable()
    .describe("The exact id of the parsed document (sheet/page/table) inside that input, if known."),
  label: z.string().describe("Short human-readable citation, e.g. 'GL export, sheet Jan, rows 44-51'."),
  sheet: z.string().nullable(),
  page: z.number().int().nullable(),
  rowFrom: z.number().int().nullable(),
  rowTo: z.number().int().nullable(),
  columns: z.array(z.string()).nullable(),
  cell: z.string().nullable().describe("e.g. 'D14' for a spreadsheet cell."),
  section: z.string().nullable().describe("Named section/heading for prose documents."),
  excerpt: z.string().nullable().describe("Short verbatim quote or value from the source."),
});

export type EvidenceInput = z.infer<typeof evidenceSchema>;

export const moneySchema = z.object({
  amount: z.number(),
  currency: z.string().describe("ISO code, e.g. 'USD'. Use the currency of the source data."),
});

/** A table cell. The union emits `anyOf`, which strict mode supports. */
export const cellSchema = z.union([z.string(), z.number(), z.boolean(), z.null()]);

export const columnSchema = z.object({
  key: z.string(),
  label: z.string(),
  align: z.enum(["left", "right", "center"]).nullable(),
  format: z
    .enum(["text", "number", "currency", "percent", "date"])
    .nullable()
    .describe("How the cell should be rendered. Use 'currency' for money columns."),
});

export const tableDataSchema = z.object({
  columns: z.array(columnSchema),
  rows: z.array(z.array(cellSchema)).describe("Each row must have exactly one cell per column."),
  totalRow: z.array(cellSchema).nullable().describe("Optional totals row, same width as columns."),
  note: z.string().nullable(),
});

export const seriesPointSchema = z.object({
  label: z.string(),
  value: z.number(),
});

export const seriesSchema = z.object({
  name: z.string(),
  points: z.array(seriesPointSchema),
});

/**
 * Every block carries this. `evidence` is on the base rather than per-variant so that no
 * block type can quietly opt out of citation.
 */
export const blockBaseFields = {
  title: z.string().describe("Short heading shown above the block."),
  evidence: z
    .array(evidenceSchema)
    .describe("Sources backing this block. Required for any block asserting a number or a fact."),
  claimType: claimTypeSchema,
  commentary: z
    .string()
    .nullable()
    .describe("Optional short prose shown under the block. Plain text, no markdown headings."),
};

/** Axis/formatting hints shared by the chart blocks. */
export const chartConfigFields = {
  xLabel: z.string().nullable(),
  yLabel: z.string().nullable(),
  valueFormat: z.enum(["number", "currency", "percent"]).nullable(),
  currency: z.string().nullable(),
};
