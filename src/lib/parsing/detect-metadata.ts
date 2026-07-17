/**
 * Metadata detection for the "Review inputs" step (PRD §8.6): detected
 * accounting periods, currencies and entities, shown to a user before they
 * start an audit.
 *
 * ── Scope, deliberately narrow ───────────────────────────────────────────────
 * This is **presentation metadata, not audit logic.** Nothing here may decide
 * anything about findings. It exists so the review screen can say "this looks
 * like FY2024 in EUR" and let a human correct it.
 *
 * Because of that, every heuristic here is biased towards silence: a field is
 * omitted unless the evidence for it is explicit. Returning nothing is a
 * correct answer that a user can fix in one click; returning a wrong period is
 * a claim they may not think to check. We never infer a currency from a bare
 * "$", never guess an entity from a filename, and never widen a period beyond
 * dates we actually read.
 */

import type { DetectedMetadata } from "@/db/schema";

import { isIsoDateString } from "./table";
import { SOURCE_ROW_KEY, type ParsedDocument } from "./types";

/** ISO 4217 codes common in accounting exports. Deliberately not exhaustive. */
const CURRENCY_CODES = new Set([
  "AED", "ARS", "AUD", "BGN", "BHD", "BRL", "CAD", "CHF", "CLP", "CNY", "COP", "CZK", "DKK", "EGP",
  "EUR", "GBP", "HKD", "HRK", "HUF", "IDR", "ILS", "INR", "ISK", "JPY", "KES", "KRW", "KWD", "MAD",
  "MXN", "MYR", "NGN", "NOK", "NZD", "PHP", "PKR", "PLN", "QAR", "RON", "RSD", "RUB", "SAR", "SEK",
  "SGD", "THB", "TRY", "TWD", "UAH", "USD", "VND", "ZAR",
]);

/** Column labels whose *values* are currency codes. */
const CURRENCY_COLUMN_RE = /\b(currency|currency[_ ]?code|ccy|curr)\b/i;

/** Column labels whose values name the reporting entity. */
const ENTITY_COLUMN_RE =
  /\b(entity|entity[_ ]?name|legal[_ ]?entity|company|company[_ ]?name|subsidiary|business[_ ]?unit|organisation|organization)\b/i;

/** Column labels that carry a transaction/posting date. */
const DATE_COLUMN_RE =
  /\b(date|posting[_ ]?date|transaction[_ ]?date|entry[_ ]?date|document[_ ]?date|invoice[_ ]?date|value[_ ]?date|period[_ ]?end|effective[_ ]?date|booked[_ ]?at)\b/i;

const MAX_ENTITIES = 20;
/** Above this, an "entity" column is a dimension, not a list of audited entities. */
const MAX_DISTINCT_ENTITIES = 50;

function isTableDocument(document: ParsedDocument): boolean {
  return document.columns.length > 1 && document.rows.length > 0;
}

/** Column index into `rows[i]`, accounting for the reserved row-number column. */
function columnIndex(document: ParsedDocument, predicate: (label: string) => boolean): number {
  for (let i = 0; i < document.columns.length; i++) {
    const column = document.columns[i];
    if (!column || column.key === SOURCE_ROW_KEY) continue;
    if (predicate(column.label)) return i;
  }
  return -1;
}

// ─────────────────────────────────────────────────────────────────────────────
// Currencies
// ─────────────────────────────────────────────────────────────────────────────

function detectCurrencies(documents: ParsedDocument[]): string[] {
  const found = new Set<string>();

  for (const document of documents) {
    if (!isTableDocument(document)) continue;

    // 1. A column that *is* a currency column — its values are the answer.
    const index = columnIndex(document, (label) => CURRENCY_COLUMN_RE.test(label));
    if (index >= 0) {
      for (const row of document.rows) {
        const value = row[index];
        if (typeof value !== "string") continue;
        const code = value.trim().toUpperCase();
        if (CURRENCY_CODES.has(code)) found.add(code);
      }
    }

    // 2. A code embedded in a column label, e.g. "Amount (USD)" or "Debit EUR".
    //    Only whole-token matches, so "Sales" never yields anything.
    for (const column of document.columns) {
      if (column.key === SOURCE_ROW_KEY) continue;
      for (const token of column.label.toUpperCase().split(/[^A-Z]+/)) {
        if (token.length === 3 && CURRENCY_CODES.has(token)) found.add(token);
      }
    }
  }

  // Symbols ($, €, £) are intentionally ignored: "$" is at least a dozen
  // different currencies and guessing USD would be a fabrication.
  return [...found].sort();
}

// ─────────────────────────────────────────────────────────────────────────────
// Periods
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parsers emit zoneless ISO for spreadsheet dates ("2024-01-15T13:45:30"),
 * because an Excel serial has no timezone. `new Date()` would read those as
 * *local* time and `toISOString()` would then shift the day — the same class of
 * bug the spreadsheet parser avoids. Pin zoneless values to UTC so a detected
 * period is the same on every machine.
 */
