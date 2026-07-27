"use client";

import { useActionState, useId } from "react";
import { RiErrorWarningLine, RiPlayLine } from "@remixicon/react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { runAudit, type RunAuditState } from "@/server/actions/audit";

/**
 * Starting the run (PRD §8.7).
 *
 * A run always produces a new revision — nothing is overwritten — so the reason field is worth
 * filling in: it is what a reviewer reads six months later when comparing two revisions.
 */
export function RunButton({
  auditId,
  workspaceSlug,
  blockedReason,
  hasRevisions,
}: {
  auditId: string;
  workspaceSlug: string;
  /** Non-null disables the button and is shown verbatim. */
  blockedReason: string | null;
  hasRevisions: boolean;
}) {
  const [state, formAction, pending] = useActionState<RunAuditState, FormData>(runAudit, {});
  const reasonId = useId();

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="auditId" value={auditId} />
      <input type="hidden" name="workspaceSlug" value={workspaceSlug} />

      {state.error ? (
        <Alert variant="destructive">
          <RiErrorWarningLine aria-hidden="true" />
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      ) : null}

      {hasRevisions ? (
        <Field className="max-w-md">
          <FieldLabel htmlFor={reasonId}>Why are you re-running this audit?</FieldLabel>
          <Input
            id={reasonId}
            name="reason"
            disabled={pending || blockedReason !== null}
            placeholder="Added the September bank statements"
          />
          <FieldDescription>
            Stored on the new revision. The earlier revision stays exactly as it was published.
          </FieldDescription>
        </Field>
      ) : null}

      {/* Only the reason a run is *not* possible is worth saying; describing what a run does
          is not news to anyone who got this far. */}
      <div className="flex flex-wrap items-center justify-end gap-3">
        {blockedReason ? (
          <p className="text-xs text-muted-foreground" aria-live="polite">
            {blockedReason}
          </p>
        ) : null}
        <Button type="submit" disabled={pending || blockedReason !== null}>
          {pending ? <Spinner aria-hidden="true" /> : <RiPlayLine aria-hidden="true" />}
          {pending ? "Starting…" : hasRevisions ? "Run again" : "Run audit"}
        </Button>
      </div>
    </form>
  );
}
