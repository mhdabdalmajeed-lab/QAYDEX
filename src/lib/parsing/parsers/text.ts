/**
 * Plain text (txt, md, log, and anything that sniffed as textual).
 */

import type { InputWarning } from "@/db/schema";

import type { ParseResult, ParserContext } from "../types";

export async function parse(buffer: Buffer, ctx: ParserContext): Promise<ParseResult> {
  const warnings: InputWarning[] = [];

  const value = buffer.toString("utf8");
  const truncated = value.length > ctx.limits.maxTextChars;
  const textContent = truncated ? value.slice(0, ctx.limits.maxTextChars) : value;

  if (truncated) {
    warnings.push({
      code: "text_truncated",
      message: `${ctx.fileName}: kept ${textContent.length} of ${value.length} characters (cap ${ctx.limits.maxTextChars}).`,
      severity: "medium",
    });
  }
  if (value.trim().length === 0) {
    warnings.push({
      code: "text_empty",
      message: `${ctx.fileName} is empty.`,
      severity: "info",
    });
  }
  if (value.includes("�")) {
    warnings.push({
      code: "text_replacement_chars",
      message: `${ctx.fileName}: the file is not valid UTF-8; some characters were replaced and may be wrong.`,
      severity: "low",
    });
  }

  if (ctx.budget.documentsRemaining <= 0) {
    return {
      documents: [],
      warnings: [
        ...warnings,
        {
          code: "document_budget_exhausted",
          message: `${ctx.fileName} was not parsed: the document budget for this input was exhausted.`,
          severity: "medium",
        },
      ],
      detected: {},
      status: "failed",
    };
  }
  ctx.budget.documentsRemaining--;

  const lines = textContent.length === 0 ? 0 : textContent.split(/\r\n|\n|\r/).length;

  return {
    documents: [
      {
        kind: "text",
        name: ctx.fileName,
        seq: 0,
        columns: [],
        rows: [],
        textContent,
        summary: `Text file: ${lines} line(s), ${textContent.length} character(s).`,
        truncated,
      },
    ],
    warnings,
    detected: {},
    status: "parsed",
  };
}