function toDate(value: unknown): Date | undefined {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? undefined : value;
  if (!isIsoDateString(value)) return undefined;
  const text = value.trim();
  const zoned = /(?:Z|[+-]\d{2}:?\d{2})$/.test(text);
  const normalised = zoned ? text : `${text.includes("T") ? text : `${text}T00:00:00`}Z`;
  const date = new Date(normalised);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Only ISO dates already sitting in a date-named column count. Free-text period
 * descriptions ("year ended 31 December") are left to the user, and a bare
 * number is never treated as a date — an Excel serial that the spreadsheet
 * parser did not recognise as a date is not evidence that it is one.
 */
function detectPeriods(documents: ParsedDocument[]): DetectedMetadata["periods"] {
  const periods: { start?: string; end?: string; label?: string }[] = [];

  for (const document of documents) {
    if (!isTableDocument(document)) continue;

    const index = columnIndex(document, (label) => DATE_COLUMN_RE.test(label));
    if (index < 0) continue;

    let min: Date | undefined;
    let max: Date | undefined;
    let count = 0;

    for (const row of document.rows) {
      const date = toDate(row[index]);
      if (!date) continue;
      count++;
      if (!min || date < min) min = date;
      if (!max || date > max) max = date;
    }

    // A handful of parseable dates in a long column means the column is not
    // really a date column; say nothing rather than report a bogus range.
    if (!min || !max || count < 3 || count / document.rows.length < 0.5) continue;

    const label = document.columns[index]?.label ?? "date";
    periods.push({
      start: isoDay(min),
      end: isoDay(max),
      label: `${document.name} — ${label} ${isoDay(min)} to ${isoDay(max)}`,
    });
  }

  // Deduplicate identical ranges across sheets.
  const seen = new Set<string>();
  return periods.filter((period) => {
    const key = `${period.start}|${period.end}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Entities
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Entities are only read from a column that says it holds entities. Guessing a
 * company name out of free text is exactly the kind of confident-but-wrong
 * output this step exists to avoid.
 */
function detectEntities(documents: ParsedDocument[]): string[] {
  const found = new Set<string>();

  for (const document of documents) {
    if (!isTableDocument(document)) continue;

    const index = columnIndex(document, (label) => ENTITY_COLUMN_RE.test(label));
    if (index < 0) continue;

    const values = new Set<string>();
    for (const row of document.rows) {
      const value = row[index];
      if (typeof value !== "string") continue;
      const trimmed = value.trim();
      if (trimmed.length === 0 || trimmed.length > 120) continue;
      values.add(trimmed);
      if (values.size > MAX_DISTINCT_ENTITIES) break;
    }

    // Hundreds of distinct values means this is a customer/vendor dimension, not
    // the audited entity list.
    if (values.size === 0 || values.size > MAX_DISTINCT_ENTITIES) continue;
    for (const value of values) found.add(value);
  }

  return [...found].sort().slice(0, MAX_ENTITIES);
}

// ─────────────────────────────────────────────────────────────────────────────

function countRows(documents: ParsedDocument[]): number {
  return documents.reduce((total, document) => {
    // The reserved row-number column means a table always has >1 columns.
    return total + (document.columns.length > 1 ? document.rows.length : 0);
  }, 0);
}

/**
 * Infer review-screen metadata from parsed documents.
 *
 * Returns only what the documents actually say. Every field is optional and is
 * omitted — not defaulted, not guessed — when the evidence is not there.
 * `freshness` is never set here: it depends on a clock and on where the data
 * came from, neither of which this pure module knows about.
 */
export function detectMetadata(documents: ParsedDocument[]): DetectedMetadata {
  const detected: DetectedMetadata = {};

  const currencies = detectCurrencies(documents);
  if (currencies.length > 0) detected.currencies = currencies;

  const periods = detectPeriods(documents);
  if (periods && periods.length > 0) detected.periods = periods;

  const entities = detectEntities(documents);
  if (entities.length > 0) detected.entities = entities;

  const rowCount = countRows(documents);
  if (rowCount > 0) detected.rowCount = rowCount;

  return detected;
}

/** Merge metadata from several parses (e.g. zip entries) without inventing anything. */
export function mergeDetected(parts: DetectedMetadata[]): DetectedMetadata {
  const merged: DetectedMetadata = {};

  const currencies = new Set(parts.flatMap((p) => p.currencies ?? []));
  if (currencies.size > 0) merged.currencies = [...currencies].sort();

  const entities = new Set(parts.flatMap((p) => p.entities ?? []));
  if (entities.size > 0) merged.entities = [...entities].sort().slice(0, MAX_ENTITIES);

  const periods = parts.flatMap((p) => p.periods ?? []);
  if (periods.length > 0) {
    const seen = new Set<string>();
    merged.periods = periods.filter((period) => {
      const key = `${period.start}|${period.end}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  const rowCount = parts.reduce((total, p) => total + (p.rowCount ?? 0), 0);
  if (rowCount > 0) merged.rowCount = rowCount;

  const freshness = parts.find((p) => p.freshness !== undefined)?.freshness;
  if (freshness !== undefined) merged.freshness = freshness;

  return merged;
}
