import type { Stage } from "@/lib/ai/engine";

/**
 * The wire shape of `GET /api/audits/[id]/progress`.
 *
 * It lives here rather than in the route so the polling Client Component and the handler share
 * one definition without the client module graph ever reaching for a server route.
 */

export type ProgressStageStatus = "pending" | "running" | "completed" | "failed" | "skipped";

export type ProgressStage = {
  stage: Stage;
  label: string;
  status: ProgressStageStatus;
  progress: number;
  detail: string | null;
  error: string | null;
  attempt: number;
  startedAt: string | null;
  finishedAt: string | null;
};

export type ProgressPayload = {
  auditStatus: string;
  job: {
    id: string;
    status: "queued" | "running" | "completed" | "failed" | "cancelled";
    currentStage: Stage | null;
    attempt: number;
    error: string | null;
    startedAt: string | null;
    finishedAt: string | null;
    heartbeatAt: string | null;
  } | null;
  stages: ProgressStage[];
  /** 0-100 across all nine stages, so no caller has to reimplement the maths. */
  overallPercent: number;
  /** True once the client can stop polling and ask the server for the published result. */
  settled: boolean;
};
