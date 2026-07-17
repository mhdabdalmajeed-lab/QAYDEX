/**
 * DOCX via mammoth. Raw text is what the audit model reads; mammoth's own
 * messages (unrecognised styles, dropped elements) are surfaced as warnings so
 * that "something in this document did not come through" is visible rather than
 * silent.
 */

import mammoth from "mammoth";

import type { InputWarning } from "@/db/schema";

import type { ParseResult, ParserContext } from "../types";

export async function parse(buffer: Buffer, ctx: ParserContext): Promise<ParseResult> {
  const warnings: InputWarning[] = [];

  let value: string;
  let messages: readonly { type: string; message: string }[];
  try {
    const result = await mammoth.extractRawText({ buffer });
    value = result.value;
    messages = result.messages;
  } catch (error) {
    return {
      documents: [],
      warnings: [
        {
          code: "docx_unreadable",
          message:
            `Could not read ${ctx.fileName} as a Word document: ${
              error instanceof Error ? error.message : String(error)
            }. ` + "The file is stored and flagged for manual review.",
          severity: "high",
        },
      ],
      detected: {},
      status: "failed",
    };
  }

  for (const message of messages.slice(0, 10)) {
    warnings.push({
      code: `docx_${message.type}`,
      message: `${ctx.fileName}: ${message.message}`,
      severity: message.type === "error" ? "medium" : "info",
    });
  }
  if (messages.length > 10) {
    warnings.push({
      code: "docx_messages_truncated",
      message: `${ctx.fileName}: ${messages.length - 10} further extraction message(s) not listed.`,
      severity: "info",
    });
  }

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
      code: "docx_no_text",
      message: `${ctx.fileName}: the document contains no extractable text.`,
      severity: "medium",
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

  return {
    documents: [
      {
        kind: "text",
        name: ctx.fileName,
        seq: 0,
        columns: [],
        rows: [],
        textContent,
        summary: `Word document: ${textContent.length} character(s) of text.`,
        truncated,
      },
    ],
    warnings,
    detected: {},
    status: "parsed",
  };
}
