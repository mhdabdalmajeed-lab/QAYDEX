/**
 * XML / XBRL / HTML via fast-xml-parser.
 *
 * Bank and ERP XML exports are repeated record elements, so the biggest
 * repeated element becomes a table. Everything else is kept as serialised text.
 */

import { XMLParser, XMLValidator } from "fast-xml-parser";

import type { InputWarning } from "@/db/schema";

import { type SourceRow, buildTable } from "../table";
import type { ParsedDocument, ParseResult, ParserContext } from "../types";

const MAX_SEARCH_DEPTH = 12;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isScalar(value: unknown): boolean {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

/** Records are objects whose fields are mostly scalars — i.e. rows, not trees. */
function scalarRatio(record: Record<string, unknown>): number {
  const values = Object.values(record);
  if (values.length === 0) return 0;
  return values.filter(isScalar).length / values.length;
}

type RecordArray = { records: Record<string, unknown>[]; at: string };

function findRecordArray(value: unknown, path: string, depth: number): RecordArray | undefined {
  if (depth > MAX_SEARCH_DEPTH) return undefined;

  let best: RecordArray | undefined;

  const consider = (candidate: RecordArray | undefined) => {
    if (!candidate) return;
    if (!best || candidate.records.length > best.records.length) best = candidate;
  };

  if (Array.isArray(value)) {
    const objects = value.filter(isPlainObject);
    if (
      objects.length === value.length &&
      objects.length > 0 &&
      objects.every((o) => scalarRatio(o) >= 0.5)
    ) {
      consider({ records: objects, at: path });
    }
    for (const [i, child] of value.entries()) {
      consider(findRecordArray(child, `${path}[${i}]`, depth + 1));
    }
    return best;
  }

  if (isPlainObject(value)) {
    for (const [key, child] of Object.entries(value)) {
      consider(findRecordArray(child, `${path}.${key}`, depth + 1));
    }
  }
  return best;
}

function flattenCell(value: unknown): unknown {
  if (value === undefined) return null;
  if (isScalar(value)) return value;
  return JSON.stringify(value);
}

export async function parse(buffer: Buffer, ctx: ParserContext): Promise<ParseResult> {
  const warnings: InputWarning[] = [];
  const text = buffer.toString("utf8");

  const validation = XMLValidator.validate(text, { allowBooleanAttributes: true });
  if (validation !== true) {
    warnings.push({
      code: "xml_invalid",
      message:
        `${ctx.fileName}: ${validation.err.msg} (line ${validation.err.line}). ` +
        "Attempting a lenient parse anyway.",
      severity: "medium",
    });
  }

  let value: unknown;
  try {
    const parser = new XMLParser({
      ignoreAttributes: false,
      attributeNamePrefix: "@",
      parseAttributeValue: true,
      trimValues: true,
      // Never coerce "0001234" (an account code) into the number 1234.
      numberParseOptions: { leadingZeros: false, hex: false, eNotation: false },
    });
    value = parser.parse(text) as unknown;
  } catch (error) {
    return {
      documents: [],
      warnings: [
        ...warnings,
        {
          code: "xml_unreadable",
          message:
            `Could not parse ${ctx.fileName} as XML: ${
              error instanceof Error ? error.message : String(error)
            }. ` + "The file is stored and flagged for manual review.",
          severity: "high",
        },
      ],
      detected: {},
      status: "failed",
    };
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

  const found = findRecordArray(value, "$", 0);
  let document: ParsedDocument;

  if (found && found.records.length > 1) {
    const keys: string[] = [];
    const seen = new Set<string>();
    for (const record of found.records) {
      for (const key of Object.keys(record)) {
        if (!seen.has(key)) {
          seen.add(key);
          keys.push(key);
        }
      }
    }
    // Source row 0 marks a synthetic header: XML has no line-addressable rows,
    // so row N means "the Nth record", not "line N".
    const header: SourceRow = { sourceRow: 0, cells: keys };
    const rows: SourceRow[] = found.records.map((record, index) => ({
      sourceRow: index + 1,
      cells: keys.map((key) => flattenCell(record[key])),
    }));

    const table = buildTable([header, ...rows], ctx.limits, {
      context: ctx.fileName,
      headerRowIndex: 0,
    });
    warnings.push(...table.warnings.filter((w) => w.code !== "header_not_first_row"));
    warnings.push({
      code: "xml_records_found",
      message: `${ctx.fileName}: read ${found.records.length} repeated element(s) at "${found.at}" as rows.`,
      severity: "info",
    });

    document = {
      kind: "table",
      name: ctx.fileName,
      seq: 0,
      columns: table.columns,
      rows: table.rows,
      summary:
        `XML records from "${found.at}": ${table.totalRows} record(s), ` +
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
      code: "xml_not_tabular",
      message: `${ctx.fileName}: no repeated record element was found; the document is kept as structured text.`,
      severity: "info",
    });
    document = {
      kind: "text",
      name: ctx.fileName,
      seq: 0,
      columns: [],
      rows: [],
      textContent,
      summary: "XML document, kept as structured text.",
      truncated,
    };
  }

  ctx.budget.documentsRemaining--;
  return { documents: [document], warnings, detected: {}, status: "parsed" };
}
