import "server-only";

import { eq, inArray } from "drizzle-orm";
import type OpenAI from "openai";

import { db } from "@/db";
import { auditInputs, inputDocuments } from "@/db/schema";
import type { ToolCallRecord } from "@/db/schema";

/**
 * The model's hands.
 *
 * This is the line the PRD draws (§6.3): the model decides *what* to investigate and *what
 * matters*; this code does the arithmetic and the data access. That split is what stops the
 * platform becoming a rule engine while still keeping the numbers right — a model that
 * eyeballs a 5,000-row ledger will misadd it, so it never has to. Every call is recorded and
 * stored on the revision (PRD §22.9), which is also what makes a finding auditable.
 *
 * Nothing here decides anything: no thresholds, no "suspicious" flags, no materiality. These
 * are filters, aggregations and arithmetic — the same tools a human auditor's spreadsheet
 * gives them.
 */

export type ToolContext = {
  auditId: string;
  workspaceId: string;
};

type DocumentRow = typeof inputDocuments.$inferSelect;

const MAX_ROWS_RETURNED = 200;

/**
 * The parser prepends a reserved `__row` column holding the row number as a human sees it in
 * the original file — after any title preamble, header detection and truncation. Citing the
 * array index instead would point auditors at the wrong row, so every row number surfaced to
 * the model comes from here.
 */
function sourceRow(cells: unknown[], fallback: number): number {
  const value = Number(cells[0]);
  return Number.isFinite(value) ? value : fallback;
}

export const AUDIT_TOOLS: OpenAI.Responses.Tool[] = [
  {
    type: "function",
    name: "list_inputs",
    description:
      "List every input attached to this audit and the parsed documents inside each one, with " +
      "their ids, row counts and column names. Call this first — you need the ids to read anything.",
    strict: true,
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "read_document",
    description:
      "Read rows from one parsed document (a spreadsheet sheet, a PDF page, a CSV, a table). Each row " +
      "carries `row`: the REAL row number in the original file (accounting for any title rows above the " +
      "header). Cite that number as evidence — never a positional index. The first cell of every row is " +
      "that same row number. rowFrom/rowTo are source row numbers and page through the document.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        documentId: { type: "string" },
        rowFrom: { type: ["integer", "null"], description: "1-based; defaults to the first row." },
        rowTo: { type: ["integer", "null"], description: `Inclusive. At most ${MAX_ROWS_RETURNED} rows per call.` },
      },
      required: ["documentId", "rowFrom", "rowTo"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "query_table",
    description:
      "Filter, group and aggregate a parsed table without reading every row. This is how you get " +
      "correct totals over large data — do not add up rows yourself. Returns aggregated results plus " +
      "the source row numbers behind each group so the answer stays citable.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        documentId: { type: "string" },
        where: {
          type: ["array", "null"],
          description: "Conditions ANDed together.",
          items: {
            type: "object",
            properties: {
              column: { type: "string" },
              op: {
                type: "string",
                enum: ["eq", "neq", "gt", "gte", "lt", "lte", "contains", "not_contains", "is_empty", "is_not_empty", "in"],
              },
              value: { type: ["string", "number", "boolean", "null"] },
              values: { type: ["array", "null"], items: { type: "string" } },
            },
            required: ["column", "op", "value", "values"],
            additionalProperties: false,
          },
        },
        groupBy: { type: ["array", "null"], items: { type: "string" } },
        aggregate: {
          type: ["array", "null"],
          items: {
            type: "object",
            properties: {
              column: { type: "string" },
              fn: { type: "string", enum: ["sum", "avg", "min", "max", "count", "count_distinct"] },
              as: { type: "string" },
            },
            required: ["column", "fn", "as"],
            additionalProperties: false,
          },
        },
        orderBy: { type: ["string", "null"] },
        direction: { type: ["string", "null"], enum: ["asc", "desc", null] },
        limit: { type: ["integer", "null"] },
      },
      required: ["documentId", "where", "groupBy", "aggregate", "orderBy", "direction", "limit"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "compute",
    description:
      "Evaluate arithmetic and simple statistics over numbers you supply. Use this for every " +
      "calculation you report — variances, percentages, ratios, totals — rather than doing mental " +
      "arithmetic, which is where numerical errors come from.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        op: {
          type: "string",
          enum: ["sum", "subtract", "multiply", "divide", "mean", "median", "min", "max", "stdev", "percent_change", "percent_of"],
        },
        values: { type: "array", items: { type: "number" } },
        note: { type: ["string", "null"], description: "What this computes; echoed back for the log." },
      },
      required: ["op", "values", "note"],
      additionalProperties: false,
    },
  },
  {
    type: "function",
    name: "search_evidence",
    description:
      "Full-text search across all parsed text and table cells in this audit. Use it to find where a " +
      "term, account, name or amount appears. Returns matches with their document id and row number.",
    strict: true,
    parameters: {
      type: "object",
      properties: {
        query: { type: "string" },
        limit: { type: ["integer", "null"] },
      },
      required: ["query", "limit"],
      additionalProperties: false,
    },
  },
];

