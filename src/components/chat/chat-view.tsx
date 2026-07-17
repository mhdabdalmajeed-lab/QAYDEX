"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  RiArrowRightLine,
  RiErrorWarningLine,
  RiFileTextLine,
  RiLightbulbLine,
  RiSearchEyeLine,
  RiSendPlane2Line,
  RiSparkling2Line,
  RiToolsLine,
  RiUserLine,
} from "@remixicon/react";

import { AuditBlockView } from "@/components/blocks";
import { ChatMarkdown } from "@/components/chat/markdown";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import type { MessageAttachment, MessageCitation } from "@/db/schema";
import type { AuditBlock } from "@/lib/ai/blocks/schemas";
import { cn } from "@/lib/utils";

/**
 * The conversation (PRD §10.4).
 *
 * Streaming is why this is a client component: the answer arrives token by token from
 * /api/chat while the model reads the evidence, and a finance professional should be able to
 * watch it work rather than stare at a spinner for forty seconds.
 *
 * Blocks are parsed and validated on the server and handed down already typed — a chart the
 * model generated is rendered by exactly the same renderer as an audit's, so a table in chat
 * and the same table in the report cannot drift apart.
 */

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  blocks: AuditBlock[];
  citations: MessageCitation[];
  attachments: MessageAttachment[];
  suggestedFollowups: string[];
  status: "pending" | "running" | "completed" | "failed";
  error: string | null;
  createdAt: string;
};

export type ChatAudit = { id: string; name: string; hasResults: boolean };

type StreamState =
  | { phase: "idle" }
  | { phase: "sending" }
  | { phase: "thinking" | "reading" | "citing"; text: string; tool: string | null; auditName: string | null }
  | { phase: "error"; message: string };

