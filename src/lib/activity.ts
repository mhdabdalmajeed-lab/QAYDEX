import "server-only";

import { headers } from "next/headers";

import { db } from "@/db";
import { activityLog } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

/**
 * The audit trail (PRD §25.3).
 *
 * Administrators must be able to reconstruct who did what — including which model and prompt
 * version produced a result. Logging is best-effort by design: a failed log line must never
 * roll back the action it was describing, but it is loud in the server log when it happens.
 *
 * The actor is resolved through the Supabase client directly rather than through
 * `@/lib/auth/guards`, which would drag `next/navigation` (and with it the React client
 * runtime) into every background job that logs something. Logging is not an authorisation
 * decision, so it has no business importing the authorisation layer.
 */
export type ActivityInput = {
  workspaceId: string;
  action: string;
  targetType?: string;
  targetId?: string | null;
  auditId?: string | null;
  metadata?: Record<string, unknown>;
  /** Pass explicitly from background jobs, where there is no request to read a user from. */
  actorId?: string | null;
  actorEmail?: string | null;
};

export async function logActivity(input: ActivityInput): Promise<void> {
  try {
    let actorId = input.actorId ?? null;
    let actorEmail = input.actorEmail ?? null;

    if (!actorId) {
      // No request context in a background job — the caller passes actorId there instead.
      const user = await createClient()
        .then((supabase) => supabase.auth.getUser())
        .then(({ data }) => data.user)
        .catch(() => null);
      actorId = user?.id ?? null;
      actorEmail = user?.email ?? null;
    }

    let ip: string | null = null;
    let userAgent: string | null = null;
    try {
      const h = await headers();
      ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null;
      userAgent = h.get("user-agent");
    } catch {
      // No request context (background job) — the action still gets logged, just without
      // request metadata.
    }

    await db.insert(activityLog).values({
      workspaceId: input.workspaceId,
      actorId,
      actorEmail,
      action: input.action,
      targetType: input.targetType ?? null,
      targetId: input.targetId ?? null,
      auditId: input.auditId ?? null,
      metadata: input.metadata ?? {},
      ip,
      userAgent,
    });
  } catch (error) {
    console.error("[activity] failed to log", input.action, error);
  }
}
