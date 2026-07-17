"use client";

import { useState, useTransition } from "react";
import {
  RiAlertLine,
  RiCheckboxCircleLine,
  RiCloseCircleLine,
  RiDeleteBinLine,
  RiErrorWarningLine,
  RiFileCopyLine,
  RiFileTextLine,
  RiInformationLine,
  RiPlugLine,
  RiTableLine,
  RiTimeLine,
} from "@remixicon/react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { INPUT_STATUS_LABEL, formatBytes } from "@/components/audit/labels";
import type { DetectedMetadata, InputWarning } from "@/db/schema";
import { removeInput } from "@/server/actions/audit";

export type ReviewDocument = {
  id: string;
  kind: string;
  name: string;
  sheetName: string | null;
  pageNumber: number | null;
  rowCount: number | null;
  truncated: boolean;
};

export type ReviewInput = {
  id: string;
  kind: "file" | "text" | "integration";
  name: string;
  description: string | null;
  status: string;
  fileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  textPreview: string | null;
  warnings: InputWarning[];
  detected: DetectedMetadata;
  parseError: string | null;
  addedAt: string;
  documents: ReviewDocument[];
  /** Name of an earlier input with an identical checksum, if any. */
  duplicateOf: string | null;
  /** True once a revision has run: removal becomes a soft removal (PRD §19.1). */
  softRemoveOnly: boolean;
};

const SEVERITY_LABEL: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
  info: "Note",
};

/**
 * Review inputs (PRD §8.6).
 *
 * Everything shown here is read back from the database after parsing. Where the parser could
 * not determine something, that is what it says — an invented period or currency in an audit
 * tool is worse than an admitted gap.
 */
export function InputReviewList({
  inputs,
  disabled,
}: {
  inputs: ReviewInput[];
  disabled: boolean;
}) {
  if (inputs.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
        No inputs attached yet. Add files or written context above; the audit can still be run
        without them, but the model will have nothing to cite.
      </p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {inputs.map((input) => (
        <li key={input.id}>
          <InputRow input={input} disabled={disabled} />
        </li>
      ))}
    </ul>
  );
}

