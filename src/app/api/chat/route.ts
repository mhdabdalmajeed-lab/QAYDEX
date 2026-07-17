import { and, asc, eq } from "drizzle-orm";
import type OpenAI from "openai";
import { z } from "zod";

import { db } from "@/db";
import { conversationAudits, conversations, messages, modelCalls } from "@/db/schema";
import type { MessageCitation, ToolCallRecord } from "@/db/schema";
import { auditBlockSchema } from "@/lib/ai/blocks/schemas";
import type { BlockType } from "@/lib/ai/blocks/types";
import { buildChatGrounding, resolveChatModel } from "@/lib/ai/chat-context";
import { generateStructured, openai } from "@/lib/ai/client";
import { PLATFORM_SAFETY_INSTRUCTION, chatSystemPrompt } from "@/lib/ai/prompts";
import { AUDIT_TOOLS, executeToolCall } from "@/lib/ai/tools";
import { logActivity } from "@/lib/activity";
import { AccessDenied, requirePermissionApi } from "@/lib/auth/guards";

/**
 * The chat turn (PRD §10).
 *
 * A Route Handler rather than a Server Function for one reason: the answer streams. Server
 * Functions return once, and a finance professional watching a blank pane for forty seconds
 * while the model reads a ledger is not an acceptable interface.
 *
 * The important architectural point is that this runs the *same tool loop as the audit
 * engine* against the *same evidence*. Chat answers are therefore computed from the audit's
 * inputs at question time, not recalled from a summary — which is what stops the chat quietly
 * contradicting the audit it is discussing (PRD §6.3, §10.5).
 *
 * A direct POST here is a real request: the guard below is the boundary, and every query
 * carries its own workspace predicate because drizzle bypasses RLS.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/** The model drives; this caps a pathological loop rather than shaping the investigation. */
const MAX_TURNS = 16;
const MAX_HISTORY_MESSAGES = 60;
const TOOL_OUTPUT_CHARS = 120_000;

const bodySchema = z.object({
  conversationId: z.string().uuid(),
  message: z.string().trim().min(1).max(20_000),
});

/**
 * What the client renders after the prose lands: the citations behind the answer, anything
 * worth drawing, and where the conversation could go next. It is a second pass over the same
 * history — the model has already read the evidence, so this is transcription, not new
 * analysis, and it runs at low effort.
 */
const trailerSchema = z.object({
  citations: z
    .array(
      z.object({
        label: z.string().describe("What this source shows, in a few words."),
        auditId: z.string().nullable(),
        inputId: z.string().nullable(),
        documentId: z.string().nullable(),
        findingId: z.string().nullable(),
        sheet: z.string().nullable(),
        page: z.number().nullable(),
        rowFrom: z.number().nullable(),
        rowTo: z.number().nullable(),
      }),
    )
    .describe("Only ids you actually read this turn. Empty if the answer cited nothing."),
  blocks: z
    .array(auditBlockSchema)
    .describe(
      "A chart or table ONLY if the user asked for one or the answer is genuinely clearer drawn. " +
        "Usually empty — do not decorate a two-sentence answer.",
    ),
  suggestedFollowups: z
    .array(z.string())
    .describe("At most three. Real next questions this evidence could answer, not filler."),
});

type ScopedAudit = { id: string; name: string };

/** Matches the `blocks` jsonb on `messages`: the whole block lives in `content`, exactly as
 *  `output_blocks` stores it, so one renderer serves audits and chat alike. */
type MessageBlock = { type: BlockType; title?: string; content: Record<string, unknown> };

/**
 * The tools are scoped by auditId. With one audit attached the engine's definitions are used
 * unchanged; with several, each gains an `auditId` argument constrained to the attached set,
 * so the model must say which audit it is reading — and cannot reach one that is not attached.
 */
function scopedTools(scope: ScopedAudit[]): OpenAI.Responses.Tool[] {
  if (scope.length <= 1) return AUDIT_TOOLS;

  const description =
    `Which attached audit to read. One of: ${scope
      .map((audit) => `${audit.id} ("${audit.name}")`)
      .join("; ")}.`;

  return AUDIT_TOOLS.map((tool) => {
    if (tool.type !== "function" || !tool.parameters) return tool;
    const parameters: Record<string, unknown> = { ...tool.parameters };
    const properties = parameters.properties;
    const required = parameters.required;

    return {
      ...tool,
      parameters: {
        ...parameters,
        properties: {
          ...(typeof properties === "object" && properties !== null ? properties : {}),
          auditId: { type: "string", enum: scope.map((audit) => audit.id), description },
        },
        required: [...(Array.isArray(required) ? required.map(String) : []), "auditId"],
      },
    };
  });
}

/** Splits the scoping argument back out before the engine's executor sees the call. */
function routeCall(
  rawArguments: string,
  scope: ScopedAudit[],
): { auditId: string; args: string } {
  const fallback = scope[0]?.id ?? "";
  if (scope.length <= 1) return { auditId: fallback, args: rawArguments };

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawArguments || "{}");
  } catch {
    // Let executeToolCall report the malformed JSON — it records the failure properly.
    return { auditId: fallback, args: rawArguments };
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return { auditId: fallback, args: rawArguments };
  }

  const record: Record<string, unknown> = { ...parsed };
  const requested = record.auditId;
  delete record.auditId;

  const chosen = scope.find((audit) => audit.id === requested)?.id ?? fallback;
  return { auditId: chosen, args: JSON.stringify(record) };
}

