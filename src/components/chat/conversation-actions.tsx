"use client";

import { useActionState, useEffect, useId, useState, useTransition } from "react";
import {
  RiArchive2Line,
  RiDeleteBinLine,
  RiEditLine,
  RiInboxUnarchiveLine,
  RiMore2Line,
  RiPushpinFill,
  RiPushpinLine,
} from "@remixicon/react";

import { Alert, AlertDescription } from "@/components/ui/alert";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import {
  deleteConversation,
  renameConversation,
  setConversationArchived,
  setConversationPinned,
  type RenameState,
} from "@/server/actions/chat";

/**
 * Rename · pin · archive · delete (PRD §10.4).
 *
 * The mutations are Server Functions and re-check permission themselves; this is only the
 * control surface. Delete asks first: a conversation holds the reasoning behind decisions
 * someone may have to defend later, and there is no undo.
 */
export function ConversationActions({
  conversationId,
  workspaceSlug,
  title,
  pinned,
  archived,
  /** True on the conversation page, where deleting must navigate off the dead route. */
  returnToList = false,
}: {
  conversationId: string;
  workspaceSlug: string;
  title: string;
  pinned: boolean;
  archived: boolean;
  returnToList?: boolean;
}) {
  const [renaming, setRenaming] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [pending, startTransition] = useTransition();

  const submit = (action: (data: FormData) => Promise<void>, fields: Record<string, string>) => {
    const data = new FormData();
    data.set("conversationId", conversationId);
    data.set("workspaceSlug", workspaceSlug);
    for (const [key, value] of Object.entries(fields)) data.set(key, value);
    startTransition(async () => {
      await action(data);
    });
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              disabled={pending}
              aria-label={`Actions for ${title}`}
            >
              {pending ? <Spinner aria-hidden="true" /> : <RiMore2Line aria-hidden="true" />}
            </Button>
          }
        />
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setRenaming(true)}>
            <RiEditLine aria-hidden="true" />
            Rename
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() =>
              submit(setConversationPinned, { pinned: pinned ? "false" : "true" })
            }
          >
            {pinned ? <RiPushpinFill aria-hidden="true" /> : <RiPushpinLine aria-hidden="true" />}
            {pinned ? "Unpin" : "Pin"}
          </DropdownMenuItem>

          <DropdownMenuItem
            onClick={() =>
              submit(setConversationArchived, { archived: archived ? "false" : "true" })
            }
          >
            {archived ? (
              <RiInboxUnarchiveLine aria-hidden="true" />
            ) : (
              <RiArchive2Line aria-hidden="true" />
            )}
            {archived ? "Unarchive" : "Archive"}
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem variant="destructive" onClick={() => setConfirmingDelete(true)}>
            <RiDeleteBinLine aria-hidden="true" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <RenameDialog
        open={renaming}
        onOpenChange={setRenaming}
        conversationId={conversationId}
        workspaceSlug={workspaceSlug}
        title={title}
      />

      <AlertDialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              The conversation and every message in it go permanently. The audits it was
              grounded in are untouched — their findings and evidence are unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <form
              action={deleteConversation}
              onSubmit={() => setConfirmingDelete(false)}
            >
              <input type="hidden" name="conversationId" value={conversationId} />
              <input type="hidden" name="workspaceSlug" value={workspaceSlug} />
              <input type="hidden" name="returnToList" value={returnToList ? "true" : "false"} />
              <AlertDialogAction type="submit" variant="destructive">
                Delete conversation
              </AlertDialogAction>
            </form>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function RenameDialog({
  open,
  onOpenChange,
  conversationId,
  workspaceSlug,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conversationId: string;
  workspaceSlug: string;
  title: string;
}) {
  const [state, formAction, pending] = useActionState<RenameState, FormData>(
    renameConversation,
    {},
  );
  const titleId = useId();

  useEffect(() => {
    if (state.ok) onOpenChange(false);
  }, [state.ok, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form action={formAction}>
          <input type="hidden" name="conversationId" value={conversationId} />
          <input type="hidden" name="workspaceSlug" value={workspaceSlug} />

          <DialogHeader>
            <DialogTitle>Rename conversation</DialogTitle>
            <DialogDescription>
              A name you will recognise in three months, when you are looking for what you
              asked and why.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            {state.error ? (
              <Alert variant="destructive" className="mb-3">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            ) : null}
            <Field>
              <FieldLabel htmlFor={titleId}>Title</FieldLabel>
              <Input
                id={titleId}
                name="title"
                defaultValue={title}
                maxLength={200}
                required
                autoFocus
              />
            </Field>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner aria-hidden="true" /> : null}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
