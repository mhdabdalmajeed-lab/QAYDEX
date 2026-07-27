"use client";

import {
  RiAddLine,
  RiArrowRightSLine,
  RiChat3Line,
  RiCloseLine,
  RiCornerDownRightLine,
  RiErrorWarningLine,
  RiFileList3Line,
  RiFileTextLine,
  RiPlugLine,
  RiSearchLine,
  RiSideBarLine,
  RiTableLine,
  type RemixiconComponentType,
} from "@remixicon/react";
import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { InputUploader } from "@/components/audit/input-uploader";
import { TextInputForm } from "@/components/audit/text-input-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatBytes, formatDateTime, formatDay, InputStatusPill } from "@/components/audit/meta";
import type { PanelInput } from "@/server/queries/audit";
import type { InstructionSnapshotEntry } from "@/db/schema";
import { cn } from "@/lib/utils";

/**
 * The persistent left input panel (PRD §19.1).
 *
 * This is the half of the page that answers "what was this conclusion built from?". It shows the
 * instructions **as they were used** — the revision's frozen snapshot, not today's library, which
 * would silently rewrite history when someone edits an instruction (PRD §9.4).
 *
 * Nothing here is inferred. An input's period, currency and row count are what the parser
 * detected; if it detected nothing, the panel says so rather than showing a plausible number.
 */

const STORAGE_KEY = "caydex:audit-panel-open";
const PANEL_PREF_EVENT = "caydex:audit-panel-open-changed";

const KIND_ICON: Record<PanelInput["kind"], RemixiconComponentType> = {
  file: RiFileTextLine,
  text: RiFileList3Line,
  integration: RiPlugLine,
};

const KIND_LABEL: Record<PanelInput["kind"], string> = {
  file: "File",
  text: "Written",
  integration: "Import",
};

const SOURCE_LABEL: Record<InstructionSnapshotEntry["source"], string> = {
  platform_safety: "Platform safety",
  organization_mandatory: "Organization (mandatory)",
  client_mandatory: "Client (mandatory)",
  /** No longer produced; kept so revisions recorded before templates were removed still render. */
  template: "Template",
  saved: "Saved instruction",
  audit_specific: "This audit only",
  chat: "Added in chat",
};

export type InputPanelProps = {
  slug: string;
  auditId: string;
  inputs: PanelInput[];
  /** The revision's immutable `instructionSnapshot` — empty before the first run. */
  instructions: InstructionSnapshotEntry[];
  customInstructions: string | null;
  periodLabel: string;
  dataFreshness: string[];
  /** Evidence the model itself said it lacked, from the revision's plan. */
  missingEvidence: string[];
  revisionLabel: string | null;
  canEdit: boolean;
};

/**
 * The panel's open/closed preference lives in localStorage, which is an external store — so it
 * is read through useSyncExternalStore rather than copied into state inside an effect. The
 * server snapshot is `true` because the server cannot know the preference, and defaulting open
 * is the safer flash: a first-time reader sees the evidence panel rather than a collapsed strip.
 */
function subscribeToPanelPref(onChange: () => void): () => void {
  // `storage` fires for other tabs; the local writer notifies itself via a custom event.
  window.addEventListener("storage", onChange);
  window.addEventListener(PANEL_PREF_EVENT, onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener(PANEL_PREF_EVENT, onChange);
  };
}

function getPanelPref(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "false";
  } catch {
    // Private-mode storage denial is not worth surfacing.
    return true;
  }
}

function getPanelPrefServer(): boolean {
  return true;
}

