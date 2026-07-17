"use client";

import { useId, useState, useTransition } from "react";
import { RiCheckLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { updateAuditDetails } from "@/server/actions/audit";

export type AuditDetailsFormProps = {
  auditId: string;
  name: string;
  objective: string | null;
  scope: string | null;
  periodLabel: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  customInstructions: string | null;
  disabled: boolean;
};

/**
 * The audit's own details, including its audit-specific instructions (PRD §8.4).
 *
 * Audit-specific text is edited here rather than in the instruction library on purpose: it
 * belongs to this audit alone and is never reused.
 */
export function AuditDetailsForm(props: AuditDetailsFormProps) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nameId = useId();
  const objectiveId = useId();
  const scopeId = useId();
  const periodLabelId = useId();
  const periodStartId = useId();
  const periodEndId = useId();
  const customId = useId();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    setError(null);
    startTransition(async () => {
      try {
        await updateAuditDetails(formData);
        setSaved(true);
        window.setTimeout(() => setSaved(false), 3000);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not save those changes.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-5">
      <input type="hidden" name="auditId" value={props.auditId} />

      <FieldGroup>
        <Field>
          <FieldLabel htmlFor={nameId}>Audit name</FieldLabel>
          <Input
            id={nameId}
            name="name"
            required
            defaultValue={props.name}
            disabled={props.disabled || pending}
          />
        </Field>

        <div className="grid gap-5 md:grid-cols-3">
          <Field>
            <FieldLabel htmlFor={periodLabelId}>Period</FieldLabel>
            <Input
              id={periodLabelId}
              name="periodLabel"
              defaultValue={props.periodLabel ?? ""}
              placeholder="Q2 2026"
              disabled={props.disabled || pending}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={periodStartId}>Period start</FieldLabel>
            <Input
              id={periodStartId}
              name="periodStart"
              type="date"
              defaultValue={props.periodStart ?? ""}
              disabled={props.disabled || pending}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={periodEndId}>Period end</FieldLabel>
            <Input
              id={periodEndId}
              name="periodEnd"
              type="date"
              defaultValue={props.periodEnd ?? ""}
              disabled={props.disabled || pending}
            />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor={objectiveId}>Objective</FieldLabel>
          <Textarea
            id={objectiveId}
            name="objective"
            rows={3}
            defaultValue={props.objective ?? ""}
            disabled={props.disabled || pending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={scopeId}>Scope</FieldLabel>
          <Textarea
            id={scopeId}
            name="scope"
            rows={2}
            defaultValue={props.scope ?? ""}
            disabled={props.disabled || pending}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor={customId}>Instructions for this audit only</FieldLabel>
          <Textarea
            id={customId}
            name="customInstructions"
            rows={6}
            defaultValue={props.customInstructions ?? ""}
            disabled={props.disabled || pending}
            placeholder={
              "Focus on journal entries posted after business hours.\n" +
              "Ignore immaterial foreign exchange differences.\n" +
              "Explain findings for a non-accounting executive audience."
            }
          />
          <FieldDescription>
            These sit below your saved instructions in the authority order, and are not reused by
            other audits. Write them the way you would brief a colleague.
          </FieldDescription>
        </Field>
      </FieldGroup>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-3">
        <Button type="submit" variant="outline" disabled={props.disabled || pending}>
          {pending ? <Spinner aria-hidden="true" /> : null}
          {pending ? "Saving…" : "Save details"}
        </Button>
        <p aria-live="polite" className="text-xs text-muted-foreground">
          {saved ? (
            <span className="inline-flex items-center gap-1">
              <RiCheckLine aria-hidden="true" className="size-3.5" />
              Saved
            </span>
          ) : null}
        </p>
      </div>
    </form>
  );
}