async function loadDocuments(auditId: string): Promise<{ doc: DocumentRow; inputName: string }[]> {
  const inputs = await db
    .select({ id: auditInputs.id, name: auditInputs.name })
    .from(auditInputs)
    .where(eq(auditInputs.auditId, auditId));
  if (inputs.length === 0) return [];

  const docs = await db
    .select()
    .from(inputDocuments)
    .where(
      inArray(
        inputDocuments.inputId,
        inputs.map((i) => i.id),
      ),
    );

  const nameById = new Map(inputs.map((i) => [i.id, i.name]));
  return docs.map((doc) => ({ doc, inputName: nameById.get(doc.inputId) ?? "unknown" }));
}

function columnIndex(doc: DocumentRow, column: string): number {
  const cols = doc.columns;
  const exact = cols.findIndex((c) => c.key === column || c.label === column);
  if (exact !== -1) return exact;
  const lowered = column.trim().toLowerCase();
  return cols.findIndex(
    (c) => c.key.toLowerCase() === lowered || c.label.toLowerCase() === lowered,
  );
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    // Accounting exports are full of "1,234.50", "(500)" for negatives, and currency symbols.
    const cleaned = value.replace(/[,\s$£€]/g, "").replace(/^\((.*)\)$/, "-$1");
    if (cleaned === "" ) return null;
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

type Condition = {
  column: string;
  op: string;
  value?: string | number | boolean | null;
  values?: string[] | null;
};

function matches(row: unknown[], doc: DocumentRow, condition: Condition): boolean {
  const idx = columnIndex(doc, condition.column);
  if (idx === -1) return false;
  const cell = row[idx];
  const text = cell === null || cell === undefined ? "" : String(cell);
  const num = toNumber(cell);
  const target = condition.value;
  const targetNum = toNumber(target ?? null);

  switch (condition.op) {
    case "eq":
      return targetNum !== null && num !== null ? num === targetNum : text === String(target ?? "");
    case "neq":
      return targetNum !== null && num !== null ? num !== targetNum : text !== String(target ?? "");
    case "gt":
      return num !== null && targetNum !== null && num > targetNum;
    case "gte":
      return num !== null && targetNum !== null && num >= targetNum;
    case "lt":
      return num !== null && targetNum !== null && num < targetNum;
    case "lte":
      return num !== null && targetNum !== null && num <= targetNum;
    case "contains":
      return text.toLowerCase().includes(String(target ?? "").toLowerCase());
    case "not_contains":
      return !text.toLowerCase().includes(String(target ?? "").toLowerCase());
    case "is_empty":
      return text.trim() === "";
    case "is_not_empty":
      return text.trim() !== "";
    case "in":
      return (condition.values ?? []).some((v) => v.toLowerCase() === text.toLowerCase());
    default:
      return false;
  }
}

function aggregateValues(fn: string, values: number[], raw: unknown[]): number | null {
  switch (fn) {
    case "count":
      return raw.length;
    case "count_distinct":
      return new Set(raw.map((v) => String(v))).size;
    case "sum":
      return values.reduce((a, b) => a + b, 0);
    case "avg":
      return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
    case "min":
      return values.length ? Math.min(...values) : null;
    case "max":
      return values.length ? Math.max(...values) : null;
    default:
      return null;
  }
}

function round(n: number): number {
  // Float noise in a financial figure reads as a bug even when the maths is right.
  return Math.round(n * 1e6) / 1e6;
}

function compute(op: string, values: number[]): number | null {
  const sum = (v: number[]) => v.reduce((a, b) => a + b, 0);
  switch (op) {
    case "sum":
      return sum(values);
    case "subtract":
      return values.slice(1).reduce((a, b) => a - b, values[0] ?? 0);
    case "multiply":
      return values.reduce((a, b) => a * b, 1);
    case "divide":
      if (values.length < 2 || values[1] === 0) return null;
      return values[0] / values[1];
    case "mean":
      return values.length ? sum(values) / values.length : null;
    case "median": {
      if (!values.length) return null;
      const s = [...values].sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
    }
    case "min":
      return values.length ? Math.min(...values) : null;
    case "max":
      return values.length ? Math.max(...values) : null;
    case "stdev": {
      if (values.length < 2) return null;
      const m = sum(values) / values.length;
      return Math.sqrt(sum(values.map((v) => (v - m) ** 2)) / (values.length - 1));
    }
    case "percent_change":
      if (values.length < 2 || values[0] === 0) return null;
      return ((values[1] - values[0]) / Math.abs(values[0])) * 100;
    case "percent_of":
      if (values.length < 2 || values[1] === 0) return null;
      return (values[0] / values[1]) * 100;
    default:
      return null;
  }
}

/** Runs one tool call and returns a JSON-serialisable result for the model. */
export async function runTool(
  name: string,
  args: Record<string, unknown>,
  ctx: ToolContext,
): Promise<unknown> {
  switch (name) {
    case "list_inputs": {
      const docs = await loadDocuments(ctx.auditId);
      const inputs = await db
        .select()
        .from(auditInputs)
        .where(eq(auditInputs.auditId, ctx.auditId));

      return {
        inputs: inputs.map((input) => ({
          inputId: input.id,
          name: input.name,
          kind: input.kind,
          status: input.status,
          warnings: input.warnings,
          detected: input.detected,
          textContent:
            input.kind === "text" ? (input.textContent ?? "").slice(0, 20_000) : undefined,
          documents: docs
            .filter((d) => d.doc.inputId === input.id)
            .map(({ doc }) => ({
              documentId: doc.id,
              kind: doc.kind,
              name: doc.name,
              sheet: doc.sheetName,
              page: doc.pageNumber,
              rowCount: doc.rowCount,
              truncated: doc.truncated,
              columns: doc.columns.map((c) => c.label),
              summary: doc.summary,
            })),
        })),
      };
    }

    case "read_document": {
      const documentId = String(args.documentId);
      const [doc] = await db
        .select()
        .from(inputDocuments)
        .where(eq(inputDocuments.id, documentId))
        .limit(1);
      if (!doc || doc.workspaceId !== ctx.workspaceId) {
        return { error: `Document ${documentId} not found in this audit.` };
      }

      if (doc.kind === "text" || doc.kind === "page") {
        return {
          documentId,
          kind: doc.kind,
          name: doc.name,
          page: doc.pageNumber,
          text: (doc.textContent ?? "").slice(0, 50_000),
        };
      }

      // rowFrom/rowTo are source row numbers, so select by the `__row` value rather than by
      // array position — the two differ whenever a file has a title preamble.
      const requestedFrom = args.rowFrom === null ? null : Number(args.rowFrom);
      const requestedTo = args.rowTo === null ? null : Number(args.rowTo);

      const all = doc.rows.map((cells, i) => ({ row: sourceRow(cells, i + 1), cells }));
      const selected = all
        .filter((r) => (requestedFrom === null || r.row >= requestedFrom) && (requestedTo === null || r.row <= requestedTo))
        .slice(0, MAX_ROWS_RETURNED);

      return {
        documentId,
        name: doc.name,
        sheet: doc.sheetName,
        columns: doc.columns.map((c) => c.label),
        rowFrom: selected[0]?.row ?? null,
        rowTo: selected[selected.length - 1]?.row ?? null,
        totalRows: doc.rows.length,
        returnedRows: selected.length,
        truncated: doc.truncated,
        note:
          selected.length === MAX_ROWS_RETURNED
            ? `Capped at ${MAX_ROWS_RETURNED} rows. Call again with a higher rowFrom to continue.`
            : null,
        rows: selected,
      };
    }

    case "query_table": {
      const documentId = String(args.documentId);
      const [doc] = await db
        .select()
        .from(inputDocuments)
        .where(eq(inputDocuments.id, documentId))
        .limit(1);
      if (!doc || doc.workspaceId !== ctx.workspaceId) {
        return { error: `Document ${documentId} not found in this audit.` };
      }

      const conditions = (args.where as Condition[] | null) ?? [];
      const unknownColumn = conditions.find((c) => columnIndex(doc, c.column) === -1);
      if (unknownColumn) {
        return {
          error: `Unknown column "${unknownColumn.column}".`,
          availableColumns: doc.columns.map((c) => c.label),
        };
      }

      const indexed = doc.rows
        .map((cells, i) => ({ row: sourceRow(cells, i + 1), cells }))
        .filter((r) => conditions.every((c) => matches(r.cells, doc, c)));

      const groupBy = (args.groupBy as string[] | null) ?? [];
      const aggregates =
        (args.aggregate as { column: string; fn: string; as: string }[] | null) ?? [];
      const limit = Math.min(Number(args.limit ?? 100), 500);

      if (groupBy.length === 0 && aggregates.length === 0) {
        return {
          documentId,
          matchedRows: indexed.length,
          columns: doc.columns.map((c) => c.label),
          rows: indexed.slice(0, limit).map((r) => ({ row: r.row, cells: r.cells })),
        };
      }

      const groupIdx = groupBy.map((g) => columnIndex(doc, g));
      if (groupIdx.some((i) => i === -1)) {
        return {
          error: "Unknown groupBy column.",
          availableColumns: doc.columns.map((c) => c.label),
        };
      }

      const groups = new Map<string, { key: string[]; rows: typeof indexed }>();
      for (const r of indexed) {
        const key = groupIdx.map((i) => String(r.cells[i] ?? ""));
        const id = key.join(" ");
        const existing = groups.get(id);
        if (existing) existing.rows.push(r);
        else groups.set(id, { key, rows: [r] });
      }

      const entries = groups.size > 0 ? [...groups.values()] : [{ key: [], rows: indexed }];

      let results = entries.map((group) => {
        const out: Record<string, unknown> = {};
        groupBy.forEach((g, i) => (out[g] = group.key[i]));
        for (const agg of aggregates) {
          const idx = columnIndex(doc, agg.column);
          const raw = idx === -1 ? [] : group.rows.map((r) => r.cells[idx]);
          const nums = raw.map(toNumber).filter((n): n is number => n !== null);
          const value = aggregateValues(agg.fn, nums, raw);
          out[agg.as] = value === null ? null : round(value);
        }
        out.rowCount = group.rows.length;
        // Carrying the source rows is what keeps an aggregate citable rather than a bare number.
        out.sourceRows = group.rows.slice(0, 25).map((r) => r.row);
        return out;
      });

      const orderBy = args.orderBy as string | null;
      if (orderBy) {
        const dir = args.direction === "asc" ? 1 : -1;
        results = results.sort((a, b) => {
          const av = a[orderBy];
          const bv = b[orderBy];
          const an = typeof av === "number" ? av : Number(av);
          const bn = typeof bv === "number" ? bv : Number(bv);
          if (Number.isFinite(an) && Number.isFinite(bn)) return (an - bn) * dir;
          return String(av ?? "").localeCompare(String(bv ?? "")) * dir;
        });
      }

      return {
        documentId,
        matchedRows: indexed.length,
        totalRows: doc.rows.length,
        groups: results.slice(0, limit),
      };
    }

    case "compute": {
      const op = String(args.op);
      const values = (args.values as number[]) ?? [];
      const result = compute(op, values);
      return {
        op,
        values,
        note: args.note ?? null,
        result: result === null ? null : round(result),
        error: result === null ? "Undefined for these inputs (e.g. divide by zero, empty set)." : null,
      };
    }

    case "search_evidence": {
      const query = String(args.query ?? "").trim().toLowerCase();
      if (!query) return { matches: [] };
      const limit = Math.min(Number(args.limit ?? 50), 200);
      const docs = await loadDocuments(ctx.auditId);
      const out: unknown[] = [];

      for (const { doc, inputName } of docs) {
        if (doc.textContent && doc.textContent.toLowerCase().includes(query)) {
          const at = doc.textContent.toLowerCase().indexOf(query);
          out.push({
            documentId: doc.id,
            inputId: doc.inputId,
            inputName,
            kind: doc.kind,
            page: doc.pageNumber,
            excerpt: doc.textContent.slice(Math.max(0, at - 120), at + 160),
          });
          if (out.length >= limit) break;
        }
        for (let i = 0; i < doc.rows.length && out.length < limit; i++) {
          const cells = doc.rows[i];
          // Skip cell 0: it is the row number, and matching a search term against it would
          // return rows whose only connection to the query is a coincidental digit.
          const hit = cells.slice(1).some((c) => String(c ?? "").toLowerCase().includes(query));
          if (!hit) continue;
          out.push({
            documentId: doc.id,
            inputId: doc.inputId,
            inputName,
            sheet: doc.sheetName,
            row: sourceRow(cells, i + 1),
            columns: doc.columns.map((c) => c.label),
            cells,
          });
        }
        if (out.length >= limit) break;
      }

      return { query, matchCount: out.length, matches: out };
    }

    default:
      return { error: `Unknown tool: ${name}` };
  }
}

/** Executes a tool call, timing it and shaping the record stored on the revision. */
export async function executeToolCall(
  name: string,
  rawArguments: string,
  ctx: ToolContext,
): Promise<{ result: unknown; record: ToolCallRecord }> {
  const started = Date.now();
  let args: Record<string, unknown> = {};
  try {
    args = JSON.parse(rawArguments || "{}");
  } catch {
    const record: ToolCallRecord = {
      name,
      arguments: rawArguments,
      result: { error: "Arguments were not valid JSON." },
      ok: false,
      ms: 0,
    };
    return { result: record.result, record };
  }

  try {
    const result = await runTool(name, args, ctx);
    const ok = !(result && typeof result === "object" && "error" in result);
    return {
      result,
      record: { name, arguments: args, result, ok, ms: Date.now() - started },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const result = { error: message };
    return {
      result,
      record: { name, arguments: args, result, ok: false, ms: Date.now() - started },
    };
  }
}