function InputRow({ input, disabled }: { input: ReviewInput; disabled: boolean }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const totalRows = input.documents.reduce((sum, doc) => sum + (doc.rowCount ?? 0), 0);
  const truncatedDocs = input.documents.filter((doc) => doc.truncated);
  const detected = input.detected;

  function remove() {
    setError(null);
    const formData = new FormData();
    formData.set("inputId", input.id);
    startTransition(async () => {
      try {
        await removeInput(formData);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not remove that input.");
      }
    });
  }

  return (
    <article className="rounded-lg border border-border p-3">
      <div className="flex items-start gap-2.5">
        <KindIcon kind={input.kind} />

        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <h4 className="truncate text-sm font-medium">{input.name}</h4>
            <StatusBadge status={input.status} />
            {input.duplicateOf ? (
              <Badge variant="secondary">
                <RiFileCopyLine aria-hidden="true" />
                Identical to “{input.duplicateOf}”
              </Badge>
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground">
            {input.kind === "file"
              ? `${formatBytes(input.fileSize)} · ${input.mimeType ?? "unknown type"} · added ${input.addedAt}`
              : input.kind === "text"
                ? `Written context · added ${input.addedAt}`
                : `Integration import · added ${input.addedAt}`}
          </p>

          {input.description ? (
            <p className="text-xs text-muted-foreground">{input.description}</p>
          ) : null}
        </div>

        <div className="shrink-0">
          {pending ? (
            <Spinner aria-hidden="true" className="size-4" />
          ) : (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={disabled}
              onClick={remove}
              aria-label={`Remove ${input.name} from this audit`}
            >
              <RiDeleteBinLine aria-hidden="true" />
              Remove
            </Button>
          )}
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-2 text-xs text-destructive">
          {error}
        </p>
      ) : null}

      {input.parseError ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-destructive">
          <RiCloseCircleLine aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
          <span>
            <span className="font-medium">Could not read this file:</span> {input.parseError}. It
            is still stored and attached — the model just cannot cite rows from it.
          </span>
        </p>
      ) : null}

      {input.warnings.length > 0 ? (
        <ul className="mt-2 flex flex-col gap-1">
          {input.warnings.map((warning, index) => (
            <li
              key={`${warning.code}-${index}`}
              className="flex items-start gap-1.5 text-xs text-muted-foreground"
            >
              <WarningIcon severity={warning.severity} />
              <span>
                <span className="font-medium">
                  {SEVERITY_LABEL[warning.severity] ?? warning.severity}:
                </span>{" "}
                {warning.message}
              </span>
            </li>
          ))}
        </ul>
      ) : null}

      {input.kind === "text" && input.textPreview ? (
        <p className="mt-2 line-clamp-3 rounded-lg bg-muted px-2.5 py-2 text-xs whitespace-pre-wrap text-muted-foreground">
          {input.textPreview}
        </p>
      ) : null}

      {input.kind !== "text" ? (
        <dl className="mt-2.5 grid gap-2 text-xs sm:grid-cols-3">
          <Detected label="Accounting periods" icon={<RiTimeLine aria-hidden="true" />}>
            {detected.periods && detected.periods.length > 0 ? (
              detected.periods
                .map((period) => period.label ?? [period.start, period.end].filter(Boolean).join(" → "))
                .filter(Boolean)
                .join(", ")
            ) : (
              <NotDetected />
            )}
          </Detected>
          <Detected label="Currencies" icon={<RiInformationLine aria-hidden="true" />}>
            {detected.currencies && detected.currencies.length > 0 ? (
              detected.currencies.join(", ")
            ) : (
              <NotDetected />
            )}
          </Detected>
          <Detected label="Entities" icon={<RiInformationLine aria-hidden="true" />}>
            {detected.entities && detected.entities.length > 0 ? (
              detected.entities.join(", ")
            ) : (
              <NotDetected />
            )}
          </Detected>
        </dl>
      ) : null}

      {input.documents.length > 0 ? (
        <div className="mt-2.5 flex flex-col gap-1">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <RiTableLine aria-hidden="true" className="size-3.5" />
            {input.documents.length} parsed {input.documents.length === 1 ? "part" : "parts"} ·{" "}
            {totalRows.toLocaleString()} {totalRows === 1 ? "row" : "rows"} read
          </p>
          <ul className="flex flex-wrap gap-1">
            {input.documents.slice(0, 12).map((doc) => (
              <li key={doc.id}>
                <Badge variant="outline">
                  {doc.sheetName ?? (doc.pageNumber ? `Page ${doc.pageNumber}` : doc.name)}
                  {doc.rowCount ? ` · ${doc.rowCount.toLocaleString()} rows` : ""}
                </Badge>
              </li>
            ))}
            {input.documents.length > 12 ? (
              <li>
                <Badge variant="ghost">+{input.documents.length - 12} more</Badge>
              </li>
            ) : null}
          </ul>
          {truncatedDocs.length > 0 ? (
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <RiAlertLine aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
              <span>
                <span className="font-medium">Truncated:</span>{" "}
                {truncatedDocs.map((doc) => doc.sheetName ?? doc.name).join(", ")} exceeded the
                per-part row limit, so only the leading rows were read. Findings can only cite
                what was read.
              </span>
            </p>
          ) : null}
        </div>
      ) : null}

      {input.softRemoveOnly ? (
        <p className="mt-2 text-xs text-muted-foreground">
          This audit has already run, so removing this input marks it removed rather than
          deleting it — the published revision stays reproducible.
        </p>
      ) : null}
    </article>
  );
}

function NotDetected() {
  return (
    <span className="text-muted-foreground/80">The parser could not determine this.</span>
  );
}

function Detected({
  label,
  icon,
  children,
}: {
  label: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border p-2">
      <dt className="flex items-center gap-1 font-medium [&_svg]:size-3.5">
        {icon}
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-muted-foreground">{children}</dd>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const label = INPUT_STATUS_LABEL[status] ?? status;
  if (status === "parsed") {
    return (
      <Badge variant="outline">
        <RiCheckboxCircleLine aria-hidden="true" />
        {label}
      </Badge>
    );
  }
  if (status === "failed" || status === "unsupported") {
    return (
      <Badge variant="destructive">
        <RiCloseCircleLine aria-hidden="true" />
        {label}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary">
      <RiTimeLine aria-hidden="true" />
      {label}
    </Badge>
  );
}

function WarningIcon({ severity }: { severity: string }) {
  if (severity === "critical" || severity === "high") {
    return (
      <RiErrorWarningLine aria-hidden="true" className="mt-0.5 size-3.5 shrink-0 text-destructive" />
    );
  }
  if (severity === "medium" || severity === "low") {
    return <RiAlertLine aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />;
  }
  return <RiInformationLine aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />;
}

function KindIcon({ kind }: { kind: ReviewInput["kind"] }) {
  const className = "mt-0.5 size-4 shrink-0 text-muted-foreground";
  if (kind === "text") return <RiFileTextLine aria-hidden="true" className={className} />;
  if (kind === "integration") return <RiPlugLine aria-hidden="true" className={className} />;
  return <RiFileCopyLine aria-hidden="true" className={className} />;
}
