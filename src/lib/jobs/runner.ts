import "server-only";

import { and, eq, lt, or } from "drizzle-orm";

import { db } from "@/db";
import { auditJobStages, auditJobs, auditRevisions, audits } from "@/db/schema";
import { runAuditJob } from "@/lib/ai/engine";

/**
 * Job execution.
 *
 * An audit takes minutes and many model calls, so it cannot run inside the request that
 * asked for it (PRD §26.1: durable background jobs with per-stage progress). The work is
 * started with `after()` from the server action, which lets the response return immediately
 * while the pipeline continues in the same Node process; the UI then polls stage progress.
 *
 * The durable part is the database, not the process: every stage transition is committed, so
 * if the process dies mid-run the job is resumable — `reclaimStaleJobs` finds runs whose
 * heartbeat stopped and marks them failed-but-retryable, and `runAuditJob` skips whatever
 * already completed. That is what makes a retry cost only the stages that actually failed.
 *
 * On a serverless deployment this is where a real queue (a worker consuming `audit_jobs`)
 * would replace `after()`; nothing else in the pipeline would change, because the queue is
 * already a table.
 */

/** Fire-and-forget: failures are recorded on the job row, never thrown at the caller. */
export function startJob(jobId: string): void {
  void runAuditJob(jobId).catch((error) => {
    console.error(`[jobs] audit job ${jobId} failed:`, error);
  });
}

const STALE_AFTER_MS = 15 * 60 * 1000;

/**
 * A job whose worker vanished would otherwise sit at "running" forever and block a retry,
 * so a stalled run is surfaced as failed rather than left to look busy.
 */
export async function reclaimStaleJobs(workspaceId: string): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_AFTER_MS);

  const stale = await db
    .select()
    .from(auditJobs)
    .where(
      and(
        eq(auditJobs.workspaceId, workspaceId),
        eq(auditJobs.status, "running"),
        or(lt(auditJobs.heartbeatAt, cutoff), lt(auditJobs.startedAt, cutoff)),
      ),
    );

  for (const job of stale) {
    const message =
      "Processing stopped unexpectedly and the run was reclaimed. Retry to continue from the " +
      "last completed stage.";

    await db
      .update(auditJobs)
      .set({ status: "failed", error: message, finishedAt: new Date() })
      .where(eq(auditJobs.id, job.id));

    await db
      .update(auditJobStages)
      .set({ status: "failed", error: message, finishedAt: new Date() })
      .where(and(eq(auditJobStages.jobId, job.id), eq(auditJobStages.status, "running")));

    await db
      .update(auditRevisions)
      .set({ status: "failed", reason: message })
      .where(eq(auditRevisions.id, job.revisionId));

    await db.update(audits).set({ status: "failed" }).where(eq(audits.id, job.auditId));
  }

  return stale.length;
}

export async function getJobProgress(auditId: string) {
  const [job] = await db
    .select()
    .from(auditJobs)
    .where(eq(auditJobs.auditId, auditId))
    .orderBy(auditJobs.createdAt);

  const jobs = await db.select().from(auditJobs).where(eq(auditJobs.auditId, auditId));
  const latest = jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? job;
  if (!latest) return null;

  const stages = await db
    .select()
    .from(auditJobStages)
    .where(eq(auditJobStages.jobId, latest.id));

  return { job: latest, stages };
}
