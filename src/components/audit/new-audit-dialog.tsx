"use client";

import { useEffect, useState, type ReactNode } from "react";
import { RiErrorWarningLine } from "@remixicon/react";

import { NewAuditForm } from "@/components/audit/new-audit-form";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Spinner } from "@/components/ui/spinner";
import type { AuditDomain } from "@/lib/ai/blocks/types";
import { loadNewAuditOptions, type NewAuditOptions } from "@/server/actions/audit";

export type NewAuditDialogProps = {
  workspaceSlug: string;
  /** The trigger — a `<Button>` in every current call site. */
  children: ReactNode;
  /** Preselects the category, from the library the user started in. */
  domain?: AuditDomain | null;
  /** Preselects an audit to copy the setup from. */
  fromAuditId?: string | null;
};

/**
 * Starting an audit is a dialog, not a page.
 *
 * It is reached from six libraries — the audit library and the five domain libraries — plus
 * the workspace overview. As a route that meant leaving the list you were reading, and coming
 * back to it only by way of the browser's back button; as a dialog the list stays behind it,
 * which is what the user is choosing from in the first place.
 *
 * The form's own options are fetched on first open rather than by whichever page hosts the
 * trigger — see `loadNewAuditOptions`. Submission still redirects to the new audit's setup,
 * so the dialog is unmounted by the navigation and never needs to close itself.
 */
export function NewAuditDialog({
  workspaceSlug,
  children,
  domain = null,
  fromAuditId = null,
}: NewAuditDialogProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<NewAuditOptions | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Load once, on the first open: the options do not change while the dialog is being
    // filled in.
    if (!open || options || error) return;

    let cancelled = false;
    loadNewAuditOptions(workspaceSlug)
      .then((result) => {
        if (cancelled) return;
        if (result.ok) setOptions(result.options);
        else setError(result.error);
      })
      .catch(() => {
        if (cancelled) return;
        setError("This could not be loaded. Close this and try again.");
      });

    return () => {
      cancelled = true;
    };
  }, [open, options, error, workspaceSlug]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={children as React.ReactElement} />
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-3xl flex-col gap-4 overflow-hidden p-0 sm:max-w-3xl lg:max-w-4xl">
        <DialogHeader className="px-5 pt-5">
          <DialogTitle>New audit</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
          {error ? (
            <Alert variant="destructive">
              <RiErrorWarningLine aria-hidden="true" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : options ? (
            <NewAuditForm
              workspaceSlug={workspaceSlug}
              previousAudits={options.previousAudits}
              entities={options.entities}
              clients={options.clients}
              fiscalYearStartMonth={options.fiscalYearStartMonth}
              initialDomain={domain}
              initialFromAuditId={
                fromAuditId && options.previousAudits.some((a) => a.id === fromAuditId)
                  ? fromAuditId
                  : null
              }
            />
          ) : (
            <div
              className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground"
              role="status"
            >
              <Spinner />
              Loading…
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
