"use client";

import {
  RiArrowRightLine,
  RiChat3Line,
  RiCloseLine,
  RiHistoryLine,
  RiSendPlaneLine,
  RiSparklingLine,
} from "@remixicon/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { formatDateTime } from "@/components/audit/meta";
import { cn } from "@/lib/utils";

/**
 * The floating chat inbox (PRD §19.3).
 *
 * It never answers here. Submitting hands off to the AI Chat page with this audit attached as
 * context — one conversation surface, not two half-implementations of the same thing. The
 * question travels in the URL so the chat page can start work on arrival.
 */

export type FloatingChatProps = {
  slug: string;
  auditId: string;
  auditName: string;
  conversations: { id: string; title: string; updatedAt: string }[];
  suggestions: string[];
};

export function FloatingChat(props: FloatingChatProps) {
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const router = useRouter();

  function go(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    router.push(
      `/w/${props.slug}/chat/new?audit=${props.auditId}&q=${encodeURIComponent(trimmed)}`,
    );
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex justify-center px-4 pb-4">
      <div className="pointer-events-auto w-full max-w-2xl">
        {open ? (
          <div className="mb-2 rounded-xl border border-border bg-popover p-3 shadow-lg">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-medium">Recent conversations about this audit</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setOpen(false)}
                aria-label="Close conversation list"
              >
                <RiCloseLine className="size-4" />
              </Button>
            </div>

            {props.conversations.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No one has asked anything about “{props.auditName}” yet.
              </p>
            ) : (
              <ul className="mt-2 space-y-1">
                {props.conversations.map((conversation) => (
                  <li key={conversation.id}>
                    <Link
                      href={`/w/${props.slug}/chat/${conversation.id}`}
                      className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      <RiChat3Line className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="min-w-0 flex-1 truncate">{conversation.title}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatDateTime(conversation.updatedAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}

            {props.suggestions.length > 0 ? (
              <>
                <h3 className="mt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Suggested
                </h3>
                <ul className="mt-1.5 flex flex-wrap gap-1.5">
                  {props.suggestions.map((suggestion) => (
                    <li key={suggestion}>
                      <button
                        type="button"
                        onClick={() => go(suggestion)}
                        className="rounded-full border border-border px-2.5 py-1 text-xs hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                      >
                        {suggestion}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            ) : null}

            <Button
              variant="outline"
              size="sm"
              className="mt-3 w-full"
              render={<Link href={`/w/${props.slug}/chat/new?audit=${props.auditId}`} />}
            >
              <RiSparklingLine className="size-4" />
              Start a new audit-grounded chat
            </Button>
          </div>
        ) : null}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            go(question);
          }}
          className={cn(
            "flex items-end gap-2 rounded-xl border border-border bg-popover/95 p-2 shadow-lg backdrop-blur",
            "supports-[backdrop-filter]:bg-popover/80",
          )}
        >
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            aria-label={
              open ? "Hide recent conversations" : `Recent conversations (${props.conversations.length})`
            }
          >
            <RiHistoryLine className="size-4" />
          </Button>

          <label htmlFor="audit-chat-input" className="sr-only">
            Ask a question about {props.auditName}
          </label>
          <Textarea
            id="audit-chat-input"
            rows={1}
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            onKeyDown={(event) => {
              // Enter sends, Shift+Enter writes a new line — the convention every chat uses.
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                go(question);
              }
            }}
            placeholder={`Ask about “${props.auditName}”…`}
            className="max-h-32 min-h-9 flex-1 resize-none border-0 bg-transparent px-1 py-1.5 text-sm shadow-none focus-visible:ring-0"
          />

          <Button type="submit" size="sm" disabled={!question.trim()}>
            <RiSendPlaneLine className="size-4" />
            Ask
            <RiArrowRightLine className="size-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
