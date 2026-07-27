"use client";

import { useActionState, useId, useMemo, useState } from "react";
import { RiCheckLine, RiErrorWarningLine, RiFileList3Line, RiHistoryLine } from "@remixicon/react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { InputUploader } from "@/components/audit/input-uploader";
import { DOMAIN_LABEL } from "@/components/audit/labels";
import { RunButton } from "@/components/audit/run-button";
import { PeriodFields } from "@/components/audit/period-fields";
import type { AuditDomain } from "@/lib/ai/blocks/types";
import { createAudit, type CreateAuditState } from "@/server/actions/audit";

export type PreviousAuditOption = {
  id: string;
  name: string;
  domain: AuditDomain;
  periodLabel: string | null;
  status: string;
  updatedAt: string;
};

export type NewAuditFormProps = {
  workspaceSlug: string;
  previousAudits: PreviousAuditOption[];
  entities: { id: string; legalName: string }[];
  clients: { id: string; name: string }[];
  /** 1–12, from the workspace. Decides where the offered periods begin. */
  fiscalYearStartMonth: number;
  /** Preselects the library the user started from. */
  initialDomain: AuditDomain | null;
  /** Preselects an audit to copy the setup from. */
  initialFromAuditId: string | null;
};

type Mode = "blank" | "previous";

/**
 * Starting an audit.
 *
 * An audit begins either empty or as a copy of one you have already run. There is no
 * library of prewritten methods to pick from — the instructions are yours, written on the
 * audit itself, and the way to reuse them is to copy the audit that carries them.
 */
