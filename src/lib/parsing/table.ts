/**
 * Shared table shaping: header-row detection, column typing, and the row
 * provenance contract. Used by the spreadsheet, csv, json and xml parsers so
 * that a row means the same thing regardless of which format it arrived in.
 */

import type { InputWarning } from "@/db/schema";

import {
  type ColumnType,
  type ParsedColumn,
  SOURCE_ROW_COLUMN,
  type ParseLimits,
} from "./types";

/** A row as read from the source, carrying the coordinate it came from. */
export type SourceRow = {
  /** 1-based row number **in the original file**. Never renumbered. */
  sourceRow: number;
  cells: unknown[];
};

export type TableShape = {
  columns: ParsedColumn[];
  /** Row-major, `rows[i][0]` is the source row number. */
  rows: unknown[][];
  truncated: boolean;
  warnings: InputWarning[];
  /** Source row number of the detected header, if there was one. */
  headerRow?: number;
  /** Total data rows found before truncation. */
  totalRows: number;
};

const HEADER_SCAN_LIMIT = 25;
const TYPE_SAMPLE_LIMIT = 200;

export function isBlank(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "");
}

function nonBlankCount(cells: unknown[]): number {
  return cells.reduce<number>((n, c) => (isBlank(c) ? n : n + 1), 0);
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

export function isIsoDateString(value: unknown): value is string {
  return typeof value === "string" && ISO_DATE_RE.test(value.trim());
}

function cellType(value: unknown): ColumnType {
  if (isBlank(value)) return "empty";
  if (typeof value === "number") return "number";
  if (typeof value === "boolean") return "boolean";
  if (value instanceof Date) return "date";
  if (isIsoDateString(value)) return "date";
  return "string";
}

function inferColumnType(rows: unknown[][], index: number): ColumnType {
  const seen = new Set<ColumnType>();
  let sampled = 0;
  for (const row of rows) {
    if (sampled >= TYPE_SAMPLE_LIMIT) break;
    const type = cellType(row[index]);
    if (type === "empty") continue;
    seen.add(type);
    sampled++;
  }
  if (seen.size === 0) return "empty";
  if (seen.size === 1) return [...seen][0] ?? "empty";
  return "mixed";
}

/**
 * Score a candidate header row. Real headers are mostly short text labels, fill
 * most of the used width, and are followed by rows that carry values of a
 * different shape (numbers, dates). Title/blank/metadata rows above the table —
 * which accounting exports are full of — score badly on all three counts.
 */
function scoreHeaderCandidate(rows: SourceRow[], index: number, width: number): number {
  const cells = rows[index]?.cells ?? [];
  const filled = nonBlankCount(cells);
  if (filled < 2) return -1;

  const fillRatio = width > 0 ? filled / width : 0;
  const strings = cells.filter((c) => !isBlank(c) && typeof c === "string").length;
  const stringRatio = filled > 0 ? strings / filled : 0;

  // Headers are labels: short-ish, and not themselves numeric.
  const reasonableLength =
    cells.filter((c) => typeof c === "string" && c.trim().length > 0 && c.trim().length <= 64).length;
  const lengthRatio = filled > 0 ? reasonableLength / filled : 0;

  const below = rows.slice(index + 1, index + 11);
  if (below.length === 0) return -1;
  const belowFill =
    below.reduce((n, r) => n + nonBlankCount(r.cells), 0) / (below.length * Math.max(width, 1));
  const belowValues = below.reduce((n, r) => {
    const nonString = r.cells.filter((c) => {
      const t = cellType(c);
      return t === "number" || t === "date" || t === "boolean";
    }).length;
    return n + nonString;
  }, 0);
  const belowValueRatio = belowValues / (below.length * Math.max(width, 1));

  // Duplicate labels are a smell (blank-filled title rows repeat "").
  const distinct = new Set(
    cells.filter((c) => !isBlank(c)).map((c) => String(c).trim().toLowerCase()),
  ).size;
  const distinctRatio = filled > 0 ? distinct / filled : 0;

  return (
    stringRatio * 2.5 +
    fillRatio * 2 +
    lengthRatio * 1 +
    distinctRatio * 1.5 +
    belowFill * 1.5 +
    belowValueRatio * 1.5 -
    // Prefer the earliest good header; later rows are usually data.
    index * 0.02
  );
}

export type HeaderDetection = {
  /** Index into `rows`, or -1 when no header was found. */
  index: number;
  score: number;
};

/** Find the header row rather than assuming row 1. */
export function detectHeaderRow(rows: SourceRow[], width: number): HeaderDetection {
  let best: HeaderDetection = { index: -1, score: 0 };
  const scanTo = Math.min(rows.length, HEADER_SCAN_LIMIT);
  for (let i = 0; i < scanTo; i++) {
    const score = scoreHeaderCandidate(rows, i, width);
    if (score > best.score) best = { index: i, score };
  }
  // Below this the "header" is indistinguishable from data; treat as headerless.
  return best.score >= 3 ? best : { index: -1, score: best.score };
}

function slugify(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return slug.length > 0 ? slug.slice(0, 60) : "";
}

function buildColumns(
  header: SourceRow | undefined,
  dataRows: unknown[][],
  width: number,
): ParsedColumn[] {
  const columns: ParsedColumn[] = [SOURCE_ROW_COLUMN];
  const used = new Set<string>([SOURCE_ROW_COLUMN.key]);

  for (let c = 0; c < width; c++) {
    const raw = header?.cells[c];
    const label = isBlank(raw) ? `Column ${c + 1}` : String(raw).trim();
    let key = slugify(label) || `col_${c + 1}`;
    if (used.has(key)) {
      let n = 2;
      while (used.has(`${key}_${n}`)) n++;
      key = `${key}_${n}`;
    }
    used.add(key);
    // +1 because rows[][0] is the source row number.
    columns.push({ key, label, type: inferColumnType(dataRows, c + 1) });
  }
  return columns;
}

/** Trailing all-blank columns are an artifact of the used range, not data. */
function usedWidth(rows: SourceRow[]): number {
  let width = 0;
  for (const row of rows) {
    for (let c = row.cells.length - 1; c >= 0; c--) {
      if (!isBlank(row.cells[c])) {
        width = Math.max(width, c + 1);
        break;
      }
    }
  }
  return width;
}

/**
 * Turn raw source rows into a document-shaped table.
 *
 * Contract: every emitted row keeps its real source row number in cell 0, so an
 * `EvidenceLocator` built from `rows[i][0]` points at the same row a user sees
 * when they open the original file.
 */
export function buildTable(
  sourceRows: SourceRow[],
  limits: ParseLimits,
  options: { context: string; detectHeader?: boolean; headerRowIndex?: number } = {
    context: "table",
  },
): TableShape {
  const warnings: InputWarning[] = [];
  const width = usedWidth(sourceRows);

  if (width === 0 || sourceRows.length === 0) {
    return {
      columns: [SOURCE_ROW_COLUMN],
      rows: [],
      truncated: false,
      warnings: [
        {
          code: "empty_table",
          message: `${options.context} contained no data.`,
          severity: "info",
        },
      ],
      totalRows: 0,
    };
  }

  let headerIndex = options.headerRowIndex ?? -1;
  if (headerIndex < 0 && options.detectHeader !== false) {
    headerIndex = detectHeaderRow(sourceRows, width).index;
  }

  const header = headerIndex >= 0 ? sourceRows[headerIndex] : undefined;
  if (header && headerIndex > 0) {
    warnings.push({
      code: "header_not_first_row",
      message:
        `${options.context}: header detected on source row ${header.sourceRow}; ` +
        `${headerIndex} preceding row(s) were kept as preamble rows are often meaningful.`,
      severity: "info",
    });
  }
  if (!header) {
    warnings.push({
      code: "header_not_detected",
      message: `${options.context}: no header row could be identified; columns are positional.`,
      severity: "low",
    });
  }

  // Rows above the header are preamble (titles, entity name, period). They are
  // NOT data, but they are also not dropped — they go into the summary via the
  // caller if needed. Data starts after the header.
  const dataSource = headerIndex >= 0 ? sourceRows.slice(headerIndex + 1) : sourceRows;
  const kept = dataSource.slice(0, limits.maxRowsPerDocument);
  const truncated = dataSource.length > kept.length;

  const rows: unknown[][] = kept.map((row) => {
    const cells: unknown[] = new Array<unknown>(width + 1);
    cells[0] = row.sourceRow;
    for (let c = 0; c < width; c++) {
      const value = row.cells[c];
      cells[c + 1] = value === undefined ? null : value;
    }
    return cells;
  });

  if (truncated) {
    warnings.push({
      code: "rows_truncated",
      message:
        `${options.context}: kept ${kept.length} of ${dataSource.length} rows ` +
        `(cap ${limits.maxRowsPerDocument}). Rows after source row ` +
        `${kept[kept.length - 1]?.sourceRow ?? "?"} are not in the parsed document.`,
      severity: "medium",
    });
  }

  return {
    columns: buildColumns(header, rows, width),
    rows,
    truncated,
    warnings,
    headerRow: header?.sourceRow,
    totalRows: dataSource.length,
  };
}