const STATUS_COPY: Record<"sending" | "thinking" | "reading" | "citing", string> = {
  sending: "Sending",
  thinking: "Thinking",
  reading: "Reading the evidence",
  citing: "Collecting citations",
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(source: Record<string, unknown>, key: string): string | null {
  const value = source[key];
  return typeof value === "string" ? value : null;
}

export function ChatView({
  slug,
  conversationId,
  messages,
  audits,
  canChat,
  /** A question handed over from `chat/new?q=…`; sent once, then dropped from the URL. */
  autoSend,
}: {
  slug: string;
  conversationId: string;
  messages: ChatMessage[];
  audits: ChatAudit[];
  canChat: boolean;
  autoSend?: string;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState("");
  const [stream, setStream] = useState<StreamState>({ phase: "idle" });
  /**
   * The user's turn, shown immediately. It carries the transcript length at the moment it was
   * asked, so it can be *derived* away the instant the server transcript grows past that —
   * no effect, and no window where the optimistic bubble and the real message both show.
   */
  const [pending, setPending] = useState<{ text: string; atCount: number } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const autoSentRef = useRef(false);
  const busy = stream.phase !== "idle" && stream.phase !== "error";
  // Derived, not stored: once the real message lands the count moves on and this falls away.
  const pendingQuestion = pending && messages.length === pending.atCount ? pending.text : null;

  const send = useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed) return;

      setPending({ text: trimmed, atCount: messages.length });
      setStream({ phase: "sending" });
      setDraft("");

      let response: Response;
      try {
        response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ conversationId, message: trimmed }),
        });
      } catch {
        setStream({
          phase: "error",
          message: "Could not reach the server. Your question was not sent — check your connection and try again.",
        });
        return;
      }

      if (!response.ok || !response.body) {
        const detail: unknown = await response.json().catch(() => null);
        const message =
          isRecord(detail) && typeof detail.error === "string"
            ? detail.error
            : `The server refused the request (${response.status}).`;
        setStream({ phase: "error", message });
        return;
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let text = "";
      let failed: string | null = null;

      // Server-sent events: one JSON object per `data:` line, frames split by a blank line.
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";

        for (const frame of frames) {
          const line = frame.split("\n").find((part) => part.startsWith("data: "));
          if (!line) continue;

          let event: unknown;
          try {
            event = JSON.parse(line.slice(6));
          } catch {
            continue;
          }
          if (!isRecord(event)) continue;

          const type = readString(event, "type");
          if (type === "delta") {
            text += readString(event, "text") ?? "";
            setStream((current) => ({
              phase: current.phase === "sending" || current.phase === "error" ? "thinking" : current.phase,
              text,
              tool: current.phase === "thinking" || current.phase === "reading" ? current.tool : null,
              auditName:
                current.phase === "thinking" || current.phase === "reading" ? current.auditName : null,
            }));
          } else if (type === "status") {
            const state = readString(event, "state");
            if (state === "thinking" || state === "reading" || state === "citing") {
              setStream({ phase: state, text, tool: null, auditName: null });
            }
          } else if (type === "tool") {
            setStream({
              phase: "reading",
              text,
              tool: readString(event, "name"),
              auditName: readString(event, "auditName"),
            });
          } else if (type === "error") {
            failed = readString(event, "message") ?? "The model could not answer.";
          }
        }
      }

      if (failed) {
        setStream({ phase: "error", message: failed });
        // The failed turn is in the transcript, so pull it in rather than pretending it
        // never happened.
        router.refresh();
        return;
      }

      setStream({ phase: "idle" });
      router.refresh();
    },
    [conversationId, messages.length, router],
  );

  useEffect(() => {
    if (!autoSend || autoSentRef.current || !canChat) return;
    autoSentRef.current = true;
    // Drop the question from the URL first: a refresh must not re-ask it.
    router.replace(`/w/${slug}/chat/${conversationId}`, { scroll: false });
    void send(autoSend);
  }, [autoSend, canChat, conversationId, router, send, slug]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, stream]);

  const streamingText = stream.phase === "thinking" || stream.phase === "reading" || stream.phase === "citing"
    ? stream.text
    : "";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5 md:px-6">
          {messages.length === 0 && pendingQuestion === null ? (
            <ConversationStart slug={slug} audits={audits} />
          ) : null}

          {messages.map((message) => (
            <MessageRow key={message.id} slug={slug} message={message} onAsk={send} busy={busy} />
          ))}

          {pendingQuestion !== null ? (
            <article className="flex flex-col gap-1.5" aria-label="Your question">
              <Author icon={<RiUserLine aria-hidden="true" />} name="You" />
              <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm whitespace-pre-wrap">
                {pendingQuestion}
              </div>
            </article>
          ) : null}

          {busy || streamingText ? (
            <article className="flex flex-col gap-1.5" aria-label="Assistant answer" aria-live="polite">
              <Author icon={<RiSparkling2Line aria-hidden="true" />} name="Caydex" />
              {streamingText ? <ChatMarkdown content={streamingText} /> : null}
              {busy ? <StatusLine stream={stream} /> : null}
            </article>
          ) : null}

          {stream.phase === "error" ? (
            <Alert variant="destructive">
              <RiErrorWarningLine aria-hidden="true" />
              <AlertTitle>That question did not get answered</AlertTitle>
              <AlertDescription>
                <p>{stream.message}</p>
                <p className="text-xs">
                  Nothing was changed in the audit. Your question is still in the transcript —
                  you can rephrase it and ask again.
                </p>
              </AlertDescription>
            </Alert>
          ) : null}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto w-full max-w-3xl px-4 py-3 md:px-6">
          {canChat ? (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (!busy) void send(draft);
              }}
            >
              <label htmlFor="chat-composer" className="sr-only">
                Ask a question about {audits.length > 0 ? "the attached audits" : "this conversation"}
              </label>
              <div className="flex items-end gap-2">
                <Textarea
                  id="chat-composer"
                  ref={composerRef}
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    // Enter sends; Shift+Enter is a newline. Long questions are normal here.
                    if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                      event.preventDefault();
                      if (!busy) void send(draft);
                    }
                  }}
                  rows={2}
                  maxLength={20_000}
                  disabled={busy}
                  placeholder={
                    audits.length > 0
                      ? "Ask about a finding, a number, or the evidence behind it…"
                      : "Attach an audit to ask about your data — or ask about method and standards…"
                  }
                  className="max-h-48 min-h-16 flex-1 resize-y"
                />
                <Button type="submit" size="icon" disabled={busy || draft.trim().length === 0}>
                  {busy ? <Spinner aria-hidden="true" /> : <RiSendPlane2Line aria-hidden="true" />}
                  <span className="sr-only">Send</span>
                </Button>
              </div>
              <p className="mt-1.5 text-xs text-muted-foreground">
                {audits.length === 0
                  ? "No audit attached: the model has no evidence and cannot cite figures from your data."
                  : "Answers are computed from the attached audits' evidence. Enter to send, Shift+Enter for a new line."}
              </p>
            </form>
          ) : (
            <p className="py-2 text-sm text-muted-foreground">
              Your role cannot use chat. You can read this conversation but not add to it.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function Author({ icon, name }: { icon: React.ReactNode; name: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
      <span className="[&>svg]:size-3.5">{icon}</span>
      {name}
    </div>
  );
}

function StatusLine({ stream }: { stream: StreamState }) {
  if (stream.phase === "idle" || stream.phase === "error") return null;
  const label = STATUS_COPY[stream.phase];
  const detail =
    stream.phase !== "sending" && stream.tool
      ? `${stream.tool.replace(/_/g, " ")}${stream.auditName ? ` · ${stream.auditName}` : ""}`
      : null;

  return (
    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <Spinner aria-hidden="true" className="size-3" />
      <span>{label}</span>
      {detail ? (
        <>
          <RiToolsLine aria-hidden="true" className="size-3" />
          <span className="font-mono">{detail}</span>
        </>
      ) : null}
    </p>
  );
}

function MessageRow({
  slug,
  message,
  onAsk,
  busy,
}: {
  slug: string;
  message: ChatMessage;
  onAsk: (question: string) => void;
  busy: boolean;
}) {
  if (message.role === "user") {
    return (
      <article className="flex flex-col gap-1.5">
        <Author icon={<RiUserLine aria-hidden="true" />} name="You" />
        {message.attachments.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {message.attachments.map((attachment, index) => (
              <li key={`${attachment.kind}-${attachment.refId ?? index}`}>
                <Badge variant="outline" className="font-normal">
                  {attachment.kind === "finding" ? (
                    <RiErrorWarningLine aria-hidden="true" />
                  ) : (
                    <RiFileTextLine aria-hidden="true" />
                  )}
                  {attachment.kind === "text" ? "Written context: " : ""}
                  {attachment.name}
                </Badge>
              </li>
            ))}
          </ul>
        ) : null}
        <div className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm whitespace-pre-wrap">
          {message.content}
        </div>
      </article>
    );
  }

  if (message.role !== "assistant") return null;

  return (
    <article className="flex flex-col gap-2">
      <Author icon={<RiSparkling2Line aria-hidden="true" />} name="Caydex" />

      {message.content ? <ChatMarkdown content={message.content} /> : null}

      {message.status === "failed" ? (
        <Alert variant="destructive">
          <RiErrorWarningLine aria-hidden="true" />
          <AlertTitle>This answer failed</AlertTitle>
          <AlertDescription>
            {message.error ?? "The model stopped before it could answer."}
          </AlertDescription>
        </Alert>
      ) : null}

      {message.blocks.length > 0 ? (
        <div className="flex flex-col gap-3">
          {message.blocks.map((block, index) => (
            <AuditBlockView key={`${block.type}-${index}`} block={block} />
          ))}
        </div>
      ) : null}

      {message.citations.length > 0 ? (
        <section aria-label="Sources" className="rounded-md border border-border bg-muted/30 p-2.5">
          <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <RiSearchEyeLine aria-hidden="true" className="size-3.5" />
            Sources read for this answer
          </h3>
          <ul className="flex flex-col gap-1">
            {message.citations.map((citation, index) => (
              <li key={index} className="text-xs text-muted-foreground">
                {citation.auditId ? (
                  <Link
                    href={
                      citation.findingId
                        ? `/w/${slug}/audits/${citation.auditId}#finding-${citation.findingId}`
                        : `/w/${slug}/audits/${citation.auditId}`
                    }
                    className="underline underline-offset-2 hover:text-foreground"
                  >
                    {citation.label}
                  </Link>
                ) : (
                  <span>{citation.label}</span>
                )}
                <span className="font-mono"> · {describeCitation(citation)}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {message.suggestedFollowups.length > 0 ? (
        <section aria-label="Suggested follow-up questions" className="flex flex-col gap-1.5">
          <h3 className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <RiLightbulbLine aria-hidden="true" className="size-3.5" />
            Where this could go next
          </h3>
          <ul className="flex flex-col gap-1">
            {message.suggestedFollowups.map((followup) => (
              <li key={followup}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => onAsk(followup)}
                  className={cn(
                    "flex w-full items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-left text-xs transition-colors",
                    "hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                    "disabled:pointer-events-none disabled:opacity-50",
                  )}
                >
                  <RiArrowRightLine aria-hidden="true" className="size-3 shrink-0" />
                  {followup}
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </article>
  );
}

function describeCitation(citation: MessageCitation): string {
  const parts: string[] = [];
  const locator = citation.locator;
  if (locator?.sheet) parts.push(`sheet ${locator.sheet}`);
  if (locator?.page !== undefined) parts.push(`page ${locator.page}`);
  if (locator?.rowFrom !== undefined) {
    parts.push(
      locator.rowTo !== undefined && locator.rowTo !== locator.rowFrom
        ? `rows ${locator.rowFrom}–${locator.rowTo}`
        : `row ${locator.rowFrom}`,
    );
  }
  if (parts.length === 0 && citation.documentId) parts.push("whole document");
  return parts.join(" · ") || "referenced";
}

function ConversationStart({ slug, audits }: { slug: string; audits: ChatAudit[] }) {
  const withoutResults = audits.filter((audit) => !audit.hasResults);

  return (
    <div className="rounded-lg border border-dashed border-border p-5">
      <h2 className="font-heading text-sm font-semibold">
        {audits.length === 0 ? "Nothing is attached yet" : "Ready when you are"}
      </h2>

      {audits.length === 0 ? (
        <>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Attach an audit and the model can read its instructions, inputs, findings and
            evidence, and compute answers from them. Without one it has no data to look at —
            it can discuss method, but it will not invent a number about your business.
          </p>
          <Button variant="outline" size="sm" className="mt-3" render={<Link href={`/w/${slug}/audits`} />}>
            <RiSearchEyeLine aria-hidden="true" />
            Browse audits
          </Button>
        </>
      ) : (
        <p className="mt-1.5 text-sm text-muted-foreground">
          {audits.length === 1
            ? `This conversation is grounded in ${audits[0].name}. Ask about a finding, the evidence behind a number, or challenge a conclusion.`
            : `This conversation is grounded in ${audits.length} audits. Every answer will say which one it came from.`}
        </p>
      )}

      {withoutResults.length > 0 ? (
        <Alert className="mt-3">
          <RiErrorWarningLine aria-hidden="true" />
          <AlertTitle>
            {withoutResults.length === 1
              ? `${withoutResults[0].name} has not been run yet`
              : `${withoutResults.length} attached audits have not been run yet`}
          </AlertTitle>
          <AlertDescription>
            The model can read whatever inputs are attached, but there are no findings, blocks
            or evidence references to discuss until the audit produces a revision.
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  );
}
