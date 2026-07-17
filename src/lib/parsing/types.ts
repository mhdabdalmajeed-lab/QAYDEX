/**
 * Shared types for the evidence ingestion / parsing pipeline (PRD §22 stages 1–3).
 *
 * The whole point of this module is **provenance**. A parsed row must be
 * traceable back to the coordinates it came from (sheet + row, page, zip entry)
 * because evidence citations (PRD §6.2 `EvidenceLocator`) point at those
 * coordinates. Parsers therefore never renumber, reorder or compact rows.
 *
 * This module is pure: Buffers in, `ParseResult` out. No filesystem, no network,
 * no database writes.
 */

import type { DetectedMetadata, InputWarning, documentKindEnum, inputStatusEnum } from "@/db/schema";

export type { DetectedMetadata, InputWarning };

/** Mirrors `input_documents.kind`. */
export type DocumentKind = (typeof documentKindEnum.enumValues)[number];

/** Mirrors `audit_inputs.status`. */
export type InputStatus = (typeof inputStatusEnum.enumValues)[number];

/**
 * The terminal states a parse can report. `parseInput` never throws and never
 * drops an input: an unreadable file comes back `"unsupported"` or `"failed"`
 * with a warning explaining why, so it can still be stored and flagged
 * (PRD §8.5, §26.3).
 */
export type ParseStatus = Extract<InputStatus, "parsed" | "failed" | "unsupported">;

/** Value type recorded for a column. Stored as free text in the DB. */
export type ColumnType = "rownum" | "string" | "number" | "date" | "boolean" | "empty" | "mixed";

/** Mirrors an entry of `input_documents.columns`. */
export type ParsedColumn = {
  key: string;
  label: string;
  type: ColumnType;
};

/**
 * Reserved leading column carrying the row's source coordinate.
 *
 * Every table-shaped document prepends this column, and `rows[i][0]` is the
 * **real** source row number — the Excel/CSV row as a human would see it in the
 * original file, 1-based, gaps and all. Header detection and truncation must
 * never shift it. `EvidenceLocator.rowFrom` / `rowTo` are expressed in these
 * numbers.
 */
export const SOURCE_ROW_KEY = "__row";

export const SOURCE_ROW_COLUMN: ParsedColumn = {
  key: SOURCE_ROW_KEY,
  label: "Row",
  type: "rownum",
};

/**
 * A parsed unit of an input — the thing evidence references point at.
 * Shape mirrors the `input_documents` table.
 */
export type ParsedDocument = {
  kind: DocumentKind;
  /** Human label, e.g. `ledger.xlsx › Sheet1` or `report.pdf › page 3`. */
  name: string;
  /** Set for spreadsheet sheets; feeds `EvidenceLocator.sheet`. */
  sheetName?: string;
  /** 1-based; set for PDF pages; feeds `EvidenceLocator.page`. */
  pageNumber?: number;
  /** Stable ordering within the input. */
  seq: number;
  columns: ParsedColumn[];
  /** Row-major cells. `rows[i][0]` is the source row number (see SOURCE_ROW_COLUMN). */
  rows: unknown[][];
  textContent?: string;
  summary?: string;
  /** True when rows/text were capped. Always accompanied by a warning saying by how much. */
  truncated: boolean;
};

/** Caps that keep a hostile or merely enormous upload from exhausting the process. */
export type ParseLimits = {
  /** Data rows kept per document before `truncated` is set. */
  maxRowsPerDocument: number;
  /** Characters kept per text document. */
  maxTextChars: number;
  /** Entries expanded from a single zip archive. */
  maxZipEntries: number;
  /** How deep zip-inside-zip nesting may go. */
  maxZipDepth: number;
  /** Total decompressed bytes across one `parseInput` call. */
  maxTotalBytes: number;
  /** Uncompressed:compressed ratio above which a zip entry is refused. */
  maxCompressionRatio: number;
  /** Documents produced across one `parseInput` call. */
  maxDocuments: number;
};

export const DEFAULT_LIMITS: ParseLimits = {
  maxRowsPerDocument: 5_000,
  maxTextChars: 2_000_000,
  maxZipEntries: 200,
  maxZipDepth: 3,
  maxTotalBytes: 256 * 1024 * 1024,
  maxCompressionRatio: 200,
  maxDocuments: 500,
};

/**
 * Budget shared across one `parseInput` call, including everything recursively
 * expanded out of zip archives. Mutable by design — it is call-scoped state,
 * not module state.
 */
export type ParseBudget = {
  bytesRemaining: number;
  documentsRemaining: number;
};

export type ParserContext = {
  /** Name of the thing being parsed right now (a zip entry name when nested). */
  fileName: string;
  mimeType?: string;
  /** Ancestry of container names, outermost first. Empty at the top level. */
  path: string[];
  /** Zip nesting depth; 0 at the top level. */
  depth: number;
  limits: ParseLimits;
  budget: ParseBudget;
  /**
   * Re-enter the dispatcher for a nested payload. Injected by `parseInput` so
   * that `zip.ts` can recurse without importing the dispatcher (no import cycle).
   */
  recurse: (buffer: Buffer, ctx: ParserContext) => Promise<ParseResult>;
};

export type ParseResult = {
  documents: ParsedDocument[];
  warnings: InputWarning[];
  detected: DetectedMetadata;
  status: ParseStatus;
};

/** Every parser module exports exactly this. */
export type Parser = (buffer: Buffer, ctx: ParserContext) => Promise<ParseResult>;