export function InputPanel(props: InputPanelProps) {
  const open = useSyncExternalStore(subscribeToPanelPref, getPanelPref, getPanelPrefServer);
  const [query, setQuery] = useState("");
  const [kinds, setKinds] = useState<string[]>([]);
  const [preview, setPreview] = useState<PanelInput | null>(null);

  function toggle(next: boolean) {
    try {
      window.localStorage.setItem(STORAGE_KEY, String(next));
    } catch {
      /* ignore */
    }
    // localStorage writes do not fire `storage` in the tab that made them.
    window.dispatchEvent(new Event(PANEL_PREF_EVENT));
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return props.inputs.filter((input) => {
      if (kinds.length > 0 && !kinds.includes(input.kind)) return false;
      if (!q) return true;
      return (
        input.name.toLowerCase().includes(q) ||
        (input.description ?? "").toLowerCase().includes(q) ||
        (input.fileName ?? "").toLowerCase().includes(q) ||
        input.documents.some((d) => d.name.toLowerCase().includes(q))
      );
    });
  }, [props.inputs, query, kinds]);

  const live = filtered.filter((i) => !i.removedAt);
  const removed = filtered.filter((i) => i.removedAt);
  const failed = props.inputs.filter((i) => i.status === "failed" || i.status === "unsupported");

  if (!open) {
    return (
      <aside className="hidden shrink-0 border-l border-border bg-sidebar lg:block">
        <div className="sticky top-12 flex w-12 flex-col items-center gap-2 py-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggle(true)}
            aria-expanded={false}
            aria-label="Show the inputs panel"
          >
            <RiSideBarLine className="size-4" />
          </Button>
          <span className="mt-2 text-[11px] font-medium text-muted-foreground [writing-mode:vertical-rl]">
            {props.inputs.length} input{props.inputs.length === 1 ? "" : "s"}
          </span>
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Audit inputs and instructions"
      className="hidden w-[21rem] shrink-0 border-l border-border bg-sidebar lg:block"
    >
      <div className="sticky top-12 flex h-[calc(100dvh-3rem)] flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-2">
          <h2 className="text-sm font-semibold">Inputs</h2>
          <div className="flex items-center gap-1">
            {props.canEdit ? (
              <Button
                variant="ghost"
                size="sm"
                render={<Link href={`/w/${props.slug}/audits/${props.auditId}/revisions`} />}
              >
                <RiAddLine className="size-4" />
                New revision
              </Button>
            ) : null}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggle(false)}
              aria-expanded
              aria-label="Hide the inputs panel"
            >
              <RiArrowRightSLine className="size-4" />
            </Button>
          </div>
        </div>

        <ScrollArea className="min-h-0 flex-1">
          <div className="p-3">
            <Accordion multiple defaultValue={["inputs", "instructions"]} className="w-full">
              {/* ── Instructions as used ─────────────────────────────────── */}
              <AccordionItem value="instructions">
                <AccordionTrigger className="text-sm">
                  Instructions
                  <Badge variant="secondary" className="ml-2">
                    {props.instructions.length}
                  </Badge>
                </AccordionTrigger>
                <AccordionContent>
                  {props.revisionLabel ? (
                    <p className="mb-2 text-xs text-muted-foreground">
                      Exactly as used by {props.revisionLabel}. Editing an instruction in the
                      library does not change this.
                    </p>
                  ) : (
                    <p className="mb-2 text-xs text-muted-foreground">
                      The instruction set is frozen into the revision when the audit runs. This
                      audit has not run yet.
                    </p>
                  )}
                  {props.instructions.length === 0 && !props.customInstructions ? (
                    <p className="text-xs text-muted-foreground">No instructions recorded.</p>
                  ) : (
                    <ol className="space-y-2">
                      {props.instructions.map((entry, index) => (
                        <li
                          key={`${entry.instructionId ?? entry.name}-${index}`}
                          className="rounded-lg border border-border bg-background p-2"
                        >
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="text-xs font-medium">{entry.name}</span>
                            {entry.mandatory ? (
                              <Badge variant="outline" className="text-[10px]">
                                Mandatory
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-[11px] text-muted-foreground">
                            {SOURCE_LABEL[entry.source]}
                            {entry.version ? ` · v${entry.version}` : ""}
                            {entry.category ? ` · ${entry.category.replace(/_/g, " ")}` : ""}
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                            {entry.text}
                          </p>
                        </li>
                      ))}
                      {props.customInstructions ? (
                        <li className="rounded-lg border border-border bg-background p-2">
                          <span className="text-xs font-medium">Audit-specific instructions</span>
                          <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                            {props.customInstructions}
                          </p>
                        </li>
                      ) : null}
                    </ol>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* ── Inputs ───────────────────────────────────────────────── */}
              <AccordionItem value="inputs">
                <AccordionTrigger className="text-sm">
                  Evidence
                  <Badge variant="secondary" className="ml-2">
                    {props.inputs.length}
                  </Badge>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2">
                    {/* The setup page is gone: this panel is where evidence is added once the
                        audit exists, whether before the first run or between revisions. */}
                    {props.canEdit ? (
                      <div className="space-y-2 pb-1">
                        <InputUploader auditId={props.auditId} disabled={false} />
                        <TextInputForm auditId={props.auditId} disabled={false} />
                      </div>
                    ) : null}

                    <div className="relative">
                      <RiSearchLine
                        className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                        aria-hidden
                      />
                      <Input
                        type="search"
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        placeholder="Search inputs"
                        aria-label="Search inputs"
                        className="h-8 pl-8 text-xs"
                      />
                    </div>
                    <ToggleGroup
                      value={kinds}
                      onValueChange={(value: string[]) => setKinds(value)}
                      multiple
                      aria-label="Filter inputs by kind"
                      className="w-full"
                    >
                      {(["file", "text", "integration"] as const).map((kind) => (
                        <ToggleGroupItem
                          key={kind}
                          value={kind}
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs"
                        >
                          {KIND_LABEL[kind]}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>

                    {failed.length > 0 ? (
                      <p className="flex items-start gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/10 p-2 text-[11px] text-amber-700 dark:text-amber-300">
                        <RiErrorWarningLine className="mt-px size-3.5 shrink-0" aria-hidden />
                        <span>
                          {failed.length} input{failed.length === 1 ? "" : "s"} could not be read.
                          They were kept, but nothing in this audit is based on them.
                        </span>
                      </p>
                    ) : null}

                    {props.inputs.length === 0 ? (
                      <p className="py-3 text-xs text-muted-foreground">
                        No evidence has been added to this audit yet.
                      </p>
                    ) : filtered.length === 0 ? (
                      <p className="py-3 text-xs text-muted-foreground">
                        No input matches that search.
                      </p>
                    ) : null}

                    <ul className="space-y-1.5">
                      {live.map((input) => (
                        <InputRow
                          key={input.id}
                          input={input}
                          slug={props.slug}
                          auditId={props.auditId}
                          onPreview={() => setPreview(input)}
                        />
                      ))}
                    </ul>

                    {removed.length > 0 ? (
                      <div className="pt-1">
                        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                          Removed from future revisions
                        </p>
                        <ul className="space-y-1.5">
                          {removed.map((input) => (
                            <InputRow
                              key={input.id}
                              input={input}
                              slug={props.slug}
                              auditId={props.auditId}
                              onPreview={() => setPreview(input)}
                            />
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* ── Data period ──────────────────────────────────────────── */}
              <AccordionItem value="period">
                <AccordionTrigger className="text-sm">Data period</AccordionTrigger>
                <AccordionContent>
                  <dl className="space-y-2 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Audit period</dt>
                      <dd className="font-medium">{props.periodLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Detected in the data</dt>
                      <dd>
                        {props.dataFreshness.length === 0 ? (
                          <span className="text-muted-foreground">
                            The parser did not detect a period in these inputs.
                          </span>
                        ) : (
                          <ul className="mt-0.5 space-y-0.5">
                            {props.dataFreshness.map((line) => (
                              <li key={line} className="font-medium">
                                {line}
                              </li>
                            ))}
                          </ul>
                        )}
                      </dd>
                    </div>
                  </dl>
                </AccordionContent>
              </AccordionItem>

              {/* ── Missing evidence ─────────────────────────────────────── */}
              <AccordionItem value="missing">
                <AccordionTrigger className="text-sm">
                  Missing evidence
                  {props.missingEvidence.length > 0 ? (
                    <Badge variant="outline" className="ml-2">
                      {props.missingEvidence.length}
                    </Badge>
                  ) : null}
                </AccordionTrigger>
                <AccordionContent>
                  {props.missingEvidence.length > 0 ? (
                    <>
                      <p className="mb-1.5 text-[11px] text-muted-foreground">
                        The model reported it could not obtain these while planning the audit.
                      </p>
                      <ul className="mb-3 space-y-1">
                        {props.missingEvidence.map((item) => (
                          <li key={item} className="flex items-start gap-1.5 text-xs">
                            <RiErrorWarningLine
                              className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400"
                              aria-hidden
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <p className="mb-3 text-xs text-muted-foreground">
                      The last run did not report missing evidence.
                    </p>
                  )}
                </AccordionContent>
              </AccordionItem>

              {/* ── History ──────────────────────────────────────────────── */}
              <AccordionItem value="history">
                <AccordionTrigger className="text-sm">Added-input history</AccordionTrigger>
                <AccordionContent>
                  {props.inputs.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nothing has been added yet.</p>
                  ) : (
                    <ol className="space-y-2 border-l border-border pl-3">
                      {props.inputs.map((input) => (
                        <li key={input.id} className="relative text-xs">
                          <span
                            className="absolute -left-[15px] top-1.5 size-1.5 rounded-full bg-border"
                            aria-hidden
                          />
                          <p className="font-medium">{input.name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            Added {formatDateTime(input.createdAt)}
                            {input.addedByEmail ? ` by ${input.addedByEmail}` : ""}
                            {input.version > 1 ? ` · version ${input.version}` : ""}
                          </p>
                          {input.removedAt ? (
                            <p className="text-[11px] text-muted-foreground">
                              Removed {formatDateTime(input.removedAt)} — kept so earlier revisions
                              stay reproducible.
                            </p>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </ScrollArea>
      </div>

      <InputPreviewDialog
        input={preview}
        slug={props.slug}
        auditId={props.auditId}
        onClose={() => setPreview(null)}
      />
    </aside>
  );
}

function InputRow({
  input,
  slug,
  auditId,
  onPreview,
}: {
  input: PanelInput;
  slug: string;
  auditId: string;
  onPreview: () => void;
}) {
  const Icon = KIND_ICON[input.kind];
  const meta: string[] = [];
  if (input.fileSize !== null) {
    const size = formatBytes(input.fileSize);
    if (size) meta.push(size);
  }
  if (input.detectedRowCount !== null) meta.push(`${input.detectedRowCount.toLocaleString()} rows`);
  if (input.documents.length > 0) {
    meta.push(`${input.documents.length} document${input.documents.length === 1 ? "" : "s"}`);
  }

  return (
    <li>
      <button
        type="button"
        onClick={onPreview}
        className={cn(
          "w-full rounded-lg border border-border bg-background p-2 text-left transition-colors",
          "hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          input.removedAt && "opacity-60",
        )}
      >
        <span className="flex items-start gap-2">
          <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium">{input.name}</span>
            <span className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <InputStatusPill status={input.status} />
              {meta.length > 0 ? (
                <span className="text-[11px] text-muted-foreground">{meta.join(" · ")}</span>
              ) : null}
            </span>
            {input.references.length > 0 ? (
              <span className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground">
                <RiCornerDownRightLine className="size-3 shrink-0" aria-hidden />
                Cited {input.references.length}×
              </span>
            ) : null}
            {input.warnings.length > 0 ? (
              <span className="mt-1 flex items-start gap-1 text-[11px] text-amber-700 dark:text-amber-300">
                <RiErrorWarningLine className="mt-px size-3 shrink-0" aria-hidden />
                {input.warnings[0].message}
              </span>
            ) : null}
          </span>
        </span>
      </button>
      <div className="mt-1 flex gap-1 pl-6">
        <Button
          variant="ghost"
          size="sm"
          className="h-6 px-1.5 text-[11px]"
          render={
            <Link
              href={`/w/${slug}/chat/new?audit=${auditId}&input=${input.id}&q=${encodeURIComponent(
                `What does "${input.name}" tell us?`,
              )}`}
            />
          }
        >
          <RiChat3Line className="size-3" />
          Ask AI
        </Button>
      </div>
    </li>
  );
}

/**
 * The preview. It shows what the parser found — sheet names, column headers, row counts, the
 * text it extracted — and never a reconstructed sample of data we did not load.
 */
function InputPreviewDialog({
  input,
  slug,
  auditId,
  onClose,
}: {
  input: PanelInput | null;
  slug: string;
  auditId: string;
  onClose: () => void;
}) {
  return (
    <Dialog open={input !== null} onOpenChange={(next: boolean) => (next ? null : onClose())}>
      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-2xl">
        {input ? (
          <>
            <DialogHeader>
              <DialogTitle className="pr-6">{input.name}</DialogTitle>
              <DialogDescription>
                {KIND_LABEL[input.kind]}
                {input.fileName ? ` · ${input.fileName}` : ""}
                {input.mimeType ? ` · ${input.mimeType}` : ""}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 text-sm">
              <div className="flex flex-wrap items-center gap-3">
                <InputStatusPill status={input.status} />
                {input.parsedAt ? (
                  <span className="text-xs text-muted-foreground">
                    Parsed {formatDateTime(input.parsedAt)}
                  </span>
                ) : null}
                {input.removedAt ? (
                  <Badge variant="outline">Removed from future revisions</Badge>
                ) : null}
              </div>

              {input.description ? (
                <p className="text-sm text-muted-foreground">{input.description}</p>
              ) : null}

              {input.parseError ? (
                <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-medium text-destructive">
                    <RiErrorWarningLine className="size-4 shrink-0" aria-hidden />
                    This input could not be parsed
                  </p>
                  <p className="mt-1 font-mono text-xs text-destructive/90">{input.parseError}</p>
                  <p className="mt-1.5 text-xs text-muted-foreground">
                    It is kept on the audit for the record. Nothing in the output is based on it.
                  </p>
                </div>
              ) : null}

              {input.warnings.length > 0 ? (
                <ul className="space-y-1">
                  {input.warnings.map((warning) => (
                    <li
                      key={warning.code}
                      className="flex items-start gap-1.5 text-xs text-amber-700 dark:text-amber-300"
                    >
                      <RiErrorWarningLine className="mt-0.5 size-3.5 shrink-0" aria-hidden />
                      <span>{warning.message}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              <dl className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3 text-xs">
                <Detail label="Detected period">
                  {input.periods.length > 0
                    ? input.periods
                        .map(
                          (p) =>
                            p.label ??
                            [formatDay(p.start ?? null), formatDay(p.end ?? null)]
                              .filter(Boolean)
                              .join(" – "),
                        )
                        .filter(Boolean)
                        .join(", ")
                    : null}
                </Detail>
                <Detail label="Detected currencies">
                  {input.currencies.length > 0 ? input.currencies.join(", ") : null}
                </Detail>
                <Detail label="Detected entities">
                  {input.entities.length > 0 ? input.entities.join(", ") : null}
                </Detail>
                <Detail label="Data freshness">{input.freshness}</Detail>
                <Detail label="Rows">
                  {input.detectedRowCount !== null ? input.detectedRowCount.toLocaleString() : null}
                </Detail>
                <Detail label="Size">{formatBytes(input.fileSize)}</Detail>
              </dl>

              {input.textExcerpt ? (
                <section>
                  <h3 className="mb-1.5 text-xs font-semibold">Content</h3>
                  <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded-lg border border-border bg-muted/40 p-3 font-mono text-xs">
                    {input.textExcerpt}
                  </pre>
                </section>
              ) : null}

              {input.documents.length > 0 ? (
                <section>
                  <h3 className="mb-1.5 text-xs font-semibold">
                    Parsed documents ({input.documents.length})
                  </h3>
                  <div className="space-y-2">
                    {input.documents.map((doc) => (
                      <div key={doc.id} className="rounded-lg border border-border p-2.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <RiTableLine className="size-3.5 text-muted-foreground" aria-hidden />
                          <span className="text-xs font-medium">{doc.name}</span>
                          <Badge variant="outline" className="text-[10px]">
                            {doc.kind}
                          </Badge>
                          {doc.truncated ? (
                            <Badge variant="outline" className="text-[10px]">
                              Truncated
                            </Badge>
                          ) : null}
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {[
                            doc.sheetName ? `sheet ${doc.sheetName}` : null,
                            doc.pageNumber !== null ? `page ${doc.pageNumber}` : null,
                            doc.rowCount !== null ? `${doc.rowCount.toLocaleString()} rows` : null,
                            doc.colCount !== null ? `${doc.colCount} columns` : null,
                          ]
                            .filter(Boolean)
                            .join(" · ") || "No shape recorded"}
                        </p>
                        {doc.summary ? (
                          <p className="mt-1 text-xs text-muted-foreground">{doc.summary}</p>
                        ) : null}
                        {doc.columns.length > 0 ? (
                          <div className="mt-2 overflow-x-auto">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="text-[11px]">Column</TableHead>
                                  <TableHead className="text-[11px]">Type</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {doc.columns.map((column) => (
                                  <TableRow key={column.key}>
                                    <TableCell className="py-1 text-xs">{column.label}</TableCell>
                                    <TableCell className="py-1 text-xs text-muted-foreground">
                                      {column.type}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ) : null}
                        {doc.excerpt ? (
                          <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-2 font-mono text-[11px]">
                            {doc.excerpt}
                          </pre>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <section>
                <h3 className="mb-1.5 text-xs font-semibold">Where this input was used</h3>
                {input.references.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Nothing in the current revision cites this input.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {input.references.map((ref) => (
                      <li key={`${ref.kind}-${ref.id}-${ref.locator ?? ""}`}>
                        <a
                          href={`#${ref.kind}-${ref.id}`}
                          onClick={onClose}
                          className="flex items-start gap-1.5 rounded-md px-1.5 py-1 text-xs hover:bg-accent focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                        >
                          <RiCornerDownRightLine
                            className="mt-0.5 size-3 shrink-0 text-muted-foreground"
                            aria-hidden
                          />
                          <span>
                            {ref.label}
                            {ref.locator ? (
                              <span className="text-muted-foreground"> — {ref.locator}</span>
                            ) : null}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  render={
                    <Link
                      href={`/w/${slug}/chat/new?audit=${auditId}&input=${input.id}&q=${encodeURIComponent(
                        `What does "${input.name}" tell us?`,
                      )}`}
                    />
                  }
                >
                  <RiChat3Line className="size-4" />
                  Ask AI about this input
                </Button>
                <DialogClose render={<Button variant="ghost" size="sm" />}>
                  <RiCloseLine className="size-4" />
                  Close
                </DialogClose>
              </div>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-medium">
        {children ? children : <span className="font-normal text-muted-foreground">Not detected</span>}
      </dd>
    </div>
  );
}
