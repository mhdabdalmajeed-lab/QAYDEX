"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  RiAlertLine,
  RiCheckLine,
  RiDownloadLine,
  RiEyeOffLine,
  RiInformationLine,
} from "@remixicon/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  DEFAULT_EXPORT_OPTIONS,
  EXPORT_FORMATS,
  FORMAT_META,
  type ExportFormat,
  type ExportKind,
  type ExportOptions,
  formatIsAllowed,
  kindMeta,
} from "@/lib/export/types";

/**
 * The export composer (PRD §24).
 *
 * Every choice here changes what a reader of the finished document is allowed to check, so each
 * one states its consequence rather than reading as a preference. Turning evidence off does not
 * make a tidier report — it makes a redacted one, and this form says so before the file exists.
 *
 * Format restrictions are editorial, not technical: a disallowed format is disabled *and*
 * explained, never silently hidden, so nobody wonders where the CSV went.
 */

/** The kinds this form offers. "blocks" needs a block picker on the audit canvas, not here. */
const OFFERED_KINDS: readonly ExportKind[] = [
  "full_report",
  "executive_summary",
  "findings",
  "management_letter",
  "remediation_plan",
  "evidence_appendix",
  "activity",
  "instructions",
  "input_list",
];

export type ExportRevisionOption = {
  id: string;
  revision: number;
  status: "draft" | "processing" | "completed" | "failed" | "approved";
  createdAt: string;
  isCurrent: boolean;
};

type OptionKey = Exclude<keyof ExportOptions, "blockIds">;

type OptionSpec = {
  key: OptionKey;
  label: string;
  /** What the reader of the produced file gets — or loses — when this is off. */
  onNote: string;
  offNote: string;
};

const OPTION_SPECS: readonly OptionSpec[] = [
  {
    key: "includeEvidence",
    label: "Evidence citations and appendix",
    onNote: "Each claim carries the input, location and checksum it was drawn from.",
    offNote: "Redacted: findings appear with no source, and cannot be traced back or corroborated.",
  },
  {
    key: "includeCharts",
    label: "Charts",
    onNote: "Numeric blocks are drawn as charts.",
    offNote: "The same numbers are printed as tables instead. Nothing is dropped.",
  },
  {
    key: "includeInternalNotes",
    label: "Internal notes and reviewer comments",
    onNote:
      "Reviewer comments and narrative overrides are printed. Do not send this file outside the engagement team.",
    offNote: "Internal by default. Reviewer comments and overrides stay out of the file.",
  },
  {
    key: "includeActivity",
    label: "Activity trail",
    onNote: "Appends who did what, when, to this audit.",
    offNote: "The activity trail is left out.",
  },
  {
    key: "includeInstructions",
    label: "Instruction set",
    onNote: "Appends the exact instructions this revision was run against.",
    offNote: "The instruction set is left out.",
  },
  {
    key: "includeInputList",
    label: "Input list",
    onNote: "Appends every input attached to the audit, with checksums and warnings.",
    offNote: "The input list is left out.",
  },
];

/** Options the deliverable ignores — offering them would imply an effect they do not have. */
const IRRELEVANT_OPTIONS: Partial<Record<ExportKind, OptionKey[]>> = {
  executive_summary: ["includeEvidence", "includeCharts"],
  activity: ["includeEvidence", "includeCharts", "includeActivity"],
  instructions: ["includeEvidence", "includeCharts", "includeInstructions"],
  input_list: ["includeEvidence", "includeCharts", "includeInputList"],
  evidence_appendix: ["includeEvidence", "includeCharts"],
};

type Result = { fileName: string; bytes: number };

function fmtBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function isExportKind(value: string): value is ExportKind {
  return OFFERED_KINDS.some((kind) => kind === value);
}

function isExportFormat(value: string): value is ExportFormat {
  return EXPORT_FORMATS.some((format) => format === value);
}

