"use client";

import { useId, useRef, useState, useTransition } from "react";
import { RiAddLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { addTextInput } from "@/server/actions/audit";

/**
 * Written context (PRD §8.5) — policies, management explanations, known concerns.
 *
 * This is evidence too: it is stored as an input, cited like one, and it is what stops the
 * model from inventing an explanation for something a human could simply have told it.
 */
export function TextInputForm({ auditId, disabled }: { auditId: string; disabled: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const nameId = useId();
  const contentId = useId();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    setError(null);
    startTransition(async () => {
      try {
        await addTextInput(formData);
        form.reset();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not add that context.");
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={onSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="auditId" value={auditId} />

      <Field className="max-w-sm">
        <FieldLabel htmlFor={nameId}>Title</FieldLabel>
        <Input
          id={nameId}
          name="name"
          disabled={disabled || pending}
          placeholder="Revenue recognition policy"
        />
        <FieldDescription>Defaults to “Written context” if you leave it empty.</FieldDescription>
      </Field>

      <Field>
        <FieldLabel htmlFor={contentId}>Context</FieldLabel>
        <Textarea
          id={contentId}
          name="content"
          rows={5}
          required
          disabled={disabled || pending}
          placeholder={
            "Anything the numbers do not say on their own: the business model, a known " +
            "reclassification, an explanation management already gave you, a previous finding."
          }
        />
      </Field>

      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div>
        <Button type="submit" variant="outline" disabled={disabled || pending}>
          {pending ? <Spinner aria-hidden="true" /> : <RiAddLine aria-hidden="true" />}
          {pending ? "Adding…" : "Add written context"}
        </Button>
      </div>
    </form>
  );
}
