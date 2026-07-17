"use client";

import { useState, useTransition } from "react";
import { RiAlertLine, RiCheckLine, RiScales3Line } from "@remixicon/react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import type { InstructionConflict } from "@/db/schema";
import { checkConflicts, resolveConflict } from "@/server/actions/audit";

const RESOLUTION_LABEL: Record<string, string> = {
  keep_a: "Kept the first instruction",
  keep_b: "Kept the second instruction",
  keep_both: "Kept both",
  manual: "Resolved manually",
};

/**
 * Instruction conflicts (PRD §9.3).
 *
 * The platform must never silently pick a winner. It states what cannot both be honoured and
 * makes the user decide — and it refuses to run until every conflict has a decision.
 */
export function ConflictResolver({
  auditId,
  conflicts,
  checked,
  disabled,
}: {
  auditId: string;
  conflicts: InstructionConflict[];
  /** True once `checkConflicts` has run against the current instruction set. */
  checked: boolean;
  disabled: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [busyIndex, setBusyIndex] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  const unresolved = conflicts.filter((conflict) => !conflict.resolution);

  function runCheck() {
    setError(null);
    const formData = new FormData();
    formData.set("auditId", auditId);
    startTransition(async () => {
      try {
        await checkConflicts(formData);
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "The conflict check could not be completed.",
        );
      }
    });
  }

  function resolve(index: number, resolution: "keep_a" | "keep_b" | "keep_both") {
    setError(null);
    setBusyIndex(index);
    const formData = new FormData();
    formData.set("auditId", auditId);
    formData.set("index", String(index));
    formData.set("resolution", resolution);
    startTransition(async () => {
      try {
        await resolveConflict(formData);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not record that decision.");
      } finally {
        setBusyIndex(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" onClick={runCheck} disabled={disabled || pending}>
          {pending ? <Spinner aria-hidden="true" /> : <RiScales3Line aria-hidden="true" />}
          {pending ? "Checking…" : "Check for conflicts"}
        </Button>
        <p className="text-xs text-muted-foreground" aria-live="polite">
          {!checked
            ? "Not checked against the current instruction set yet."
            : conflicts.length === 0
              ? "Checked — no instruction contradicts another."
              : `${conflicts.length} conflict${conflicts.length === 1 ? "" : "s"} found · ${unresolved.length} still to decide.`}
        </p>
      </div>

      {error ? (
        <Alert variant="destructive">
          <RiAlertLine aria-hidden="true" />
          <AlertTitle>Conflict check failed</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {unresolved.length > 0 ? (
        <Alert variant="destructive">
          <RiAlertLine aria-hidden="true" />
          <AlertTitle>
            {unresolved.length} unresolved conflict{unresolved.length === 1 ? "" : "s"} — this
            audit cannot run
          </AlertTitle>
          <AlertDescription>
            Two instructions ask for things that cannot both be done. Decide which one this audit
            should follow. The platform will not choose for you.
          </AlertDescription>
        </Alert>
      ) : null}

      {conflicts.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {conflicts.map((conflict, index) => {
            const busy = busyIndex === index;
            return (
              <li
                key={`${conflict.aRef}-${conflict.bRef}-${index}`}
                className="rounded-lg border border-border p-3"
              >
                <div className="flex flex-wrap items-center gap-1.5">
                  {conflict.resolution ? (
                    <Badge variant="secondary">
                      <RiCheckLine aria-hidden="true" />
                      {RESOLUTION_LABEL[conflict.resolution] ?? "Resolved"}
                    </Badge>
                  ) : (
                    <Badge variant="destructive">
                      <RiAlertLine aria-hidden="true" />
                      Needs your decision
                    </Badge>
                  )}
                </div>

                <p className="mt-2 text-sm">{conflict.description}</p>

                <dl className="mt-2 grid gap-2 text-xs sm:grid-cols-2">
                  <div className="rounded-lg border border-border p-2">
                    <dt className="font-medium">First instruction</dt>
                    <dd className="mt-0.5 text-muted-foreground">{conflict.aName}</dd>
                  </div>
                  <div className="rounded-lg border border-border p-2">
                    <dt className="font-medium">Second instruction</dt>
                    <dd className="mt-0.5 text-muted-foreground">{conflict.bName}</dd>
                  </div>
                </dl>

                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                  {busy ? <Spinner aria-hidden="true" className="size-4" /> : null}
                  <Button
                    type="button"
                    size="sm"
                    variant={conflict.resolution === "keep_a" ? "default" : "outline"}
                    disabled={disabled || pending}
                    onClick={() => resolve(index, "keep_a")}
                  >
                    Follow “{truncate(conflict.aName)}”
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={conflict.resolution === "keep_b" ? "default" : "outline"}
                    disabled={disabled || pending}
                    onClick={() => resolve(index, "keep_b")}
                  >
                    Follow “{truncate(conflict.bName)}”
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={conflict.resolution === "keep_both" ? "default" : "outline"}
                    disabled={disabled || pending}
                    onClick={() => resolve(index, "keep_both")}
                  >
                    Keep both and note the tension
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {checked && conflicts.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-4 text-center text-sm text-muted-foreground">
          No contradictions were found in the current instruction set. Change the selection and the
          check runs again.
        </p>
      ) : null}
    </div>
  );
}

function truncate(value: string): string {
  return value.length > 40 ? `${value.slice(0, 39)}…` : value;
}