function encodeEvent(event: Record<string, unknown>): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(event)}\n\n`);
}

function errorResponse(message: string, status: number): Response {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Malformed request body.", 400);
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return errorResponse(parsed.error.issues[0]?.message ?? "Invalid request.", 400);
  }

  const [conversation] = await db
    .select()
    .from(conversations)
    .where(eq(conversations.id, parsed.data.conversationId))
    .limit(1);
  if (!conversation) return errorResponse("Conversation not found.", 404);

  try {
    await requirePermissionApi(conversation.workspaceId, "chat.use");
  } catch (error) {
    if (error instanceof AccessDenied) return errorResponse(error.message, 403);
    throw error;
  }

  const workspaceId = conversation.workspaceId;
  const conversationId = conversation.id;

  const attached = await db
    .select({ id: conversationAudits.auditId })
    .from(conversationAudits)
    .where(
      and(
        eq(conversationAudits.conversationId, conversationId),
        eq(conversationAudits.workspaceId, workspaceId),
      ),
    );

  const grounding = await buildChatGrounding(
    attached.map((row) => row.id),
    workspaceId,
  );
  const scope: ScopedAudit[] = grounding.audits.map((audit) => ({
    id: audit.id,
    name: audit.name,
  }));

  const model = await resolveChatModel(workspaceId);

  // The user's turn is persisted before the model is called: if the stream dies, the question
  // is still in the transcript rather than lost with the connection.
  const [userMessage] = await db
    .insert(messages)
    .values({
      workspaceId,
      conversationId,
      role: "user",
      content: parsed.data.message,
    })
    .returning({ id: messages.id, createdAt: messages.createdAt });

  await db
    .update(conversations)
    .set({ updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  const prior = await db
    .select({ role: messages.role, content: messages.content, id: messages.id })
    .from(messages)
    .where(and(eq(messages.conversationId, conversationId), eq(messages.workspaceId, workspaceId)))
    .orderBy(asc(messages.createdAt))
    .limit(MAX_HISTORY_MESSAGES);

  await logActivity({
    workspaceId,
    action: "conversation.message_sent",
    targetType: "conversation",
    targetId: conversationId,
    auditId: scope[0]?.id ?? null,
    metadata: { modelId: model.modelId, attachedAudits: scope.length },
  });

  const tools = scopedTools(scope);
  const system = `${PLATFORM_SAFETY_INSTRUCTION}\n\n---\n\n${chatSystemPrompt()}${
    scope.length === 0
      ? "\n\nNo audit is attached to this conversation, so you have no evidence and no tools. You can discuss method, standards and how to frame an audit, but you must not state any figure about this organisation's data. When the user asks something only their data could answer, say plainly that they need to attach an audit."
      : ""
  }`;

  const history: OpenAI.Responses.ResponseInput = [];
  if (grounding.text) history.push({ role: "user", content: grounding.text });
  for (const message of prior) {
    // `tool` rows are transcript artefacts of past turns; the model's own reasoning items are
    // not replayed, so only the prose of each side is carried forward.
    if (message.role === "user" || message.role === "assistant") {
      if (message.content.trim().length === 0) continue;
      history.push({ role: message.role, content: message.content });
    }
  }

  const started = Date.now();
  const toolRecords: ToolCallRecord[] = [];
  const client = openai();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let answer = "";
      let closed = false;

      const send = (event: Record<string, unknown>) => {
        if (closed) return;
        controller.enqueue(encodeEvent(event));
      };

      try {
        let turns = 0;
        let inputTokens = 0;
        let outputTokens = 0;

        // The engine's tool loop, streamed. The model decides when it has read enough; this
        // ends when it stops asking for data.
        while (turns < MAX_TURNS) {
          turns += 1;
          send({ type: "status", state: turns === 1 ? "thinking" : "reading" });

          const events = await client.responses.create({
            model: model.modelId,
            instructions: system,
            input: history,
            reasoning: { effort: model.effort },
            text: { verbosity: "low" },
            ...(tools.length > 0 ? { tools } : {}),
            max_output_tokens: 16_000,
            stream: true,
          });

          let response: OpenAI.Responses.Response | null = null;

          for await (const event of events) {
            if (event.type === "response.output_text.delta") {
              answer += event.delta;
              send({ type: "delta", text: event.delta });
            } else if (event.type === "response.completed") {
              response = event.response;
            } else if (event.type === "response.failed" || event.type === "response.incomplete") {
              response = event.response;
            }
          }

          if (!response) throw new Error("The model stream ended without a response.");

          inputTokens += response.usage?.input_tokens ?? 0;
          outputTokens += response.usage?.output_tokens ?? 0;

          for (const item of response.output ?? []) {
            history.push(item as OpenAI.Responses.ResponseInputItem);
          }

          const calls = (response.output ?? []).filter(
            (item): item is OpenAI.Responses.ResponseFunctionToolCall =>
              item.type === "function_call",
          );
          if (calls.length === 0) break;

          for (const call of calls) {
            const { auditId, args } = routeCall(call.arguments, scope);
            const auditName = scope.find((audit) => audit.id === auditId)?.name ?? null;
            send({ type: "tool", name: call.name, auditName });

            const { result, record } = await executeToolCall(call.name, args, {
              auditId,
              workspaceId,
            });
            toolRecords.push(record);

            history.push({
              type: "function_call_output",
              call_id: call.call_id,
              output: JSON.stringify(result).slice(0, TOOL_OUTPUT_CHARS),
            });
          }
        }

        if (answer.trim().length === 0) {
          throw new Error(
            "The model stopped without answering. This usually means it ran out of turns while reading the evidence — try a narrower question.",
          );
        }

        // The prose is settled; now transcribe the sources, anything worth drawing and where
        // to go next. Low effort on purpose: the reading already happened above.
        send({ type: "status", state: "citing" });

        let citations: MessageCitation[] = [];
        let blocks: MessageBlock[] = [];
        let followups: string[] = [];

        if (scope.length > 0) {
          try {
            const trailer = await generateStructured({
              model: model.modelId,
              effort: "low",
              schema: trailerSchema,
              schemaName: "chat_trailer",
              maxOutputTokens: 24_000,
              system,
              context: { workspaceId, stage: "chat_trailer", conversationId },
              input: [
                ...history,
                {
                  role: "user",
                  content:
                    "Now, without re-answering: list the sources you actually read for that answer, " +
                    "any chart or table that genuinely belongs with it, and at most three follow-up " +
                    "questions this evidence could answer. Cite only real inputIds/documentIds you " +
                    "opened this turn. If you cited nothing, return empty arrays.",
                },
              ],
            });

            citations = trailer.citations.map((citation) => ({
              label: citation.label,
              auditId: citation.auditId ?? undefined,
              inputId: citation.inputId ?? undefined,
              documentId: citation.documentId ?? undefined,
              findingId: citation.findingId ?? undefined,
              locator: {
                sheet: citation.sheet ?? undefined,
                page: citation.page ?? undefined,
                rowFrom: citation.rowFrom ?? undefined,
                rowTo: citation.rowTo ?? undefined,
              },
            }));
            blocks = trailer.blocks.map((block) => ({
              type: block.type,
              title: block.title,
              content: { ...block },
            }));
            followups = trailer.suggestedFollowups.slice(0, 3);
          } catch (error) {
            // A failed trailer costs citations and follow-ups, not the answer. Losing the
            // whole reply because the garnish failed would be the worse trade.
            console.error("[chat] trailer pass failed", error);
          }
        }

        const [assistantMessage] = await db
          .insert(messages)
          .values({
            workspaceId,
            conversationId,
            role: "assistant",
            content: answer,
            blocks,
            citations,
            suggestedFollowups: followups,
            modelId: model.modelId,
            tokens: {
              input: inputTokens,
              output: outputTokens,
              total: inputTokens + outputTokens,
            },
            status: "completed",
          })
          .returning({ id: messages.id });

        await db
          .update(conversations)
          .set({ updatedAt: new Date() })
          .where(eq(conversations.id, conversationId));

        await db
          .insert(modelCalls)
          .values({
            workspaceId,
            conversationId,
            stage: "chat",
            modelId: model.modelId,
            requestSummary: {
              turns,
              attachedAudits: scope.map((audit) => audit.id),
              messageId: userMessage.id,
            },
            responseMeta: { answerChars: answer.length, blocks: blocks.length },
            toolCalls: toolRecords,
            inputTokens,
            outputTokens,
            latencyMs: Date.now() - started,
            status: "completed",
          })
          .catch((error: unknown) => {
            console.error("[chat] failed to log model call", error);
          });

        send({
          type: "done",
          messageId: assistantMessage.id,
          userMessageId: userMessage.id,
          blocks,
          citations,
          followups,
          toolCalls: toolRecords.length,
          context: {
            used: inputTokens + outputTokens,
            window: model.contextWindow,
          },
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("[chat] turn failed", error);

        // The failure is recorded in the transcript, not swallowed: the user must be able to
        // see that their question was asked and did not get answered.
        await db
          .insert(messages)
          .values({
            workspaceId,
            conversationId,
            role: "assistant",
            content: answer,
            modelId: model.modelId,
            status: "failed",
            error: message,
          })
          .catch((dbError: unknown) => {
            console.error("[chat] failed to record the failed turn", dbError);
          });

        await db
          .insert(modelCalls)
          .values({
            workspaceId,
            conversationId,
            stage: "chat",
            modelId: model.modelId,
            toolCalls: toolRecords,
            latencyMs: Date.now() - started,
            status: "failed",
            error: message,
          })
          .catch((dbError: unknown) => {
            console.error("[chat] failed to log the failed call", dbError);
          });

        send({ type: "error", message });
      } finally {
        closed = true;
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Proxies that buffer would defeat the entire point of streaming.
      "X-Accel-Buffering": "no",
    },
  });
}
