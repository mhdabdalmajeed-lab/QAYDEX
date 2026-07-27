"use client";

import { useState } from "react";
import { RiEditLine } from "@remixicon/react";

import { AuditDetailsForm, type AuditDetailsFormProps } from "@/components/audit/audit-details-form";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

/**
 * Editing an audit's details.
 *
 * A dialog rather than a route: the audit page is for results now, and the details were
 * written once in the new-audit dialog. Correcting a name or a period is a small
 * interruption, not a destination.
 */
export function EditDetailsDialog(props: Omit<AuditDetailsFormProps, "disabled">) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <DropdownMenuItem
        onSelect={(event) => {
          // The menu closes on select; opening the dialog in the same tick would race it.
          event.preventDefault();
          setOpen(true);
        }}
      >
        <RiEditLine className="size-4" />
        Edit audit details
      </DropdownMenuItem>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Audit details</DialogTitle>
            <DialogDescription>
              Changes apply to the next run. Revisions already produced keep the details they
              were run under.
            </DialogDescription>
          </DialogHeader>

          <AuditDetailsForm {...props} disabled={false} />
        </DialogContent>
      </Dialog>
    </>
  );
}
