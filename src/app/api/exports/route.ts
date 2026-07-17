import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { db } from "@/db";
import { audits, exports } from "@/db/schema";
import { logActivity } from "@/lib/activity";
import { AccessDenied, Unauthenticated, requirePermissionApi } from "@/lib/auth/guards";
import { ExportDataError, loadExportPayload } from "@/lib/export/data";
import { renderAuditCsv } from "@/lib/export/csv";
import { renderAuditDocx } from "@/lib/export/docx";
import { renderAuditHtml } from "@/lib/export/html";
import { renderAuditPdf } from "@/lib/export/pdf";
import { EXPORT_FORMATS, EXPORT_KINDS, exportFileName, formatIsAllowed } from "@/lib/export/types";
import { renderAuditXlsx } from "@/lib/export/xlsx";
import { createClient } from "@/lib/supabase/server";
import { eq } from "drizzle-orm";

/**
 * Export generation (PRD §24).
 *
 * A Route Handler because a PDF is megabytes of binary: a Server Function would have to
 * serialise it through the RSC payload. It authenticates itself — Proxy is never the
 * authorisation boundary, and drizzle bypasses RLS.
 *
 * The file lands in the private `evidence` bucket and comes back as a short-lived signed URL
 * rather than raw bytes, so an export is durable, re-downloadable and — because every export is
 * recorded — auditable (PRD §25.3).
 */

export const runtime = "nodejs";
export const maxDuration = 300;

const bodySchema = z.object({
  auditId: z.string().uuid(),
  revisionId: z.string().uuid(),
  kind: z.enum(EXPORT_KINDS),
  format: z.enum(EXPORT_FORMATS),
  options: z
    .object({
      includeEvidence: z.boolean(),
      includeCharts: z.boolean(),
      includeInternalNotes: z.boolean(),
      includeActivity: z.boolean(),
      includeInstructions: z.boolean(),
      includeInputList: z.boolean(),
      blockIds: z.array(z.string().uuid()).nullable(),
    })
    .partial()
    .optional(),
});

const MIME: Record<string, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv; charset=utf-8",
  html: "text/html; charset=utf-8",
};

export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Expected a JSON body." }, { status: 400 });
  }

  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid request." }, { status: 400 });
  }
  const { auditId, revisionId, kind, format, options } = parsed.data;

  if (!formatIsAllowed(kind, format)) {
    return NextResponse.json(
      { error: `${format.toUpperCase()} is not a sensible format for this report.` },
      { status: 400 },
    );
  }

  const [audit] = await db.select().from(audits).where(eq(audits.id, auditId)).limit(1);
  if (!audit) return NextResponse.json({ error: "Not found." }, { status: 404 });

  let userId: string;
  try {
    const { user } = await requirePermissionApi(audit.workspaceId, "audits.export");
    userId = user.id;
  } catch (error) {
    if (error instanceof Unauthenticated) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof AccessDenied) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    throw error;
  }

  // Recorded before the work starts, so a crashed export leaves a trace rather than vanishing.
  const [row] = await db
    .insert(exports)
    .values({
      workspaceId: audit.workspaceId,
      auditId,
      revisionId,
      kind,
      format,
      status: "running",
      options: options ?? {},
      createdBy: userId,
    })
    .returning({ id: exports.id });

  try {
    const payload = await loadExportPayload({
      workspaceId: audit.workspaceId,
      auditId,
      revisionId,
      kind,
      options,
    });

    let bytes: Buffer;
    switch (format) {
      case "pdf":
        bytes = await renderAuditPdf(payload);
        break;
      case "docx":
        bytes = await renderAuditDocx(payload);
        break;
      case "xlsx":
        bytes = renderAuditXlsx(payload);
        break;
      case "csv":
        bytes = renderAuditCsv(payload);
        break;
      case "html":
        bytes = renderAuditHtml(payload);
        break;
      default:
        throw new Error(`Unsupported format: ${format}`);
    }

    const fileName = exportFileName(payload, format);
    const path = `${audit.workspaceId}/exports/${auditId}/${row.id}-${fileName}`;

    const supabase = await createClient();
    const { error: uploadError } = await supabase.storage
      .from("evidence")
      .upload(path, bytes, { contentType: MIME[format], upsert: true });
    if (uploadError) throw new Error(`Could not store the export: ${uploadError.message}`);

    const { data: signed, error: signError } = await supabase.storage
      .from("evidence")
      .createSignedUrl(path, 60 * 10, { download: fileName });
    if (signError || !signed) throw new Error(`Could not create a download link: ${signError?.message}`);

    await db
      .update(exports)
      .set({ status: "completed", filePath: path, fileSize: bytes.byteLength })
      .where(eq(exports.id, row.id));

    await logActivity({
      workspaceId: audit.workspaceId,
      action: "audit.exported",
      targetType: "audit",
      targetId: auditId,
      auditId,
      actorId: userId,
      metadata: { kind, format, revisionId, bytes: bytes.byteLength },
    });

    return NextResponse.json({
      id: row.id,
      url: signed.signedUrl,
      fileName,
      bytes: bytes.byteLength,
    });
  } catch (error) {
    const message =
      error instanceof ExportDataError || error instanceof Error ? error.message : "Export failed.";
    await db.update(exports).set({ status: "failed", error: message }).where(eq(exports.id, row.id));
    console.error("[exports] failed", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
