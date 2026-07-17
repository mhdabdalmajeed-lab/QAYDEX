"use client";

import {
  RiCheckLine,
  RiCloseCircleLine,
  RiErrorWarningLine,
  RiLoader4Line,
  RiRefreshLine,
  RiSubtractLine,
  RiTimeLine,
} from "@remixicon/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { retryAudit } from "@/server/actions/audit";
import type { ProgressPayload, ProgressStage } from "@/lib/audit/progress";
import { cn } from "@/lib/utils";

/**
 * Live run progress (PRD §22, §26.1).
 *
 * A run takes minutes, so silence is not an option: the nine stages are named and the current
 * one reports what it is doing. This polls a Route Handler rather than holding a stream open —
 * a dropped connection must never look like a dropped audit, and job state lives in the
 * database precisely so the page can be closed and reopened.
 */

const POLL_MS = 2500;

export function ProcessingPanel({
  auditId,
  initial,
  canRetry,
}: {
  auditId: string;
  initial: ProgressPayload;
  canRetry: boolean;
}) {
  const [data, setData] = useState<ProgressPayload>(initial);
  const [pollError, setPollError] = useState<string | null>(null);
  const router = useRouter();
  const settledRef = useRef(initial.settled);

  useEffect(() => {
    if (settledRef.current) return;
    let cancelled = false;

    const timer = window.setInterval(async () => {
      try {
        const response = await fetch(`/api/audits/${auditId}/progress`, { cache: "no-store" });
        if (!response.ok) throw new Error(`Progress request failed (${response.status})`);
        const next: ProgressPayload = await response.json();
        if (cancelled) return;
        setData(next);
        setPollError(null);
        if (next.settled) {
          settledRef.current = true;
          window.clearInterval(timer);
          // The run is over: pull the published blocks and findings from the server rather
          // than trying to assemble them here.
          router.refresh();
        }
      } catch (error) {
        if (cancelled) return;
        // Keep polling: a transient network failure is not a failed audit, and saying so
        // would be a lie about the run.
        setPollError(error instanceof Error ? error.message : "Could not reach the server.");
      }
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [auditId, router]);

  const failedStage = data.stages.find((s) => s.status === "failed");
  const lastCompleted = [...data.stages].reverse().find((s) => s.status === "completed");
  const active = data.stages.find((s) => s.status === "running");

  return (
    <section
      aria-labelledby="processing-heading"
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="processing-heading" className="text-base font-semibold">
            {failedStage
              ? "This run stopped"
              : data.job?.status === "queued"
                ? "Queued"
                : "Running the audit"}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground" aria-live="polite">
            {failedStage
              ? `It failed during “${failedStage.label}”.`
              : active
                ? (active.detail ?? `${active.label}…`)
                : data.job?.status === "queued"
                  ? "Waiting for a worker to pick this up."
                  : "Working through the nine stages."}
          </p>
        </div>
        {failedStage && canRetry && data.job ? (
          <RetryButton auditId={auditId} jobId={data.job.id} />
        ) : null}
      </div>

      <div className="mt-4">
        <Progress value={failedStage ? data.overallPercent : (data.overallPercent || null)}>
          <span className="sr-only">Audit progress</span>
        </Progress>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {data.overallPercent}% · stage{" "}
          {Math.min(
            data.stages.filter((s) => s.status !== "pending").length || 1,
            data.stages.length,
          )}{" "}
          of {data.stages.length}
        </p>
      </div>

      <ol className="mt-4 space-y-0.5">
        {data.stages.map((stage) => (
          <StageRow key={stage.stage} stage={stage} />
        ))}
      </ol>

      {failedStage ? (
        <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
          <p className="flex items-center gap-1.5 text-sm font-medium text-destructive">
            <RiErrorWarningLine className="size-4 shrink-0" aria-hidden />
            {failedStage.label} failed
          </p>
          {failedStage.error ? (
            <p className="mt-1 font-mono text-xs text-destructive/90">{failedStage.error}</p>
          ) : null}
          <p className="mt-2 text-xs text-muted-foreground">
            {lastCompleted
              ? `Retrying resumes from “${lastCompleted.label}” — the stages that already finished are not run again, and nothing is charged for them twice.`
              : "Retrying starts the run from the first stage; nothing had completed yet."}
          </p>
        </div>
      ) : null}

      {data.job?.error && !failedStage ? (
        <p className="mt-3 font-mono text-xs text-destructive">{data.job.error}</p>
      ) : null}

      {pollError ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Live updates paused — {pollError} The run itself is unaffected; it is tracked on the
          server and this page will catch up.
        </p>
      ) : null}
    </section>
  );
}

const STAGE_ICON = {
  pending: RiTimeLine,
  running: RiLoader4Line,
  completed: RiCheckLine,
  failed: RiCloseCircleLine,
  skipped: RiSubtractLine,
} as const;

const STAGE_WORD = {
  pending: "Not started",
  running: "In progress",
  completed: "Done",
  failed: "Failed",
  skipped: "Skipped",
} as const;

function StageRow({ stage }: { stage: ProgressStage }) {
  const Icon = STAGE_ICON[stage.status];
  return (
    <li className="flex items-start gap-2.5 rounded-md px-1 py-1.5">
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 size-4 shrink-0",
          stage.status === "pending" && "text-muted-foreground/60",
          stage.status === "running" && "animate-spin text-sky-600 dark:text-sky-400",
          stage.status === "completed" && "text-emerald-600 dark:text-emerald-400",
          stage.status === "failed" && "text-destructive",
          stage.status === "skipped" && "text-muted-foreground/60",
        )}
      />
      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm",
            stage.status === "pending" && "text-muted-foreground",
            stage.status === "running" && "font-medium",
            stage.status === "failed" && "font-medium text-destructive",
          )}
        >
          {stage.label}
          {/* Never state a stage by colour alone. */}
          <span className="sr-only"> — {STAGE_WORD[stage.status]}</span>
          {stage.attempt > 1 ? (
            <span className="ml-1.5 text-xs font-normal text-muted-foreground">
              attempt {stage.attempt}
            </span>
          ) : null}
        </p>
        {stage.detail && stage.status !== "pending" ? (
          <p className="truncate text-xs text-muted-foreground">{stage.detail}</p>
        ) : null}
      </div>
      <span
        className={cn(
          "shrink-0 text-xs",
          stage.status === "failed" ? "text-destructive" : "text-muted-foreground",
        )}
        aria-hidden
      >
        {STAGE_WORD[stage.status]}
      </span>
    </li>
  );
}

function RetryButton({ auditId, jobId }: { auditId: string; jobId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      action={(formData: FormData) => {
        startTransition(async () => {
          await retryAudit(formData);
        });
      }}
    >
      <input type="hidden" name="auditId" value={auditId} />
      <input type="hidden" name="jobId" value={jobId} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? (
          <RiLoader4Line className="size-4 animate-spin" />
        ) : (
          <RiRefreshLine className="size-4" />
        )}
        Retry from the last completed stage
      </Button>
    </form>
  );
}