export function NewAuditForm({
  workspaceSlug,
  previousAudits,
  entities,
  clients,
  fiscalYearStartMonth,
  initialDomain,
  initialFromAuditId,
}: NewAuditFormProps) {
  const [state, formAction, pending] = useActionState<CreateAuditState, FormData>(createAudit, {});

  const [mode, setMode] = useState<Mode>(initialFromAuditId ? "previous" : "blank");
  const [fromAuditId, setFromAuditId] = useState<string | null>(initialFromAuditId);
  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);

  const nameId = useId();
  const objectiveId = useId();
  const scopeId = useId();
  const entityId = useId();
  const clientId = useId();

  const selectedPrevious = useMemo(
    () => previousAudits.find((a) => a.id === fromAuditId) ?? null,
    [previousAudits, fromAuditId],
  );

  /** The effective name: what the user typed, else a default derived from the source audit. */
  const suggestedName = selectedPrevious ? `${selectedPrevious.name} (new run)` : "";
  const nameValue = nameTouched ? name : name || suggestedName;

  // A blank audit takes the domain of the library it was started from; a copy inherits the
  // source audit's.
  const submittedDomain: AuditDomain =
    mode === "previous" && selectedPrevious ? selectedPrevious.domain : (initialDomain ?? "general");

  // Nothing to copy from: the tab shows its empty state alone, with no details to fill in
  // and no way forward until the user goes back to a blank audit.
  const emptyPrevious = mode === "previous" && previousAudits.length === 0;

  const blocked =
    mode === "previous" && !selectedPrevious
      ? "Choose the audit to copy the setup from."
      : null;

  // The audit exists from here on. Evidence needs an id to attach to, so this is the first
  // moment it can be collected — and the run starts from here rather than from a page the
  // user would otherwise have to be walked to.
  if (state.auditId) {
    return (
      <EvidenceStep auditId={state.auditId} workspaceSlug={workspaceSlug} />
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-6" noValidate>
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
      <input
        type="hidden"
        name="fromAuditId"
        value={mode === "previous" && selectedPrevious ? selectedPrevious.id : ""}
      />
      <input type="hidden" name="domain" value={submittedDomain} />

      {state.error ? (
        <Alert variant="destructive">
          <RiErrorWarningLine aria-hidden="true" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      <section aria-labelledby="start-from-heading" className="flex flex-col gap-3">
        <h2 id="start-from-heading" className="font-heading text-sm font-semibold">
          Start from
        </h2>

        <Tabs value={mode} onValueChange={(value) => setMode(value as Mode)}>
          <TabsList>
            <TabsTrigger value="blank">
              <RiFileList3Line aria-hidden="true" />
              Blank audit
            </TabsTrigger>
            <TabsTrigger value="previous">
              <RiHistoryLine aria-hidden="true" />
              A previous audit
            </TabsTrigger>
          </TabsList>

          <TabsContent value="previous" className="mt-4 flex flex-col gap-3">
            {previousAudits.length === 0 ? (
              <Empty className="rounded-lg border border-dashed border-border py-12">
                <EmptyHeader>
                  <EmptyMedia variant="icon">
                    <RiHistoryLine aria-hidden="true" />
                  </EmptyMedia>
                  <EmptyTitle>No earlier audits yet</EmptyTitle>
                  <EmptyDescription>
                    Once you have run an audit in this workspace, you can start a new one
                    from its setup. Begin with a blank audit for now.
                  </EmptyDescription>
                </EmptyHeader>
                <EmptyContent>
                  <Button type="button" variant="outline" onClick={() => setMode("blank")}>
                    <RiFileList3Line aria-hidden="true" />
                    Start a blank audit
                  </Button>
                </EmptyContent>
              </Empty>
            ) : (
              <ul className="max-h-72 divide-y divide-border overflow-y-auto rounded-lg border border-border">
                {previousAudits.map((audit) => {
                  const isSelected = audit.id === fromAuditId;
                  return (
                    <li key={audit.id}>
                      <button
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setFromAuditId((c) => (c === audit.id ? null : audit.id))}
                        className={
                          isSelected
                            ? "flex w-full items-center gap-3 bg-accent px-3 py-2.5 text-left focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            : "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        }
                      >
                        {isSelected ? (
                          <RiCheckLine aria-hidden="true" className="size-4 shrink-0" />
                        ) : (
                          <span aria-hidden="true" className="size-4 shrink-0" />
                        )}
                        <span className="flex min-w-0 flex-1 flex-col">
                          <span className="truncate text-sm font-medium">{audit.name}</span>
                          <span className="truncate text-xs text-muted-foreground">
                            {DOMAIN_LABEL[audit.domain]}
                            {audit.periodLabel ? ` · ${audit.periodLabel}` : ""} · updated{" "}
                            {audit.updatedAt}
                          </span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </TabsContent>
        </Tabs>
      </section>

      {/* Hidden with CSS, not unmounted: the objective and scope fields are uncontrolled,
          so unmounting them would discard whatever was typed before switching tabs. */}
      <FieldSet className={emptyPrevious ? "hidden" : undefined}>
        {/* With no audit to copy there is only one path through the form, so the heading
            has nothing to distinguish itself from. */}
        {previousAudits.length > 0 ? (
          <>
            <FieldLegend variant="label">Audit details</FieldLegend>
            <FieldDescription>
              You can change all of this in the setup step before the audit runs.
            </FieldDescription>
          </>
        ) : null}

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor={nameId}>Audit name</FieldLabel>
            <Input
              id={nameId}
              name="name"
              required
              disabled={pending}
              value={nameValue}
              onChange={(event) => {
                setNameTouched(true);
                setName(event.target.value);
              }}
              placeholder="Q2 2026 journal entry review"
            />
            {suggestedName && !nameTouched ? (
              <FieldDescription>Prefilled from your selection. Edit it freely.</FieldDescription>
            ) : null}
          </Field>

          <PeriodFields fiscalYearStartMonth={fiscalYearStartMonth} disabled={pending} />

          <Field>
            <FieldLabel htmlFor={objectiveId}>Objective</FieldLabel>
            <Textarea
              id={objectiveId}
              name="objective"
              rows={3}
              disabled={pending}
              placeholder="What this audit is meant to establish."
            />
          </Field>

          <Field>
            <FieldLabel htmlFor={scopeId}>Scope</FieldLabel>
            <Textarea
              id={scopeId}
              name="scope"
              rows={2}
              disabled={pending}
              placeholder="Entities, accounts, or transaction types this audit covers."
            />
          </Field>

          {entities.length > 0 ? (
            <Field className="max-w-sm">
              <FieldLabel htmlFor={entityId}>Entity</FieldLabel>
              <Select name="entityId" defaultValue="" disabled={pending}>
                <SelectTrigger id={entityId} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Not entity-specific</SelectItem>
                  {entities.map((entity) => (
                    <SelectItem key={entity.id} value={entity.id}>
                      {entity.legalName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldDescription>
                Entity-scoped mandatory instructions only apply when an entity is set.
              </FieldDescription>
            </Field>
          ) : null}

          {clients.length > 0 ? (
            <Field className="max-w-sm">
              <FieldLabel htmlFor={clientId}>Client</FieldLabel>
              <Select name="clientId" defaultValue="" disabled={pending}>
                <SelectTrigger id={clientId} className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No client</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          ) : null}
        </FieldGroup>
      </FieldSet>

      <div
        className={
          emptyPrevious
            ? "hidden"
            : "flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
        }
      >
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {blocked}
        </p>
        <Button type="submit" disabled={pending || blocked !== null}>
          {pending ? <Spinner aria-hidden="true" /> : null}
          {pending ? "Creating…" : "Continue"}
        </Button>
      </div>
    </form>
  );
}

/**
 * Second half of the dialog: drop the files, run it.
 *
 * Nothing else belongs here — the audit already exists, so anything typed now can be typed
 * later on the audit itself. Written context lives in the panel beside the results.
 */
function EvidenceStep({
  auditId,
  workspaceSlug,
}: {
  auditId: string;
  workspaceSlug: string;
}) {
  return (
    <div className="flex flex-col gap-5">
      <InputUploader auditId={auditId} disabled={false} />

      <RunButton
        auditId={auditId}
        workspaceSlug={workspaceSlug}
        blockedReason={null}
        hasRevisions={false}
      />
    </div>
  );
}
