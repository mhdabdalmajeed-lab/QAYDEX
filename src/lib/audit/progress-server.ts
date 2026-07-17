import "server-only";

import type { auditJobStages, auditJobs } from "@/db/schema";
import { STAGES, STAGE_LABELS } from "@/lib/ai/engine";
import type { ProgressPayload, ProgressStage } from "@/lib/audit/progress";

/**
 * Builds the progress payload from job rows.
 *
 * Shared by the polling Route Handler and the audit page's first server render, so the
 * initial paint and the first poll response cannot disagree — a mismatch there shows up as
 * the progress bar visibly jumping the moment polling starts.
 *
 * Kept out of `progress.ts` because that module is imported by a Client Component and must
 * not pull the drizzle schema into the browser bundle.
 */
export function buildProgressPayload(
  auditStatus: string,
  job: typeof auditJobs.$inferSelect | null,
  rows: (typeof auditJobStages.$inferSelect)[],
): ProgressPayload {
  // All nine stages always render, whether or not a row exists yet: a stage that has not
  // started is information, and a gap in the list would read as an error.
  const stages: ProgressStage[] = STAGES.map((stage) => {
    const row = rows.find((r) => r.stage === stage);
    return {
      stage,
      label: STAGE_LABELS[stage],
      status: row?.status ?? "pending",
      progress: row?.progress ?? 0,
      detail: row?.detail ?? null,
      error: row?.error ?? null,
      attempt: row?.attempt ?? 0,
      startedAt: row?.startedAt?.toISOString() ?? null,
      finishedAt: row?.finishedAt?.toISOString() ?? null,
    };
  });

  const done = stages.filter((s) => s.status === "completed" || s.status === "skipped").length;
  const running = stages.find((s) => s.status === "running");
  const overallPercent = Math.round(
    ((done + (running ? running.progress / 100 : 0)) / STAGES.length) * 100,
  );

  return {
    auditStatus,
    job: job
      ? {
          id: job.id,
          status: job.status,
          currentStage: job.currentStage,
          attempt: job.attempt,
          error: job.error,
          startedAt: job.startedAt?.toISOString() ?? null,
          finishedAt: job.finishedAt?.toISOString() ?? null,
          heartbeatAt: job.heartbeatAt?.toISOString() ?? null,
        }
      : null,
    stages,
    overallPercent,
    settled:
      !job || job.status === "completed" || job.status === "failed" || job.status === "cancelled",
  };
}
