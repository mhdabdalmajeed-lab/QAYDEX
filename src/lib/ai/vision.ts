import "server-only";

import { and, eq, isNull } from "drizzle-orm";
import type OpenAI from "openai";

import { db } from "@/db";
import { auditInputs } from "@/db/schema";
import { createClient } from "@/lib/supabase/server";

/**
 * Images as evidence.
 *
 * The image parser deliberately does no OCR — the model reads a scanned statement, a
 * photographed invoice or a screenshot better than an OCR pass would. That promise only
 * holds if the file actually reaches the model, which is what this module does: it pulls the
 * stored bytes back out of the evidence bucket and turns them into `input_image` parts.
 *
 * Every image is announced by inputId in the text part that precedes it, so a finding drawn
 * from a screenshot can cite it like any other evidence.
 */

/** Well past a scanned page; a phone photo of a ledger is ~3-5MB. */
const MAX_BYTES = 12 * 1024 * 1024;

/** Enough for a set of statements without burning the context window on pixels. */
const MAX_IMAGES = 8;

export type ImageEvidence = {
  inputId: string;
  name: string;
  dataUrl: string;
};

export type ImageEvidenceResult = {
  images: ImageEvidence[];
  /** Named so the manifest can say what the model was NOT shown, and why. */
  skipped: { name: string; reason: string }[];
};

export async function loadImageEvidence(auditId: string): Promise<ImageEvidenceResult> {
  const rows = await db
    .select({
      id: auditInputs.id,
      name: auditInputs.name,
      filePath: auditInputs.filePath,
      fileSize: auditInputs.fileSize,
      mimeType: auditInputs.mimeType,
    })
    .from(auditInputs)
    .where(and(eq(auditInputs.auditId, auditId), isNull(auditInputs.removedAt)));

  const candidates = rows.filter(
    (row) => row.mimeType?.startsWith("image/") && row.filePath !== null,
  );
  if (candidates.length === 0) return { images: [], skipped: [] };

  const images: ImageEvidence[] = [];
  const skipped: { name: string; reason: string }[] = [];

  // The run continues in `after()`, so the request-scoped storage client may not be
  // available. Losing the images is bad; losing the whole audit over them is worse — the
  // manifest says which ones went unseen either way.
  let supabase;
  try {
    supabase = await createClient();
  } catch (error) {
    console.error("[ai] image evidence unavailable", error);
    return {
      images: [],
      skipped: candidates.map((row) => ({
        name: row.name,
        reason: "the evidence store could not be reached during this run",
      })),
    };
  }

  for (const row of candidates) {
    if (images.length >= MAX_IMAGES) {
      skipped.push({ name: row.name, reason: `only the first ${MAX_IMAGES} images are shown` });
      continue;
    }
    if (row.fileSize !== null && row.fileSize > MAX_BYTES) {
      skipped.push({
        name: row.name,
        reason: `${(row.fileSize / 1024 / 1024).toFixed(1)}MB exceeds the ${MAX_BYTES / 1024 / 1024}MB limit for visual reading`,
      });
      continue;
    }

    const { data, error } = await supabase.storage.from("evidence").download(row.filePath!);
    if (error || !data) {
      // A file the model cannot see must be declared, never quietly dropped.
      skipped.push({ name: row.name, reason: error?.message ?? "the stored file could not be read" });
      continue;
    }

    const buffer = Buffer.from(await data.arrayBuffer());
    if (buffer.byteLength > MAX_BYTES) {
      skipped.push({ name: row.name, reason: "the file is too large for visual reading" });
      continue;
    }

    images.push({
      inputId: row.id,
      name: row.name,
      dataUrl: `data:${row.mimeType};base64,${buffer.toString("base64")}`,
    });
  }

  return { images, skipped };
}

/**
 * The content parts to append to a user message. Empty when there are no images, so callers
 * can spread it unconditionally.
 */
export function imageContentParts(
  result: ImageEvidenceResult,
): OpenAI.Responses.ResponseInputMessageContentList {
  if (result.images.length === 0) return [];

  const parts: OpenAI.Responses.ResponseInputMessageContentList = [
    {
      type: "input_text",
      text:
        `## Image evidence\n\nThe following ${result.images.length} image${result.images.length === 1 ? " is" : "s are"} attached below, in order. ` +
        "They hold no extractable text — read them visually and cite them by inputId:\n" +
        result.images.map((image) => `  - inputId=${image.inputId} · "${image.name}"`).join("\n"),
    },
  ];

  for (const image of result.images) {
    parts.push({ type: "input_image", image_url: image.dataUrl, detail: "high" });
  }

  return parts;
}

/** A line for the manifest naming images the model was not shown. */
export function describeSkippedImages(result: ImageEvidenceResult): string {
  if (result.skipped.length === 0) return "";
  return (
    "\n\n! Not shown to you visually: " +
    result.skipped.map((item) => `"${item.name}" (${item.reason})`).join("; ") +
    ". Do not draw conclusions from their contents."
  );
}
