/**
 * PDF text extraction via `unpdf` (bundled serverless pdfjs, no native canvas).
 *
 * One document per page, keeping the page number, because `EvidenceLocator.page`
 * is how a finding cites a PDF. A page with no extractable text is still emitted
 * — an empty page in the parse output is meaningful (it usually means a scan),
 * and dropping it would renumber nothing but would hide the gap.
 */

import { extractText, getDocumentProxy } from "unpdf";

import type { InputWarning } from "@/db/schema";

import type { ParsedDocument, ParseResult, ParserContext } from "../types";

export async function parse(buffer: Buffer, ctx: ParserContext): Promise<ParseResult> {
  const warnings: InputWarning[] = [];

  let totalPages: number;
  let pages: string[];
  try {
    // Copy into a fresh Uint8Array: pdfjs transfers/detaches the buffer it is given.
    const pdf = await getDocumentProxy(new Uint8Array(buffer));
    const extracted = await extractText(pdf, { mergePages: false });
    totalPages = extracted.totalPages;
    pages = extracted.text;
  } catch (error) {
    return {
      documents: [],
      warnings: [
        {
          code: "pdf_unreadable",
          message:
            `Could not extract text from ${ctx.fileName}: ${
              error instanceof Error ? error.message : String(error)
            }. ` + "The file is stored and flagged for manual review.",
          severity: "high",
        },
      ],
      detected: {},
      status: "failed",
    };
  }

  const documents: ParsedDocument[] = [];
  let emptyPages = 0;

  for (let i = 0; i < pages.length; i++) {
    if (ctx.budget.documentsRemaining <= 0) {
      warnings.push({
        code: "document_budget_exhausted",
        message: `Stopped after ${documents.length} page(s) of ${totalPages} in ${ctx.fileName}; remaining pages were not parsed.`,
        severity: "medium",
      });
      break;
    }

    const raw = pages[i] ?? "";
    const truncated = raw.length > ctx.limits.maxTextChars;
    const textContent = truncated ? raw.slice(0, ctx.limits.maxTextChars) : raw;
    if (truncated) {
      warnings.push({
        code: "text_truncated",
        message: `${ctx.fileName} page ${i + 1}: kept ${textContent.length} of ${raw.length} characters (cap ${ctx.limits.maxTextChars}).`,
        severity: "medium",
      });
    }
    if (raw.trim().length === 0) emptyPages++;

    documents.push({
      kind: "page",
      name: `${ctx.fileName} › page ${i + 1}`,
      pageNumber: i + 1,
      seq: i,
      columns: [],
      rows: [],
      textContent,
      summary:
        raw.trim().length === 0
          ? `Page ${i + 1}: no extractable text (likely a scan or an image-only page).`
          : `Page ${i + 1}: ${textContent.length} character(s) of text.`,
      truncated,
    });
    ctx.budget.documentsRemaining--;
  }

  if (emptyPages > 0) {
    warnings.push({
      code: "pdf_pages_without_text",
      message:
        `${ctx.fileName}: ${emptyPages} of ${totalPages} page(s) contain no extractable text. ` +
        "These are most likely scanned images and need to be read visually rather than as text.",
      severity: emptyPages === totalPages ? "high" : "medium",
    });
  }

  return { documents, warnings, detected: {}, status: "parsed" };
}
