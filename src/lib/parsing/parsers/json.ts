/**
 * JSON / NDJSON. Accounting-system and API exports are usually an array of flat
 * records, so those become a real table (record N cites as row N). Anything else
 * is kept verbatim as text — better to hand the model the document than to
 * force a shape onto it.
 */

import type { InputWarning } from "@/db/schema";

import { type SourceRow, buildTable } from "../table";
import type { ParsedDocument, ParseResult, ParserContext } from "../types";

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

function isRecordObject(value: unknown): value is Record<string, JsonValue> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** A cell must be a scalar; nested structures are serialised rather than lost. */
function flattenCell(value: JsonValue): unknown {
  if (value === null) return null;
  if (typeof value === "object") return JSON.stringify(value);
  return value;
}

function recordsToRows(records: Record<string, JsonValue>[]): {
  header: SourceRow;
  rows: SourceRow[];
} {
  const keys: string[] = [];
  const seen = new Set<string>();
  for (const record of records) {
    for (const key of Object.keys(record)) {
      if (!seen.has(key)) {
        seen.add(key);
        keys.push(key);
      }
    }
  }
  // Synthetic header sits at source row 0 — it does not exist in the file, and
  // saying "row 1" would be a lie a reader could not check.
  const header: SourceRow = { sourceRow: 0, cells: keys };
  const rows: SourceRow[] = records.map((record, index) => ({
    sourceRow: index + 1,
    cells: keys.map((key) => (key in record ? flattenCell(record[key] as JsonValue) : null)),
  }));
  return { header, rows };
}

/** An array of flat-ish records, either at the top level or one level in. */
function findRecordArray(
  value: JsonValue,
): { records: Record<string, JsonValue>[]; at: string } | undefined {
  if (Array.isArray(value) && value.length > 0 && value.every(isRecordObject)) {
    return { records: value, at: "$" };
  }
  if (isRecordObject(value)) {
    let best: { records: Record<string, JsonValue>[]; at: string } | undefined;
    for (const [key, child] of Object.entries(value)) {
      if (Array.isArray(child) && child.length > 0 && child.every(isRecordObject)) {
        if (!best || child.length > best.records.length) best = { records: child, at: `$.${key}` };
      }
    }
    return best;
  }
  return undefined;
}

function parseNdjson(text: string): JsonValue[] | undefined {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return undefined;
  const values: JsonValue[] = [];
  for (const line of lines) {
    try {
      values.push(JSON.parse(line) as JsonValue);
    } catch {
      return undefined;
    }
  }
  return values;
}

export async function parse(buffer: Buffer, ctx: ParserContext): Promise<ParseResult> {
  const warnings: InputWarning[] = [];
  const text = buffer.toString("utf8");

  let value: JsonValue;
  try {
    value = JSON.parse(text) as JsonValue;
  } catch (error) {
    const ndjson = parseNdjson(text);
    if (!ndjson) {
      return {
        documents: [],
        warnings: [
          {
            code: "json_invalid",
            message:
              `${ctx.fileName} is not valid JSON: ${
                error instanceof Error ? error.message : String(error)
              }. ` + "The file is stored and flagged for manual review.",
            severity: "high",
          },
        ],
        detected: {},
        status: "failed",
      };
    }
    warnings.push({
      code: "json_ndjson",
      message: `${ctx.fileName}: read as newline-delimited JSON (${ndjson.length} records).`,
      severity: "info",
    });
    value = ndjson;
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

  const found = findRecordArray(value);
  let document: ParsedDocument;

  if (found) {
    const { header, rows } = recordsToRows(found.records);
    const table = buildTable([header, ...rows], ctx.limits, {
      context: ctx.fileName,
      headerRowIndex: 0,
    });
    // The synthetic header is not a real row of the file, so suppress the
    // "header not on the first row" note it would otherwise produce.
    warnings.push(...table.warnings.filter((w) => w.code !== "header_not_first_row"));
    if (found.at !== "$") {
      warnings.push({
        code: "json_records_nested",
        message: `${ctx.fileName}: records were read from "${found.at}" (${found.records.length} entries).`,
        severity: "info",
      });
    }
    document = {
      kind: "table",
      name: ctx.fileName,
      seq: 0,
      columns: table.columns,
      rows: table.rows,
      summary:
        `JSON records from "${found.at}": ${table.totalRows} record(s), ` +
        `${Math.max(table.columns.length - 1, 0)} field(s). Row numbers are record positions.`,
      truncated: table.truncated,
    };
  } else {
    const pretty = JSON.stringify(value, null, 2);
    const truncated = pretty.length > ctx.limits.maxTextChars;
    const textContent = truncated ? pretty.slice(0, ctx.limits.maxTextChars) : pretty;
    if (truncated) {
      warnings.push({
        code: "text_truncated",
        message: `${ctx.fileName}: kept ${textContent.length} of ${pretty.length} characters (cap ${ctx.limits.maxTextChars}).`,
        severity: "medium",
      });
    }
    warnings.push({
      code: "json_not_tabular",
      message: `${ctx.fileName}: no array of records was found; the document is kept as structured text.`,
      severity: "info",
    });
    document = {
      kind: "text",
      name: ctx.fileName,
      seq: 0,
      columns: [],
      rows: [],
      textContent,
      summary: `JSON document (${Array.isArray(value) ? "array" : typeof value}), kept as text.`,
      truncated,
    };
  }

  ctx.budget.documentsRemaining--;
  return { documents: [document], warnings, detected: {}, status: "parsed" };
}
