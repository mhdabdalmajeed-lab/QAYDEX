/**
 * Model governance (PRD §23).
 *
 * "Using the latest available model without controls would make audits change
 * unpredictably." So the platform pins the latest *approved* model rather than
 * whatever OpenAI shipped this morning. This file is the shipped seed of that
 * registry; the live source of truth is the `approved_models` table, which an
 * administrator edits in Settings. A completed audit records the exact model id it
 * used and is never silently re-run against a newer one.
 *
 * Behaviour below was measured against the live API on 2026-07-16.
 *
 * Two measured facts shape everything here:
 *
 * 1. **`temperature` and `top_p` are rejected by the gpt-5.6 line** (`Unsupported parameter`),
 *    even though responses echo `temperature: 1.0, top_p: 0.98` back as if they applied. So
 *    PRD §6.5's "low-variance model settings" cannot mean `temperature: 0` here. Consistency
 *    instead comes from a pinned model id, a versioned system prompt, and strict output schemas.
 * 2. **`reasoning.effort: "minimal"` type-checks but 400s at runtime** on 5.6 — the SDK's
 *    `ReasoningEffort` union is a superset of what these models accept. Hence the narrower
 *    `ReasoningEffort` type below, which only admits values verified to work.
 */

/** Only the values gpt-5.6 actually accepts — deliberately narrower than the SDK's union. */
export type ReasoningEffort = "none" | "low" | "medium" | "high" | "xhigh";

export type ModelSeed = {
  modelId: string;
  label: string;
  status: "approved" | "candidate" | "deprecated";
  isDefault: boolean;
  contextWindow: number;
  evalNotes: string;
  params: {
    reasoningEffort?: ReasoningEffort;
    /** Output shape is fixed by the schema, so prose padding is wasted tokens. */
    verbosity?: "low" | "medium" | "high";
  };
};

export const MODEL_SEEDS: ModelSeed[] = [
  {
    modelId: "gpt-5.6-terra",
    label: "GPT-5.6 Terra",
    status: "approved",
    isDefault: true,
    contextWindow: 900_000,
    evalNotes:
      "Default audit model. Verified against /v1/responses with strict json_schema (a 55-variant " +
      "block union validates at ~4% of the 5000-property limit), function calling, vision and " +
      "streaming. Same latency class as Luna (12-17s on an audit probe) with slightly more concise " +
      "output. Context window measured >900K and <950K tokens.",
    params: { reasoningEffort: "medium", verbosity: "low" },
  },
  {
    modelId: "gpt-5.6-luna",
    label: "GPT-5.6 Luna",
    status: "approved",
    isDefault: false,
    contextWindow: 900_000,
    evalNotes:
      "Fastest of the 5.6 line on short prompts (~1s). Functionally equivalent to Terra on our " +
      "probes. Prefer when latency is the binding constraint.",
    params: { reasoningEffort: "medium", verbosity: "low" },
  },
  {
    modelId: "gpt-5.6-sol",
    label: "GPT-5.6 Sol (deep)",
    status: "approved",
    isDefault: false,
    contextWindow: 900_000,
    evalNotes:
      "The deep reasoner: ~5x the reasoning tokens and 4-5x the wall clock (66-74s vs 12-17s). It " +
      "found nothing extra on our audit probe, so it is not the default — reserve it for an " +
      "explicit deep-audit tier where the wait is acceptable.",
    params: { reasoningEffort: "high", verbosity: "low" },
  },
  {
    modelId: "gpt-5.5",
    label: "GPT-5.5",
    status: "approved",
    isDefault: false,
    contextWindow: 400_000,
    evalNotes: "Previous generation, kept approved so existing audits stay reproducible.",
    params: { reasoningEffort: "medium", verbosity: "low" },
  },
  {
    modelId: "gpt-5.4",
    label: "GPT-5.4",
    status: "deprecated",
    isDefault: false,
    contextWindow: 400_000,
    evalNotes:
      "Superseded. Retained only so revisions generated with it can still be read and compared.",
    params: {},
  },
];

/** Cheap, fast model for narrow mechanical sub-tasks (titles, summaries of one table). */
export const UTILITY_MODEL = "gpt-5.4-mini";

/** Bumped whenever a prompt changes in a way that could move results (PRD §23). */
export const PROMPT_VERSION = "1.0.0";

/** Bumped whenever a block's schema changes shape. */
export const BLOCK_SCHEMA_VERSION = "1.0.0";

export const FALLBACK_MODEL_ID = "gpt-5.6-terra";
