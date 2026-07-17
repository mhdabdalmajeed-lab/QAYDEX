import "server-only";

import OpenAI from "openai";
import type { ZodType } from "zod";

import { db } from "@/db";
import { modelCalls } from "@/db/schema";
import type { ToolCallRecord } from "@/db/schema";
import { toStrictJsonSchema } from "@/lib/ai/json-schema";
import { FALLBACK_MODEL_ID, PROMPT_VERSION, type ReasoningEffort } from "@/lib/ai/models";

/**
 * The single door to the model.
 *
 * Everything the platform sends to OpenAI goes through here so that the constraints
 * verified against the live API are enforced in one place, and so that every call is
 * logged with its model id, prompt version and tool calls (PRD §22.9, §25.3).
 *
 * Constraints encoded here (all measured, not assumed):
 *  - `temperature`/`top_p` are REJECTED by gpt-5.6 — never send them.
 *  - `reasoning.effort: "minimal"` type-checks but 400s — the ReasoningEffort type excludes it.
 *  - Strict json_schema needs `additionalProperties: false` and every key in `required`, so
 *    zod schemas must use `.nullable()` and never `.optional()`.
 *  - `format: "email"` HANGS the request forever — never put it in a schema.
 *  - Prompt caching is automatic on a stable prefix; no parameter to set.
 */

let cached: OpenAI | null = null;

export function openai(): OpenAI {
  if (!cached) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    cached = new OpenAI({ apiKey, maxRetries: 3, timeout: 10 * 60 * 1000 });
  }
  return cached;
}

export class ModelRefusal extends Error {
  constructor(public readonly refusal: string) {
    super(`The model declined to answer: ${refusal}`);
    this.name = "ModelRefusal";
  }
}

export type CallContext = {
  workspaceId: string;
  stage: string;
  jobId?: string | null;
  revisionId?: string | null;
  conversationId?: string | null;
};

export type GenerateOptions<T> = {
  model?: string;
  system: string;
  input: OpenAI.Responses.ResponseInput | string;
  schema: ZodType<T>;
  schemaName: string;
  effort?: ReasoningEffort;
  verbosity?: "low" | "medium" | "high";
  maxOutputTokens?: number;
  context: CallContext;
  toolCalls?: ToolCallRecord[];
};

/**
 * Logs a call and swallows logging failures: an audit that produced good output must not
 * fail because its telemetry insert did.
 */
async function record(
  context: CallContext,
  modelId: string,
  fields: {
    requestSummary?: Record<string, unknown>;
    responseMeta?: Record<string, unknown>;
    toolCalls?: ToolCallRecord[];
    inputTokens?: number;
    outputTokens?: number;
    latencyMs?: number;
    status: "completed" | "failed";
    error?: string;
  },
) {
  try {
    await db.insert(modelCalls).values({
      workspaceId: context.workspaceId,
      jobId: context.jobId ?? null,
      revisionId: context.revisionId ?? null,
      conversationId: context.conversationId ?? null,
      stage: context.stage,
      modelId,
      promptVersion: PROMPT_VERSION,
      requestSummary: fields.requestSummary ?? {},
      responseMeta: fields.responseMeta ?? {},
      toolCalls: fields.toolCalls ?? [],
      inputTokens: fields.inputTokens ?? null,
      outputTokens: fields.outputTokens ?? null,
      latencyMs: fields.latencyMs ?? null,
      status: fields.status,
      error: fields.error ?? null,
    });
  } catch (error) {
    console.error("[ai] failed to log model call", error);
  }
}

export { sanitizeJsonSchema, toStrictJsonSchema } from "@/lib/ai/json-schema";

/** The output array holds several item shapes; only some carry text content. */
function contentParts(response: OpenAI.Responses.Response): unknown[] {
  const parts: unknown[] = [];
  for (const item of response.output ?? []) {
    if ("content" in item && Array.isArray(item.content)) parts.push(...item.content);
  }
  return parts;
}

export function extractText(response: OpenAI.Responses.Response): string {
  // output_text is a convenience getter, but it is absent on some shapes; walking the
  // output array is the reliable path.
  const direct = response.output_text;
  if (direct) return direct;
  return contentParts(response)
    .map((part) =>
      part && typeof part === "object" && "text" in part && typeof part.text === "string"
        ? part.text
        : "",
    )
    .join("");
}

function findRefusal(response: OpenAI.Responses.Response): string | null {
  for (const part of contentParts(response)) {
    if (part && typeof part === "object" && "type" in part && part.type === "refusal") {
      return "refusal" in part && typeof part.refusal === "string" ? part.refusal : "unspecified";
    }
  }
  return null;
}

/**
 * One structured-output call. Returns parsed, schema-valid data or throws — a caller must
 * never have to wonder whether the shape it got back is trustworthy (PRD §26.3).
 */
export async function generateStructured<T>(options: GenerateOptions<T>): Promise<T> {
  const modelId = options.model ?? FALLBACK_MODEL_ID;
  const started = Date.now();

  try {
    const response = await openai().responses.create({
      model: modelId,
      instructions: options.system,
      input: options.input,
      // No temperature/top_p: gpt-5.6 rejects them outright.
      reasoning: { effort: options.effort ?? "medium" },
      text: {
        verbosity: options.verbosity ?? "low",
        format: toStrictJsonSchema(options.schema, options.schemaName),
      },
      max_output_tokens: options.maxOutputTokens ?? 32_000,
    });

    const refusal = findRefusal(response);
    if (refusal) throw new ModelRefusal(refusal);

    const text = extractText(response);
    if (!text) {
      throw new Error(
        `Model returned no output (status: ${response.status ?? "unknown"}, ` +
          `incomplete: ${response.incomplete_details?.reason ?? "n/a"})`,
      );
    }

    const parsed = options.schema.parse(JSON.parse(text));

    await record(options.context, modelId, {
      requestSummary: { schemaName: options.schemaName, effort: options.effort ?? "medium" },
      responseMeta: {
        status: response.status,
        reasoningTokens: response.usage?.output_tokens_details?.reasoning_tokens,
        cachedTokens: response.usage?.input_tokens_details?.cached_tokens,
      },
      toolCalls: options.toolCalls,
      inputTokens: response.usage?.input_tokens,
      outputTokens: response.usage?.output_tokens,
      latencyMs: Date.now() - started,
      status: "completed",
    });

    return parsed;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await record(options.context, modelId, {
      requestSummary: { schemaName: options.schemaName },
      latencyMs: Date.now() - started,
      status: "failed",
      error: message,
    });
    throw error;
  }
}
