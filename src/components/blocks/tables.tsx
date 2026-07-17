import {
  RiAlertLine,
  RiCheckboxCircleLine,
  RiErrorWarningLine,
  RiFlagLine,
} from "@remixicon/react";
import type { ReactNode } from "react";

import {
  BlockShell,
  ClaimBadge,
  EvidenceChips,
  MissingEvidenceNote,
  SeverityBadge,
  formatMoney,
  formatValue,
} from "@/components/blocks/shared";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { EvidenceInput } from "@/lib/ai/blocks/primitives";
import type { BlockOf } from "@/lib/ai/blocks/schemas";
import type { ClaimType } from "@/lib/ai/blocks/types";
import { cn } from "@/lib/utils";

/**
 * The six tabular block renderers (PRD §18.2).
 *
 * These blocks are where the numbers live, so three rules are enforced by the shared frame below
 * rather than left to each renderer:
 *
 *  - **A guess never looks like a fact** (PRD §10.5, §31): anything that is not
 *    `evidence_supported` gets a dashed frame and an explicit caution line above the data.
 *  - **Severity is never colour alone** (PRD §26.4): every flag, dispute and out-of-balance state
 *    carries an icon and a word, not just a tint.
 *  - **No raw floats**: every number goes through the shared Intl formatters.
 */

/* -------------------------------------------------------------------------- */
/* Local types derived from the schemas                                       */
/* -------------------------------------------------------------------------- */

type TableData = BlockOf<"table">["data"];
type TableColumn = TableData["columns"][number];
type TableCellValue = TableData["rows"][number][number];
type CellFormat = TableColumn["format"];
type ColumnAlign = TableColumn["align"];

type TransactionFlag = BlockOf<"transaction_table">["flaggedRows"][number]["flag"];
type ReconcilingItem = BlockOf<"reconciliation_table">["reconcilingItems"][number];
type AgingBucket = BlockOf<"aging_table">["buckets"][number];

/** The base every block carries. Kept structural so all six variants satisfy it. */
type BlockBase = {
  title: string;
  evidence: EvidenceInput[];
  claimType: ClaimType;
  commentary: string | null;
};

/* -------------------------------------------------------------------------- */
/* Shared frame                                                               */
/* -------------------------------------------------------------------------- */

/**
 * The caution shown above the data whenever the block is not evidence-supported. An auditor must
 * be able to tell, without hovering anything, that they are looking at a lead rather than a fact.
 */
const CLAIM_CAUTION: Record<ClaimType, string | null> = {
  evidence_supported: null,
  reasonable_interpretation:
    "Interpretation — these figures read beyond what the cited sources state directly.",
  unverified_hypothesis:
    "Unverified hypothesis — treat the figures below as a lead to test, not as a finding.",
  missing_information:
    "Incomplete — some evidence needed to support these figures was not available.",
  user_claim: "Stated by a user and not independently corroborated against source data.",
  judgment_required:
    "Judgment required — a qualified professional must decide before these figures are relied on.",
};

function ClaimCaution({ claimType }: { claimType: ClaimType }) {
  const caution = CLAIM_CAUTION[claimType];
  if (caution === null) return null;

  const unproven =
    claimType === "unverified_hypothesis" ||
    claimType === "missing_information" ||
    claimType === "judgment_required";

  return (
    <p
      className={cn(
        "mb-3 flex items-start gap-2 rounded-lg border px-3 py-2 text-xs",
        unproven
          ? "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200"
          : "border-border bg-muted/50 text-muted-foreground",
      )}
    >
      <RiAlertLine className="mt-px size-3.5 shrink-0" aria-hidden />
      <span>{caution}</span>
    </p>
  );
}

