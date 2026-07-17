/**
 * XLSX / XLSM / XLSB / XLS / ODS via SheetJS (`xlsx@0.20.3`, CDN build).
 *
 * Every sheet becomes one document. Cells are walked directly rather than going
 * through `sheet_to_json` because we need the worksheet's real used-range so
 * that row numbers survive: `rows[i][0]` is the Excel row a user sees.
 */

import * as XLSX from "xlsx";

import type { InputWarning } from "@/db/schema";

import { type SourceRow, buildTable } from "../table";
import type { ParsedDocument, ParseResult, ParserContext } from "../types";

function pad(value: number, width: number): string {
  return String(Math.trunc(Math.abs(value))).padStart(width, "0");
}

/**
 * Convert an Excel serial to an ISO string **without going through `Date`**.
 *
 * This is why the workbook is read with `cellDates: false`. An Excel date serial
 * is a wall-clock value carrying no timezone; SheetJS's `cellDates: true` turns
 * it into a `Date` constructed in the *server's* local time, so `toISOString()`
 * then shifts it by the server's UTC offset. On a machine at UTC-5 the posting
 * date 2024-01-15 serialises as "2024-01-14T05:00:00Z" — a whole day out, which
 * silently moves transactions across period boundaries and would make detected
 * periods (and any evidence citing them) wrong.
 *
 * `SSF.parse_date_code` returns the calendar components the spreadsheet actually
 * holds, so formatting them directly is both correct and independent of where
 * the code runs.
 */
function serialToIso(serial: number, format: string): string | null {
  const parts = XLSX.SSF.parse_date_code(serial);
  if (!parts || parts.y === undefined) return null;

  const date = `${pad(parts.y, 4)}-${pad(parts.m, 2)}-${pad(parts.d, 2)}`;
  // A time-only format (e.g. "h:mm") has no meaningful date part; a date-only
  // format has no meaningful time part. Emit exactly what the cell carries.
  const hasTime = /[hs]/.test(format) || parts.H !== 0 || parts.M !== 0 || parts.S !== 0;
  if (!hasTime) return date;
  return `${date}T${pad(parts.H, 2)}:${pad(parts.M, 2)}:${pad(parts.S, 2)}`;
}

function coerceCell(cell: XLSX.CellObject | undefined): unknown {
  if (!cell || cell.v === undefined || cell.v === null) return null;
  // Formula errors (#REF!, #DIV/0!) are absence of a value, not a value.
  if (cell.t === "e") return null;
  if (cell.t === "b") return Boolean(cell.v);

  if (cell.t === "n") {
    if (typeof cell.v !== "number") return null;
    const format = typeof cell.z === "string" ? cell.z : "";
    if (format && XLSX.SSF.is_date(format)) {
      const iso = serialToIso(cell.v, format);
      if (iso) return iso;
    }
    return cell.v;
  }

  // Only reachable if a workbook already carries date cells; convert via
  // components rather than toISOString for the same timezone reason as above.
  if (cell.t === "d" && cell.v instanceof Date) {
    const d = cell.v;
    if (Number.isNaN(d.getTime())) return null;
    return (
      `${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1, 2)}-${pad(d.getDate(), 2)}` +
      `T${pad(d.getHours(), 2)}:${pad(d.getMinutes(), 2)}:${pad(d.getSeconds(), 2)}`
    );
  }

  return String(cell.v);
}

export async function parse(buffer: Buffer, ctx: ParserContext): Promise<ParseResult> {
  const warnings: InputWarning[] = [];
  const documents: ParsedDocument[] = [];

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, {
      type: "buffer",
      // Deliberately NOT `cellDates: true` — see `serialToIso`. Raw serials plus
      // `cellNF` (which keeps the number format) let us convert dates ourselves
      // without a timezone ever entering the picture.
      cellDates: false,
      cellNF: true,
      cellText: false,
      dense: false,
    });
  } catch (error) {
    return {
      documents: [],
      warnings: [
        {
          code: "spreadsheet_unreadable",
          message: `Could not open ${ctx.fileName} as a spreadsheet: ${
            error instanceof Error ? error.message : String(error)
          }. The file is stored and flagged for manual review.`,
          severity: "high",
        },
      ],
      detected: {},
      status: "failed",
    };
  }

  const sheetNames = workbook.SheetNames;
  if (sheetNames.length === 0) {
    return {
      documents: [],
      warnings: [
        {
          code: "spreadsheet_no_sheets",
          message: `${ctx.fileName} contains no worksheets.`,
          severity: "medium",
        },
      ],
      detected: {},
      status: "parsed",
    };
  }

  let seq = 0;
  for (const sheetName of sheetNames) {
    if (ctx.budget.documentsRemaining <= 0) {
      warnings.push({
        code: "document_budget_exhausted",
        message: `Stopped after ${seq} sheet(s) of ${sheetNames.length} in ${ctx.fileName}; remaining sheets were not parsed.`,
        severity: "medium",
      });
      break;
    }

    const sheet = workbook.Sheets[sheetName];
    const ref = sheet?.["!ref"];
    if (!sheet || !ref) {
      documents.push({
        kind: "sheet",
        name: `${ctx.fileName} › ${sheetName}`,
        sheetName,
        seq: seq++,
        columns: [],
        rows: [],
        summary: "Empty sheet.",
        truncated: false,
      });
      ctx.budget.documentsRemaining--;
      warnings.push({
        code: "sheet_empty",
        message: `Sheet "${sheetName}" in ${ctx.fileName} is empty.`,
        severity: "info",
      });
      continue;
    }

    const range = XLSX.utils.decode_range(ref);
    const sourceRows: SourceRow[] = [];
    for (let r = range.s.r; r <= range.e.r; r++) {
      const cells: unknown[] = [];
      for (let c = range.s.c; c <= range.e.c; c++) {
        cells.push(coerceCell(sheet[XLSX.utils.encode_cell({ r, c })]));
      }
      // Excel rows are 1-based; `range.s.r` is 0-based.
      sourceRows.push({ sourceRow: r + 1, cells });
    }

    const table = buildTable(sourceRows, ctx.limits, {
      context: `${ctx.fileName} › ${sheetName}`,
    });
    warnings.push(...table.warnings);

    documents.push({
      kind: "sheet",
      name: `${ctx.fileName} › ${sheetName}`,
      sheetName,
      seq: seq++,
      columns: table.columns,
      rows: table.rows,
      summary:
        `Sheet "${sheetName}": ${table.totalRows} data row(s), ` +
        `${Math.max(table.columns.length - 1, 0)} column(s)` +
        (table.headerRow ? `, header on row ${table.headerRow}` : ", no header detected") +
        ".",
      truncated: table.truncated,
    });
    ctx.budget.documentsRemaining--;
  }

  return { documents, warnings, detected: {}, status: "parsed" };
}