export function ExportForm({
  auditId,
  revisions,
  defaultRevisionId,
}: {
  auditId: string;
  revisions: ExportRevisionOption[];
  defaultRevisionId: string;
}) {
  const router = useRouter();

  const [kind, setKind] = useState<ExportKind>("full_report");
  const [format, setFormat] = useState<ExportFormat>("pdf");
  const [revisionId, setRevisionId] = useState<string>(defaultRevisionId);
  const [options, setOptions] = useState<ExportOptions>(DEFAULT_EXPORT_OPTIONS);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);

  const meta = useMemo(() => kindMeta(kind), [kind]);
  const irrelevant = IRRELEVANT_OPTIONS[kind] ?? [];
  const revision = revisions.find((r) => r.id === revisionId) ?? null;

  function chooseKind(next: ExportKind) {
    setKind(next);
    setResult(null);
    setError(null);
    // A format that cannot express the new deliverable must not survive the switch.
    if (!formatIsAllowed(next, format)) {
      const fallback = kindMeta(next).formats[0];
      if (fallback) setFormat(fallback);
    }
  }

  function toggle(key: OptionKey, value: boolean) {
    setOptions((prev) => ({ ...prev, [key]: value }));
    setResult(null);
  }

  async function submit() {
    setPending(true);
    setError(null);
    setResult(null);
    try {
      const response = await fetch("/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ auditId, revisionId, kind, format, options }),
      });

      const body: unknown = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          body && typeof body === "object" && "error" in body && typeof body.error === "string"
            ? body.error
            : `The export failed (HTTP ${response.status}).`;
        setError(message);
        return;
      }

      if (
        !body ||
        typeof body !== "object" ||
        !("url" in body) ||
        typeof body.url !== "string" ||
        !("fileName" in body) ||
        typeof body.fileName !== "string" ||
        !("bytes" in body) ||
        typeof body.bytes !== "number"
      ) {
        setError("The server produced the file but returned an answer this page cannot read.");
        return;
      }

      setResult({ fileName: body.fileName, bytes: body.bytes });
      // The URL is a short-lived signed link; navigating to it starts the download.
      window.location.href = body.url;
      // Bring the history table below back in step with the export just recorded.
      router.refresh();
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally {
      setPending(false);
    }
  }

  const noRevisions = revisions.length === 0;

  return (
    <div className="space-y-8">
      <FieldSet>
        <FieldLegend>Deliverable</FieldLegend>
        <FieldDescription>
          What leaves the platform. Each one is rendered from the same revision data, so two
          formats of the same deliverable cannot disagree.
        </FieldDescription>
        <RadioGroup
          value={kind}
          onValueChange={(value) => {
            if (typeof value === "string" && isExportKind(value)) chooseKind(value);
          }}
          className="mt-3 grid gap-0 overflow-hidden rounded-xl border border-border sm:grid-cols-2"
        >
          {OFFERED_KINDS.map((option) => {
            const m = kindMeta(option);
            const selected = option === kind;
            return (
              <label
                key={option}
                className={`flex cursor-pointer items-start gap-3 border-b border-border p-3 text-sm transition-colors last:border-b-0 hover:bg-muted/50 has-[:focus-visible]:bg-muted/50 sm:[&:nth-last-child(2)]:border-b-0 ${
                  selected ? "bg-muted/60" : ""
                }`}
              >
                <RadioGroupItem value={option} className="mt-0.5" aria-describedby={`kind-${option}-desc`} />
                <span className="min-w-0">
                  <span className="block font-medium">{m.label}</span>
                  <span id={`kind-${option}-desc`} className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                    {m.description}
                  </span>
                </span>
              </label>
            );
          })}
        </RadioGroup>
      </FieldSet>

      <FieldSet>
        <FieldLegend>Revision</FieldLegend>
        <FieldDescription>
          A revision is immutable. Exporting an older one reproduces exactly what it concluded at
          the time — it is not re-run.
        </FieldDescription>
        {noRevisions ? (
          <p className="mt-3 text-sm text-muted-foreground">
            This audit has no revisions yet. Run it before exporting.
          </p>
        ) : (
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <NativeSelect
              className="w-full sm:w-96"
              aria-label="Revision to export"
              value={revisionId}
              onChange={(event) => {
                setRevisionId(event.target.value);
                setResult(null);
              }}
            >
              {revisions.map((r) => (
                <NativeSelectOption key={r.id} value={r.id}>
                  {`Revision ${r.revision} · ${r.status}${r.isCurrent ? " · current" : ""} · ${new Date(
                    r.createdAt,
                  ).toLocaleDateString("en-GB", { dateStyle: "medium" })}`}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            {revision && revision.status !== "approved" ? (
              <Badge variant="outline" className="gap-1">
                <RiAlertLine aria-hidden className="size-3" />
                Not approved
              </Badge>
            ) : null}
          </div>
        )}
      </FieldSet>

      <FieldSet>
        <FieldLegend>Format</FieldLegend>
        <FieldDescription>
          Formats not offered for this deliverable are disabled, with the reason shown.
        </FieldDescription>
        <RadioGroup
          value={format}
          onValueChange={(value) => {
            if (typeof value === "string" && isExportFormat(value) && formatIsAllowed(kind, value)) {
              setFormat(value);
              setResult(null);
            }
          }}
          className="mt-3 flex flex-wrap gap-2"
        >
          {EXPORT_FORMATS.map((option) => {
            const allowed = formatIsAllowed(kind, option);
            const reason = `${FORMAT_META[option].label} cannot express a ${meta.label.toLowerCase()} honestly, so it is not offered.`;
            return (
              <label
                key={option}
                title={allowed ? undefined : reason}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors has-[:focus-visible]:ring-3 has-[:focus-visible]:ring-ring/50 ${
                  allowed
                    ? "cursor-pointer border-input hover:bg-muted/50"
                    : "cursor-not-allowed border-dashed border-border text-muted-foreground"
                } ${allowed && option === format ? "border-ring bg-muted/60" : ""}`}
              >
                <RadioGroupItem value={option} disabled={!allowed} />
                <span>{FORMAT_META[option].label}</span>
                {!allowed ? <span className="sr-only">{reason}</span> : null}
              </label>
            );
          })}
        </RadioGroup>
        <p className="mt-2 text-xs text-muted-foreground">
          {meta.label} is offered as{" "}
          {meta.formats.map((f) => FORMAT_META[f].label).join(", ")}.
        </p>
      </FieldSet>

      <FieldSet>
        <FieldLegend>What goes in the file</FieldLegend>
        <FieldDescription>
          Each switch changes what a reader can verify. The professional-review disclaimer is on
          every deliverable and cannot be switched off.
        </FieldDescription>
        <div className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border">
          {OPTION_SPECS.map((spec) => {
            const disabled = irrelevant.includes(spec.key);
            const value = options[spec.key];
            return (
              <Field key={spec.key} orientation="horizontal" className="items-start gap-3 p-3">
                <Switch
                  id={`opt-${spec.key}`}
                  checked={value}
                  disabled={disabled}
                  onCheckedChange={(checked) => toggle(spec.key, checked)}
                  className="mt-0.5"
                />
                <span className="min-w-0 flex-1">
                  <FieldLabel htmlFor={`opt-${spec.key}`} className="font-medium">
                    {spec.label}
                  </FieldLabel>
                  <span className="mt-0.5 block text-xs leading-relaxed text-muted-foreground">
                    {disabled
                      ? `Not applicable to a ${meta.label.toLowerCase()}.`
                      : value
                        ? spec.onNote
                        : spec.offNote}
                  </span>
                </span>
              </Field>
            );
          })}
        </div>
      </FieldSet>

      {!irrelevant.includes("includeEvidence") && !options.includeEvidence ? (
        <Alert variant="destructive">
          <RiEyeOffLine aria-hidden />
          <AlertTitle>This will produce a redacted report</AlertTitle>
          <AlertDescription>
            Without evidence, no finding in the file can be traced to the input it came from. A
            reviewer cannot corroborate it, and nobody should sign it.
          </AlertDescription>
        </Alert>
      ) : null}

      {!irrelevant.includes("includeInternalNotes") && options.includeInternalNotes ? (
        <Alert>
          <RiInformationLine aria-hidden />
          <AlertTitle>Internal notes will be printed</AlertTitle>
          <AlertDescription>
            Reviewer comments and narrative overrides are internal by default. This file is for the
            engagement team, not the client.
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive" aria-live="assertive">
          <RiAlertLine aria-hidden />
          <AlertTitle>The export failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {result ? (
        <Alert aria-live="polite">
          <RiCheckLine aria-hidden />
          <AlertTitle>{result.fileName}</AlertTitle>
          <AlertDescription>
            {fmtBytes(result.bytes)} — the download has started. It is also listed below and can be
            re-downloaded from there.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <Button onClick={submit} disabled={pending || noRevisions}>
          {pending ? <Spinner aria-hidden /> : <RiDownloadLine aria-hidden />}
          {pending ? "Generating…" : `Generate ${FORMAT_META[format].label}`}
        </Button>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {pending
            ? "Rendering the document. A full report with charts can take a minute — keep this tab open."
            : noRevisions
              ? "Nothing to export yet."
              : "Every export is recorded in this audit's activity trail."}
        </p>
      </div>
    </div>
  );
}