function MetaList({ items }: { items: { label: string; value: ReactNode }[] }) {
  if (items.length === 0) return null;
  return (
    <dl className="mb-3 flex flex-wrap gap-x-6 gap-y-1.5 text-xs">
      {items.map((item) => (
        <div key={item.label} className="flex items-baseline gap-1.5">
          <dt className="text-muted-foreground">{item.label}</dt>
          <dd className="font-medium text-foreground tabular-nums">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/**
 * Consistent chrome for every table block: title, claim honesty, meta strip, the data itself,
 * commentary and the citation footer — in that order, every time.
 */
function TableBlockFrame({
  block,
  meta,
  children,
}: {
  block: BlockBase;
  meta?: { label: string; value: ReactNode }[];
  children: ReactNode;
}) {
  const unsupported = block.claimType !== "evidence_supported";

  return (
    <BlockShell
      title={block.title}
      claim={<ClaimBadge claimType={block.claimType} />}
      className={cn(unsupported && "border-dashed")}
    >
      <ClaimCaution claimType={block.claimType} />
      {meta ? <MetaList items={meta} /> : null}
      {children}
      {block.commentary ? (
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{block.commentary}</p>
      ) : null}
      <footer className="mt-4 border-t border-border pt-3">
        {block.evidence.length > 0 ? (
          <EvidenceChips evidence={block.evidence} />
        ) : (
          <MissingEvidenceNote />
        )}
      </footer>
    </BlockShell>
  );
}

/* -------------------------------------------------------------------------- */
/* Cell helpers                                                               */
/* -------------------------------------------------------------------------- */

const NUMERIC_FORMATS: ReadonlySet<string> = new Set(["number", "currency", "percent"]);

function isNumericFormat(format: CellFormat): boolean {
  return format !== null && NUMERIC_FORMATS.has(format);
}

function alignClass(align: ColumnAlign, format: CellFormat): string {
  const resolved = align ?? (isNumericFormat(format) ? "right" : "left");
  if (resolved === "right") return "text-right";
  if (resolved === "center") return "text-center";
  return "text-left";
}

function cellClass(column: TableColumn): string {
  return cn(
    alignClass(column.align, column.format),
    isNumericFormat(column.format) && "tabular-nums",
  );
}

function renderCell(value: TableCellValue, format: CellFormat, currency?: string): string {
  return formatValue(value, format, currency);
}

/** `—` alone reads as an em dash to a screen reader; the reason travels with it. */
function NoData({ reason = "No data" }: { reason?: string }) {
  return (
    <>
      <span aria-hidden>—</span>
      <span className="sr-only">{reason}</span>
    </>
  );
}

function humanize(value: string): string {
  const spaced = value.replace(/_/g, " ");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

/** A non-colour marker: icon plus a word, always. */
function Marker({
  icon: Icon,
  children,
  tone = "neutral",
}: {
  icon: typeof RiFlagLine;
  children: ReactNode;
  tone?: "neutral" | "warn" | "good" | "bad";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium whitespace-nowrap",
        tone === "neutral" && "border-border bg-muted text-muted-foreground",
        tone === "warn" &&
          "border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200",
        tone === "good" &&
          "border-emerald-600/40 bg-emerald-600/10 text-emerald-800 dark:text-emerald-200",
        tone === "bad" && "border-destructive/40 bg-destructive/10 text-destructive",
      )}
    >
      <Icon className="size-3 shrink-0" aria-hidden />
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. table                                                                   */
/* -------------------------------------------------------------------------- */

export function TableBlock({ block }: { block: BlockOf<"table"> }) {
  const { data, sortedBy, emphasisRowIndexes, truncated, fullRowCount } = block;
  const emphasis = new Set(emphasisRowIndexes);
  const sortedColumn = sortedBy ? data.columns.find((c) => c.key === sortedBy) : undefined;

  const meta: { label: string; value: ReactNode }[] = [];
  if (sortedBy) meta.push({ label: "Sorted by", value: sortedColumn?.label ?? sortedBy });
  meta.push({
    label: "Rows",
    value:
      truncated && fullRowCount !== null
        ? `${formatValue(data.rows.length, "number")} of ${formatValue(fullRowCount, "number")}`
        : formatValue(data.rows.length, "number"),
  });
  if (emphasis.size > 0) {
    meta.push({ label: "Highlighted", value: formatValue(emphasis.size, "number") });
  }

  return (
    <TableBlockFrame block={block} meta={meta}>
      {truncated ? (
        <p className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <RiAlertLine className="size-3.5 shrink-0" aria-hidden />
          Truncated extract
          {fullRowCount !== null
            ? ` — ${formatValue(data.rows.length, "number")} of ${formatValue(fullRowCount, "number")} rows shown.`
            : " — a subset of a larger result set is shown."}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              {data.columns.map((column) => (
                <TableHead
                  key={column.key}
                  scope="col"
                  className={cn("text-xs", alignClass(column.align, column.format))}
                  aria-sort={column.key === sortedBy ? "other" : undefined}
                >
                  {column.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={data.columns.length}
                  className="py-6 text-center text-sm text-muted-foreground"
                >
                  No rows returned by this procedure.
                </TableCell>
              </TableRow>
            ) : (
              data.rows.map((row, rowIndex) => {
                const highlighted = emphasis.has(rowIndex);
                return (
                  <TableRow
                    key={rowIndex}
                    className={cn(highlighted && "bg-accent/50 font-medium")}
                  >
                    {data.columns.map((column, colIndex) => (
                      <TableCell key={column.key} className={cn("text-sm", cellClass(column))}>
                        {highlighted && colIndex === 0 ? (
                          <span className="sr-only">Highlighted row. </span>
                        ) : null}
                        {renderCell(row[colIndex] ?? null, column.format)}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
          {data.totalRow ? (
            <TableFooter>
              <TableRow>
                {data.columns.map((column, colIndex) => (
                  <TableCell key={column.key} className={cn("text-sm", cellClass(column))}>
                    {renderCell(data.totalRow?.[colIndex] ?? null, column.format)}
                  </TableCell>
                ))}
              </TableRow>
            </TableFooter>
          ) : null}
        </Table>
      </div>

      {data.note ? <p className="mt-2 text-xs text-muted-foreground">{data.note}</p> : null}
    </TableBlockFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. pivot_table                                                             */
/* -------------------------------------------------------------------------- */

export function PivotTableBlock({ block }: { block: BlockOf<"pivot_table"> }) {
  const {
    rowDimension,
    columnDimension,
    measureLabel,
    aggregation,
    valueFormat,
    currency,
    rowHeaders,
    columnHeaders,
    cells,
    rowTotals,
    columnTotals,
    grandTotal,
  } = block;

  const cur = currency ?? undefined;
  const showRowTotals = rowTotals !== null;
  const showFooter = columnTotals !== null || grandTotal !== null;
  const spannedColumns = columnHeaders.length + (showRowTotals ? 1 : 0);

  return (
    <TableBlockFrame
      block={block}
      meta={[
        { label: "Measure", value: measureLabel },
        { label: "Aggregation", value: humanize(aggregation) },
        { label: "Rows", value: rowDimension },
        { label: "Columns", value: columnDimension },
        ...(currency ? [{ label: "Currency", value: currency }] : []),
      ]}
    >
      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <caption className="sr-only">
            {`${measureLabel} (${aggregation}) by ${rowDimension} and ${columnDimension}.`}
          </caption>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead scope="col" className="text-xs">
                {rowDimension}
              </TableHead>
              <TableHead
                scope="colgroup"
                colSpan={spannedColumns}
                className="border-l border-border text-center text-xs text-muted-foreground"
              >
                {columnDimension}
              </TableHead>
            </TableRow>
            <TableRow className="bg-muted/40">
              <TableHead scope="col" className="text-xs">
                <span className="sr-only">{rowDimension}</span>
              </TableHead>
              {columnHeaders.map((header) => (
                <TableHead key={header} scope="col" className="text-right text-xs">
                  {header}
                </TableHead>
              ))}
              {showRowTotals ? (
                <TableHead scope="col" className="border-l border-border text-right text-xs">
                  Total
                </TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rowHeaders.map((header, rowIndex) => (
              <TableRow key={header}>
                <TableHead
                  scope="row"
                  className="text-sm font-medium whitespace-normal text-foreground"
                >
                  {header}
                </TableHead>
                {columnHeaders.map((columnHeader, colIndex) => {
                  const value = cells[rowIndex]?.[colIndex] ?? null;
                  return (
                    <TableCell
                      key={columnHeader}
                      className="text-right text-sm tabular-nums"
                    >
                      {value === null ? (
                        <NoData reason={`No ${measureLabel} for ${header} in ${columnHeader}`} />
                      ) : (
                        formatValue(value, valueFormat, cur)
                      )}
                    </TableCell>
                  );
                })}
                {showRowTotals ? (
                  <TableCell className="border-l border-border text-right text-sm font-medium tabular-nums">
                    {rowTotals[rowIndex] === undefined ? (
                      <NoData />
                    ) : (
                      formatValue(rowTotals[rowIndex], valueFormat, cur)
                    )}
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
          {showFooter ? (
            <TableFooter>
              <TableRow>
                <TableHead scope="row" className="text-sm font-medium text-foreground">
                  Total
                </TableHead>
                {columnHeaders.map((columnHeader, colIndex) => (
                  <TableCell key={columnHeader} className="text-right text-sm tabular-nums">
                    {columnTotals === null || columnTotals[colIndex] === undefined ? (
                      <NoData />
                    ) : (
                      formatValue(columnTotals[colIndex], valueFormat, cur)
                    )}
                  </TableCell>
                ))}
                {showRowTotals ? (
                  <TableCell className="border-l border-border text-right text-sm font-semibold tabular-nums">
                    {grandTotal === null ? <NoData /> : formatValue(grandTotal, valueFormat, cur)}
                  </TableCell>
                ) : null}
              </TableRow>
            </TableFooter>
          ) : null}
        </Table>
      </div>
    </TableBlockFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. transaction_table                                                       */
/* -------------------------------------------------------------------------- */

const TRANSACTION_FLAG_LABEL: Record<TransactionFlag, string> = {
  duplicate: "Duplicate",
  round_number: "Round number",
  backdated: "Backdated",
  weekend_or_holiday: "Weekend or holiday",
  out_of_period: "Out of period",
  unusual_user: "Unusual user",
  missing_description: "Missing description",
  large_manual: "Large manual entry",
  related_party: "Related party",
  sequence_gap: "Sequence gap",
};

export function TransactionTableBlock({ block }: { block: BlockOf<"transaction_table"> }) {
  const { data, dateColumnKey, amountColumnKey, currency, selectionBasis, populationSize, flaggedRows } =
    block;

  const flagsByRow = new Map<number, BlockOf<"transaction_table">["flaggedRows"]>();
  for (const flagged of flaggedRows) {
    const existing = flagsByRow.get(flagged.rowIndex);
    if (existing) existing.push(flagged);
    else flagsByRow.set(flagged.rowIndex, [flagged]);
  }

  /** The model names the date and amount columns; honour that even if `format` was left null. */
  const resolveFormat = (column: TableColumn): CellFormat => {
    if (column.format !== null) return column.format;
    if (column.key === dateColumnKey) return "date";
    if (column.key === amountColumnKey) return "currency";
    return "text";
  };

  const columnCount = data.columns.length + 1;

  return (
    <TableBlockFrame
      block={block}
      meta={[
        { label: "Currency", value: currency },
        { label: "Transactions", value: formatValue(data.rows.length, "number") },
        ...(populationSize !== null
          ? [{ label: "Drawn from", value: formatValue(populationSize, "number") }]
          : []),
        {
          label: "Flagged",
          value:
            flaggedRows.length === 0
              ? "None"
              : `${formatValue(flagsByRow.size, "number")} of ${formatValue(data.rows.length, "number")}`,
        },
      ]}
    >
      <p className="mb-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">Selection basis: </span>
        {selectionBasis}
      </p>

      {flaggedRows.length === 0 ? (
        <p className="mb-3 flex items-center gap-1.5 text-xs text-muted-foreground">
          <RiCheckboxCircleLine className="size-3.5 shrink-0" aria-hidden />
          No transaction in this selection was flagged.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead scope="col" className="text-xs">
                Flags
              </TableHead>
              {data.columns.map((column) => {
                const format = resolveFormat(column);
                return (
                  <TableHead
                    key={column.key}
                    scope="col"
                    className={cn("text-xs", alignClass(column.align, format))}
                  >
                    {column.label}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columnCount}
                  className="py-6 text-center text-sm text-muted-foreground"
                >
                  No transactions met the selection basis above.
                </TableCell>
              </TableRow>
            ) : (
              data.rows.map((row, rowIndex) => {
                const flags = flagsByRow.get(rowIndex);
                return (
                  <TableRow key={rowIndex} className={cn(flags && "bg-amber-500/5")}>
                    <TableCell className="align-top text-sm whitespace-normal">
                      {flags ? (
                        <ul className="flex flex-col gap-1.5">
                          {flags.map((flagged, i) => (
                            <li key={`${flagged.flag}-${i}`} className="flex flex-col gap-0.5">
                              <span className="flex flex-wrap items-center gap-1">
                                <SeverityBadge severity={flagged.severity} />
                                <Marker icon={RiFlagLine} tone="warn">
                                  {TRANSACTION_FLAG_LABEL[flagged.flag]}
                                </Marker>
                              </span>
                              <span className="max-w-72 text-xs whitespace-normal text-muted-foreground">
                                {flagged.reason}
                              </span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <NoData reason="Not flagged" />
                      )}
                    </TableCell>
                    {data.columns.map((column, colIndex) => {
                      const format = resolveFormat(column);
                      return (
                        <TableCell
                          key={column.key}
                          className={cn(
                            "align-top text-sm",
                            alignClass(column.align, format),
                            isNumericFormat(format) && "tabular-nums",
                          )}
                        >
                          {renderCell(row[colIndex] ?? null, format, currency)}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                );
              })
            )}
          </TableBody>
          {data.totalRow ? (
            <TableFooter>
              <TableRow>
                <TableCell className="text-sm text-muted-foreground">Total</TableCell>
                {data.columns.map((column, colIndex) => {
                  const format = resolveFormat(column);
                  return (
                    <TableCell
                      key={column.key}
                      className={cn(
                        "text-sm",
                        alignClass(column.align, format),
                        isNumericFormat(format) && "tabular-nums",
                      )}
                    >
                      {renderCell(data.totalRow?.[colIndex] ?? null, format, currency)}
                    </TableCell>
                  );
                })}
              </TableRow>
            </TableFooter>
          ) : null}
        </Table>
      </div>

      {data.note ? <p className="mt-2 text-xs text-muted-foreground">{data.note}</p> : null}
    </TableBlockFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* 4. ledger_table                                                            */
/* -------------------------------------------------------------------------- */

export function LedgerTableBlock({ block }: { block: BlockOf<"ledger_table"> }) {
  const {
    data,
    debitColumnKey,
    creditColumnKey,
    accountColumnKey,
    currency,
    periodLabel,
    debitTotal,
    creditTotal,
    balanced,
    postingSources,
  } = block;

  const outOfBalance = debitTotal - creditTotal;

  const resolveFormat = (column: TableColumn): CellFormat => {
    if (column.format !== null) return column.format;
    if (column.key === debitColumnKey || column.key === creditColumnKey) return "currency";
    return "text";
  };

  const isMoneyColumn = (column: TableColumn) =>
    column.key === debitColumnKey || column.key === creditColumnKey;

  return (
    <TableBlockFrame
      block={block}
      meta={[
        { label: "Period", value: periodLabel },
        { label: "Currency", value: currency },
        { label: "Account column", value: data.columns.find((c) => c.key === accountColumnKey)?.label ?? accountColumnKey },
        { label: "Entries", value: formatValue(data.rows.length, "number") },
      ]}
    >
      <div
        className={cn(
          "mb-3 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-3 py-2 text-sm",
          balanced
            ? "border-emerald-600/40 bg-emerald-600/5"
            : "border-destructive/40 bg-destructive/5",
        )}
      >
        {balanced ? (
          <Marker icon={RiCheckboxCircleLine} tone="good">
            Balanced
          </Marker>
        ) : (
          <Marker icon={RiErrorWarningLine} tone="bad">
            Out of balance
          </Marker>
        )}
        <span className="text-xs text-muted-foreground">
          Debits{" "}
          <span className="font-medium text-foreground tabular-nums">
            {formatMoney(debitTotal, currency)}
          </span>{" "}
          · Credits{" "}
          <span className="font-medium text-foreground tabular-nums">
            {formatMoney(creditTotal, currency)}
          </span>
          {!balanced ? (
            <>
              {" "}
              · Difference{" "}
              <span className="font-medium text-destructive tabular-nums">
                {formatMoney(outOfBalance, currency)}
              </span>
            </>
          ) : null}
        </span>
      </div>

      {postingSources.length > 0 ? (
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Posting sources:</span>
          {postingSources.map((source) => (
            <span
              key={source}
              className="rounded-md border border-border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground"
            >
              {humanize(source)}
            </span>
          ))}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <caption className="sr-only">
            {`Journal extract for ${periodLabel}, in ${currency}.`}
          </caption>
          <TableHeader>
            <TableRow className="bg-muted/40">
              {data.columns.map((column) => {
                const format = resolveFormat(column);
                return (
                  <TableHead
                    key={column.key}
                    scope="col"
                    className={cn("text-xs", alignClass(column.align, format))}
                  >
                    {column.label}
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={data.columns.length}
                  className="py-6 text-center text-sm text-muted-foreground"
                >
                  No journal entries in this extract.
                </TableCell>
              </TableRow>
            ) : (
              data.rows.map((row, rowIndex) => (
                <TableRow key={rowIndex}>
                  {data.columns.map((column, colIndex) => {
                    const format = resolveFormat(column);
                    const value = row[colIndex] ?? null;
                    return (
                      <TableCell
                        key={column.key}
                        className={cn(
                          "text-sm",
                          alignClass(column.align, format),
                          isNumericFormat(format) && "tabular-nums",
                          column.key === accountColumnKey && "font-medium",
                        )}
                      >
                        {isMoneyColumn(column) && value === null ? (
                          <NoData reason="No amount posted" />
                        ) : (
                          renderCell(value, format, currency)
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
          <TableFooter>
            <TableRow>
              {data.columns.map((column, colIndex) => {
                const format = resolveFormat(column);
                let content: ReactNode;
                if (column.key === debitColumnKey) content = formatMoney(debitTotal, currency);
                else if (column.key === creditColumnKey) content = formatMoney(creditTotal, currency);
                else if (colIndex === 0) content = "Totals";
                else if (data.totalRow) content = renderCell(data.totalRow[colIndex] ?? null, format, currency);
                else content = null;

                return (
                  <TableCell
                    key={column.key}
                    className={cn(
                      "text-sm",
                      alignClass(column.align, format),
                      isNumericFormat(format) && "tabular-nums font-semibold",
                    )}
                  >
                    {content}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      {data.note ? <p className="mt-2 text-xs text-muted-foreground">{data.note}</p> : null}
    </TableBlockFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* 5. aging_table                                                             */
/* -------------------------------------------------------------------------- */

function bucketRange(bucket: AgingBucket): string {
  return bucket.toDays === null
    ? `${bucket.fromDays} days and over`
    : `${bucket.fromDays}–${bucket.toDays} days`;
}

export function AgingTableBlock({ block }: { block: BlockOf<"aging_table"> }) {
  const { subject, agingBasis, asOfDate, currency, buckets, rows, bucketTotals, grandTotal } = block;

  const subjectLabel =
    subject === "receivables" ? "Receivables" : subject === "payables" ? "Payables" : "Other balances";
  const basisLabel = agingBasis === "due_date" ? "Due date" : "Invoice date";
  const columnCount = buckets.length + 2;

  return (
    <TableBlockFrame
      block={block}
      meta={[
        { label: "Subject", value: subjectLabel },
        { label: "Aged by", value: basisLabel },
        { label: "As of", value: formatValue(asOfDate, "date") },
        { label: "Currency", value: currency },
        { label: "Entities", value: formatValue(rows.length, "number") },
        { label: "Total", value: formatMoney(grandTotal, currency) },
      ]}
    >
      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <caption className="sr-only">
            {`${subjectLabel} aged by ${basisLabel.toLowerCase()} as at ${formatValue(asOfDate, "date")}, in ${currency}.`}
          </caption>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead scope="col" className="text-xs">
                Entity
              </TableHead>
              {buckets.map((bucket) => (
                <TableHead key={bucket.label} scope="col" className="text-right text-xs">
                  <span className="block">{bucket.label}</span>
                  <span className="block text-[0.6875rem] font-normal text-muted-foreground">
                    {bucketRange(bucket)}
                  </span>
                </TableHead>
              ))}
              <TableHead scope="col" className="border-l border-border text-right text-xs">
                Total
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={columnCount}
                  className="py-6 text-center text-sm text-muted-foreground"
                >
                  No open balances at this date.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, rowIndex) => (
                <TableRow key={`${row.entityId ?? row.entityName}-${rowIndex}`}>
                  <TableHead
                    scope="row"
                    className="align-top text-sm font-medium whitespace-normal text-foreground"
                  >
                    <span className="block">{row.entityName}</span>
                    {row.entityId ? (
                      <span className="block font-mono text-xs font-normal text-muted-foreground">
                        {row.entityId}
                      </span>
                    ) : null}
                    {row.disputed || row.creditLimitExceeded ? (
                      <span className="mt-1 flex flex-wrap gap-1">
                        {row.disputed ? (
                          <Marker icon={RiAlertLine} tone="warn">
                            Disputed
                          </Marker>
                        ) : null}
                        {row.creditLimitExceeded ? (
                          <Marker icon={RiErrorWarningLine} tone="bad">
                            Credit limit exceeded
                          </Marker>
                        ) : null}
                      </span>
                    ) : null}
                  </TableHead>
                  {buckets.map((bucket, bucketIndex) => {
                    const amount = row.bucketAmounts[bucketIndex];
                    return (
                      <TableCell
                        key={bucket.label}
                        className="align-top text-right text-sm tabular-nums"
                      >
                        {amount === undefined ? (
                          <NoData reason={`No ${bucket.label} balance`} />
                        ) : (
                          formatMoney(amount, currency)
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className="border-l border-border align-top text-right text-sm font-medium tabular-nums">
                    {formatMoney(row.total, currency)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableHead scope="row" className="text-sm font-medium text-foreground">
                Total
              </TableHead>
              {buckets.map((bucket, bucketIndex) => {
                const total = bucketTotals[bucketIndex];
                return (
                  <TableCell key={bucket.label} className="text-right text-sm tabular-nums">
                    {total === undefined ? <NoData /> : formatMoney(total, currency)}
                  </TableCell>
                );
              })}
              <TableCell className="border-l border-border text-right text-sm font-semibold tabular-nums">
                {formatMoney(grandTotal, currency)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>
    </TableBlockFrame>
  );
}

/* -------------------------------------------------------------------------- */
/* 6. reconciliation_table                                                    */
/* -------------------------------------------------------------------------- */

const RECONCILING_ITEM_LABEL: Record<ReconcilingItem["itemType"], string> = {
  timing_difference: "Timing difference",
  unrecorded_transaction: "Unrecorded transaction",
  error: "Error",
  duplicate: "Duplicate",
  fx_difference: "FX difference",
  fee_or_charge: "Fee or charge",
  unexplained: "Unexplained",
};

/** Floats never land exactly on zero; a residual under half a cent is a rounding artefact. */
const RESIDUAL_TOLERANCE = 0.005;

function ReconciliationSide({
  label,
  source,
  amount,
  currency,
}: {
  label: string;
  source: string;
  amount: number;
  currency: string;
}) {
  return (
    <div className="flex-1 rounded-lg border border-border bg-muted/30 p-3">
      <p className="text-xs font-medium text-foreground">{label}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{source}</p>
      <p className="mt-2 text-lg font-semibold tabular-nums">{formatMoney(amount, currency)}</p>
    </div>
  );
}

export function ReconciliationTableBlock({ block }: { block: BlockOf<"reconciliation_table"> }) {
  const {
    currency,
    sideALabel,
    sideASource,
    sideAAmount,
    sideBLabel,
    sideBSource,
    sideBAmount,
    asOfDate,
    differenceBefore,
    reconcilingItems,
    residualDifference,
    reconciled,
  } = block;

  const residualIsZero = Math.abs(residualDifference) < RESIDUAL_TOLERANCE;
  const unexplainedCount = reconcilingItems.filter((i) => i.itemType === "unexplained").length;

  return (
    <TableBlockFrame
      block={block}
      meta={[
        { label: "As of", value: formatValue(asOfDate, "date") },
        { label: "Currency", value: currency },
        { label: "Reconciling items", value: formatValue(reconcilingItems.length, "number") },
        ...(unexplainedCount > 0
          ? [{ label: "Unexplained", value: formatValue(unexplainedCount, "number") }]
          : []),
      ]}
    >
      <div className="mb-3 flex flex-col gap-3 sm:flex-row">
        <ReconciliationSide
          label={sideALabel}
          source={sideASource}
          amount={sideAAmount}
          currency={currency}
        />
        <ReconciliationSide
          label={sideBLabel}
          source={sideBSource}
          amount={sideBAmount}
          currency={currency}
        />
        <div className="flex-1 rounded-lg border border-border p-3">
          <p className="text-xs font-medium text-foreground">Difference before reconciling</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Side A less side B</p>
          <p className="mt-2 text-lg font-semibold tabular-nums">
            {formatMoney(differenceBefore, currency)}
          </p>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border">
        <Table>
          <caption className="sr-only">
            {`Reconciling items between ${sideALabel} and ${sideBLabel}, in ${currency}.`}
          </caption>
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead scope="col" className="text-xs">
                Item
              </TableHead>
              <TableHead scope="col" className="text-xs">
                Type
              </TableHead>
              <TableHead scope="col" className="text-xs">
                Applies to
              </TableHead>
              <TableHead scope="col" className="text-right text-xs">
                Age (days)
              </TableHead>
              <TableHead scope="col" className="text-right text-xs">
                Amount
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reconcilingItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-6 text-center text-sm text-muted-foreground">
                  No reconciling items — the two sources agree without adjustment.
                </TableCell>
              </TableRow>
            ) : (
              reconcilingItems.map((item, index) => (
                <TableRow
                  key={`${item.description}-${index}`}
                  className={cn(item.itemType === "unexplained" && "bg-amber-500/5")}
                >
                  <TableCell className="align-top text-sm whitespace-normal">
                    <span className="block">{item.description}</span>
                    {item.evidenceLabel ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {item.evidenceLabel}
                      </span>
                    ) : null}
                  </TableCell>
                  <TableCell className="align-top text-sm whitespace-normal">
                    {item.itemType === "unexplained" ? (
                      <Marker icon={RiAlertLine} tone="warn">
                        {RECONCILING_ITEM_LABEL[item.itemType]}
                      </Marker>
                    ) : (
                      <span className="text-muted-foreground">
                        {RECONCILING_ITEM_LABEL[item.itemType]}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="align-top text-sm text-muted-foreground">
                    {item.appliesTo === "side_a" ? sideALabel : sideBLabel}
                  </TableCell>
                  <TableCell className="align-top text-right text-sm tabular-nums">
                    {item.ageDays === null ? (
                      <NoData reason="Age not recorded" />
                    ) : (
                      formatValue(item.ageDays, "number")
                    )}
                  </TableCell>
                  <TableCell className="align-top text-right text-sm tabular-nums">
                    {formatMoney(item.amount, currency)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
          <TableFooter>
            <TableRow>
              <TableHead scope="row" colSpan={4} className="text-sm font-medium text-foreground">
                Residual difference
              </TableHead>
              <TableCell
                className={cn(
                  "text-right text-sm font-semibold tabular-nums",
                  !residualIsZero && "text-destructive",
                )}
              >
                {formatMoney(residualDifference, currency)}
              </TableCell>
            </TableRow>
          </TableFooter>
        </Table>
      </div>

      <div
        className={cn(
          "mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3 py-2",
          reconciled && residualIsZero
            ? "border-emerald-600/40 bg-emerald-600/5"
            : "border-destructive/40 bg-destructive/5",
        )}
      >
        {reconciled && residualIsZero ? (
          <Marker icon={RiCheckboxCircleLine} tone="good">
            Reconciled
          </Marker>
        ) : (
          <Marker icon={RiErrorWarningLine} tone="bad">
            Not reconciled
          </Marker>
        )}
        <span className="text-xs text-muted-foreground">
          {residualIsZero
            ? "Every difference between the two sources is explained by the items above."
            : `${formatMoney(residualDifference, currency)} remains unexplained after every reconciling item.`}
        </span>
      </div>

      {reconciled && !residualIsZero ? (
        <p className="mt-2 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          <RiAlertLine className="mt-px size-3.5 shrink-0" aria-hidden />
          <span>
            This reconciliation is marked reconciled, yet a residual difference of{" "}
            {formatMoney(residualDifference, currency)} remains. The two statements disagree — treat
            the residual, not the flag, as the result.
          </span>
        </p>
      ) : null}
    </TableBlockFrame>
  );
}
