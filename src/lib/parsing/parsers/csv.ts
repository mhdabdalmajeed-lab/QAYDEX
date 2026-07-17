/**
 * CSV / TSV via papaparse. Chosen over csv-parse because uploaded CSV is messy:
 * papaparse tolerates ragged rows per-record instead of throwing the whole file
 * away, and an accounting export with one bad line must still yield its other
 * 40,000 rows (PRD §26.3 — inputs are never silently dropped).
 */

import Papa from "papaparse";

import type { InputWarning } from "@/db/schema";

import { type SourceRow, buildTable } from "../table";
import type { ParseResult, ParserContext } from "../types";

function decode(buffer: Buffer): { text: string; warning?: InputWarning } {
  // Strip a UTF-8 BOM — Excel writes one and it otherwise poisons the first header.
  if (buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
    return { text: buffer.subarray(3).toString("utf8") };
  }
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return {
      text: buffer.subarray(2).toString("utf16le"),
      warning: {
        code: "csv_utf16",
        message: "File was decoded as UTF-16LE based on its byte order mark.",
        severity: "info",
      },
    };
  }
  return { text: buffer.toString("utf8") };
}

export async function parse(buffer: Buffer, ctx: ParserContext): Promise<ParseResult> {
  const warnings: InputWarning[] = [];
  const { text, warning } = decode(buffer);
  if (warning) warnings.push(warning);

  const result = Papa.parse<string[]>(text, {
    header: false,
    // Blank lines are kept so that record numbers line up with the file's rows.
    skipEmptyLines: false,
    dynamicTyping: false,
    delimiter: "",
  });

  if (result.errors.length > 0) {
    const shown = result.errors.slice(0, 5);
    for (const error of shown) {
      warnings.push({
        code: `csv_${error.code ?? "error"}`.toLowerCase(),
        message:
          `${ctx.fileName}: ${error.message}` +
          (typeof error.row === "number" ? ` (record ${error.row + 1})` : "") +
          ". The record was kept as-is rather than dropped.",
        severity: "low",
      });
    }
    if (result.errors.length > shown.length) {
      warnings.push({
        code: "csv_errors_truncated",
        message: `${ctx.fileName}: ${result.errors.length - shown.length} further parse warning(s) not listed.`,
        severity: "info",
      });
    }
  }

  const delimiter = result.meta.delimiter;
  if (delimiter) {
    warnings.push({
      code: "csv_delimiter",
      message: `${ctx.fileName}: delimiter detected as ${
        delimiter === "\t" ? "tab" : `"${delimiter}"`
      }.`,
      severity: "info",
    });
  }

  // Papaparse yields records in file order. Record N is what a spreadsheet
  // showing this CSV would number row N, which is what evidence must cite.
  // (A quoted field containing newlines spans several physical lines; the record
  // number stays the correct citation unit either way.)
  const records = [...result.data];

  // A file ending in a newline yields one trailing empty record. That is an
  // artifact of the line terminator, not a row of the file. Interior blank lines
  // are kept, because dropping them would renumber every row below.
  const last = records[records.length - 1];
  if (
    records.length > 0 &&
    Array.isArray(last) &&
    last.every((cell) => typeof cell !== "string" || cell.trim() === "") &&
    /(\r\n|\n|\r)$/.test(text)
  ) {
    records.pop();
  }

  const sourceRows: SourceRow[] = records.map((cells, index) => ({
    sourceRow: index + 1,
    cells: Array.isArray(cells) ? [...cells] : [cells],
  }));

  const table = buildTable(sourceRows, ctx.limits, { context: ctx.fileName });
  warnings.push(...table.warnings);

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
        kind: "table",
        name: ctx.fileName,
        seq: 0,
        columns: table.columns,
        rows: table.rows,
        summary:
          `${table.totalRows} data row(s), ${Math.max(table.columns.length - 1, 0)} column(s)` +
          (table.headerRow ? `, header on row ${table.headerRow}` : ", no header detected") +
          ".",
        truncated: table.truncated,
      },
    ],
    warnings,
    detected: {},
    status: "parsed",
  };
}
