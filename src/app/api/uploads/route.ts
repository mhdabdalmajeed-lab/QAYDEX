import { createHash } from "node:crypto";

import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { db } from "@/db";
import { auditInputs, audits, inputDocuments } from "@/db/schema";
import { logActivity } from "@/lib/activity";
import { requirePermissionApi } from "@/lib/auth/guards";
import { detectMetadata } from "@/lib/parsing/detect-metadata";
import { parseInput } from "@/lib/parsing";
import { createClient } from "@/lib/supabase/server";

/**
 * Evidence upload.
 *
 * A Route Handler rather than a Server Action for two measured reasons:
 *  - Server Actions cap request bodies at 1MB by default, and accounting exports are far
 *    bigger than that;
 *  - `proxy.ts` buffers and **silently truncates** bodies over 10MB, so this path is excluded
 *    from its matcher (see the comment there). Because Proxy is skipped, this route must
 *    authenticate itself — which it would have to do anyway, since Proxy is never the
 *    authorisation boundary.
 *
 * The PRD is explicit that a user may upload *any* file and that unreadable ones are stored
 * and flagged rather than rejected (§8.5). So a parse failure here is a recorded warning on a
 * stored input, never a dropped file (§26.3).
 */

export const runtime = "nodejs";
export const maxDuration = 300;

const MAX_BYTES = 100 * 1024 * 1024; // Matches the bucket's file_size_limit.

export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Could not read the upload." }, { status: 400 });
  }

  const auditId = String(form.get("auditId") ?? "");
  const files = form.getAll("files").filter((f): f is File => f instanceof File);

  if (!auditId) return NextResponse.json({ error: "auditId is required." }, { status: 400 });
  if (files.length === 0) return NextResponse.json({ error: "No files were sent." }, { status: 400 });

  const [audit] = await db.select().from(audits).where(eq(audits.id, auditId)).limit(1);
  if (!audit) return NextResponse.json({ error: "Audit not found." }, { status: 404 });

  try {
    await requirePermissionApi(audit.workspaceId, "audits.edit");
  } catch {
    return NextResponse.json({ error: "You cannot add evidence to this audit." }, { status: 403 });
  }

  const supabase = await createClient();
  const results: { name: string; status: string; inputId?: string; warning?: string }[] = [];

  for (const file of files) {
    if (file.size > MAX_BYTES) {
      results.push({
        name: file.name,
        status: "rejected",
        warning: `File is ${(file.size / 1024 / 1024).toFixed(1)}MB; the limit is 100MB.`,
      });
      continue;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const checksum = createHash("sha256").update(buffer).digest("hex");

    // The first path segment is the tenant key the storage policies check.
    const path = `${audit.workspaceId}/${auditId}/${checksum.slice(0, 12)}-${sanitizeName(file.name)}`;

    const { error: uploadError } = await supabase.storage
      .from("evidence")
      .upload(path, buffer, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });

    if (uploadError) {
      results.push({ name: file.name, status: "failed", warning: uploadError.message });
      continue;
    }

    const [input] = await db
      .insert(auditInputs)
      .values({
        workspaceId: audit.workspaceId,
        auditId,
        kind: "file",
        name: file.name,
        status: "parsing",
        filePath: path,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || null,
        checksum,
      })
      .returning();

    // Parsed inline so the "Review inputs" step can show real status, periods and warnings
    // before the user commits to a run (PRD §8.6).
    const parsed = await parseInput(buffer, { fileName: file.name, mimeType: file.type });

    await db.transaction(async (tx) => {
      for (const [seq, doc] of parsed.documents.entries()) {
        await tx.insert(inputDocuments).values({
          workspaceId: audit.workspaceId,
          inputId: input.id,
          kind: doc.kind,
          name: doc.name,
          sheetName: doc.sheetName ?? null,
          pageNumber: doc.pageNumber ?? null,
          seq,
          rowCount: doc.rows?.length ?? 0,
          colCount: doc.columns?.length ?? 0,
          columns: doc.columns ?? [],
          rows: doc.rows ?? [],
          textContent: doc.textContent ?? null,
          summary: doc.summary ?? null,
          truncated: doc.truncated ?? false,
        });
      }

      await tx
        .update(auditInputs)
        .set({
          status: parsed.status,
          warnings: parsed.warnings,
          detected: detectMetadata(parsed.documents),
          parseError: parsed.status === "failed" ? (parsed.warnings[0]?.message ?? null) : null,
          parsedAt: new Date(),
        })
        .where(eq(auditInputs.id, input.id));
    });

    results.push({
      name: file.name,
      status: parsed.status,
      inputId: input.id,
      warning: parsed.warnings[0]?.message,
    });
  }

  await logActivity({
    workspaceId: audit.workspaceId,
    action: "input.uploaded",
    targetType: "audit",
    targetId: auditId,
    auditId,
    metadata: { files: results.map((r) => ({ name: r.name, status: r.status })) },
  });

  return NextResponse.json({ results });
}

/** Storage keys must stay predictable; the original name is preserved on the input row. */
function sanitizeName(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(-120);
}
