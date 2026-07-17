import { and, asc, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/db";
import { auditJobStages, auditJobs, audits } from "@/db/schema";
import { buildProgressPayload } from "@/lib/audit/progress-server";
import { AccessDenied, requirePermissionApi } from "@/lib/auth/guards";

/**
 * Live per-stage progress for the audit detail page (PRD §22, §26.1).
 *
 * A Route Handler rather than a Server Function because the page polls it: Server Functions are
 * POST-only and serialised one at a time by the client runtime, which is the wrong shape for a
 * heartbeat.
 *
 * It authenticates itself. `proxy.ts` refreshes the Supabase token but is never the
 * authorisation boundary — this route is reachable directly, and drizzle bypasses RLS, so the
 * `workspaceId` predicate below plus `requirePermission` are the only things keeping one
 * tenant's job state away from another.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_request: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  if (!UUID.test(id)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const [audit] = await db
    .select({ id: audits.id, workspaceId: audits.workspaceId, status: audits.status })
    .from(audits)
    .where(eq(audits.id, id))
    .limit(1);
  if (!audit) return NextResponse.json({ error: "Not found." }, { status: 404 });

  try {
    await requirePermissionApi(audit.workspaceId, "audits.view");
  } catch (error) {
    if (error instanceof AccessDenied) {
      // Same answer as a missing audit: whether this id exists is not owed to a non-member.
      return NextResponse.json({ error: "Not found." }, { status: 404 });
    }
    throw error;
  }

  const [job] = await db
    .select()
    .from(auditJobs)
    .where(and(eq(auditJobs.workspaceId, audit.workspaceId), eq(auditJobs.auditId, audit.id)))
    .orderBy(desc(auditJobs.createdAt))
    .limit(1);

  const rows = job
    ? await db
        .select()
        .from(auditJobStages)
        .where(
          and(
            eq(auditJobStages.workspaceId, audit.workspaceId),
            eq(auditJobStages.jobId, job.id),
          ),
        )
        .orderBy(asc(auditJobStages.createdAt))
    : [];

  return NextResponse.json(buildProgressPayload(audit.status, job ?? null, rows), {
    headers: { "Cache-Control": "no-store" },
  });
}
