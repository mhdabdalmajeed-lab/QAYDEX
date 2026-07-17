"use client";

import { useState, useTransition } from "react";
import { RiArchiveLine, RiCheckLine, RiDeleteBinLine } from "@remixicon/react";
import { toast } from "sonner";

import type { InstructionStatus } from "@/components/instructions/labels";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { deleteInstruction, setInstructionStatus } from "@/server/actions/instruction";

export type InstructionActionsProps = {
  workspaceSlug: string;
  instructionId: string;
  name: string;
  status: InstructionStatus;
  /** Audits pinned to any version of this instruction. Non-zero makes deletion impossible. */
  usedByAudits: number;
};

/**
 * Archive, reactivate, delete.
 *
 * Deletion is only ever offered for an instruction no audit ever attached — the server
 * refuses otherwise, because removing it would sever a completed audit from the words it
 * was generated under (PRD §9.4). Rather than let the user find that out by being told
 * no, the button is replaced by the reason.
 */
export function InstructionActions({
  workspaceSlug,
  instructionId,
  name,
  status,
  usedByAudits,
}: InstructionActionsProps) {
  const [pending, startTransition] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  function changeStatus(next: InstructionStatus) {
    const formData = new FormData();
    formData.set("workspaceSlug", workspaceSlug);
    formData.set("instructionId", instructionId);
    formData.set("status", next);
    startTransition(async () => {
      try {
        await setInstructionStatus(formData);
        toast.success(
          next === "archived"
            ? `"${name}" archived. Audits that used it are unchanged.`
            : `"${name}" is now ${next}.`,
        );
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "That could not be saved.");
      }
    });
  }

  function remove() {
    const formData = new FormData();
    formData.set("workspaceSlug", workspaceSlug);
    formData.set("instructionId", instructionId);
    startTransition(async () => {
      try {
        await deleteInstruction(formData);
      } catch (error) {
        // redirect() throws on success — let Next's own signal through.
        if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
        setConfirmDelete(false);
        toast.error(error instanceof Error ? error.message : "That could not be deleted.");
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {status === "archived" ? (
        <Button variant="outline" size="sm" disabled={pending} onClick={() => changeStatus("active")}>
          <RiCheckLine aria-hidden="true" />
          Reactivate
        </Button>
      ) : (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() => changeStatus("archived")}
        >
          <RiArchiveLine aria-hidden="true" />
          Archive
        </Button>
      )}

      {usedByAudits === 0 ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => setConfirmDelete(true)}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          <RiDeleteBinLine aria-hidden="true" />
          Delete
        </Button>
      ) : (
        <p className="text-xs text-muted-foreground">
          Attached to {usedByAudits} audit{usedByAudits === 1 ? "" : "s"}, so it cannot be
          deleted — those audits must keep resolving to the exact text they ran under. Archive it
          instead.
        </p>
      )}

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{name}”?</AlertDialogTitle>
            <AlertDialogDescription>
              No audit has ever used this instruction, so nothing depends on it. Its text and
              version history are removed permanently. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel render={<Button variant="outline" />}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              render={<Button variant="destructive" />}
              disabled={pending}
              onClick={remove}
            >
              Delete permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
