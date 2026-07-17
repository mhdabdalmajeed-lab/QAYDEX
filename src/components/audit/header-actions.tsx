"use client";

import {
  RiAddLine,
  RiArchiveLine,
  RiDeleteBinLine,
  RiDownloadLine,
  RiEditLine,
  RiEyeLine,
  RiFileCopyLine,
  RiGitBranchLine,
  RiLoader4Line,
  RiMore2Line,
  RiPlayLine,
  RiShareLine,
  RiShieldCheckLine,
} from "@remixicon/react";
import Link from "next/link";
import { useActionState, useState, useTransition } from "react";

import {
  AlertDialog,
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
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteAudit,
  duplicateAudit,
  runAudit,
  setAuditStatus,
  type RunAuditState,
} from "@/server/actions/audit";

/**
 * The audit header actions (PRD §19.4).
 *
 * Two rules shape this menu:
 *  - Everything a role cannot do is *absent*, not disabled — a greyed-out "Approve" invites a
 *    support ticket, and the server would reject it anyway (guards run inside each action).
 *  - Destructive and irreversible things get a confirmation that says what actually happens,
 *    including that a new revision never overwrites the old one.
 */

export type HeaderActionsProps = {
  slug: string;
  auditId: string;
  auditName: string;
  status: string;
  hasRevision: boolean;
  isRunning: boolean;
  can: {
    run: boolean;
    edit: boolean;
    create: boolean;
    review: boolean;
    approve: boolean;
    remove: boolean;
    exportAudit: boolean;
    share: boolean;
  };
};

export function HeaderActions(props: HeaderActionsProps) {
  const [reviseOpen, setReviseOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const base = `/w/${props.slug}/audits/${props.auditId}`;

  return (
    <div className="flex items-center gap-2">
      {props.can.review && props.hasRevision && props.status !== "review_needed" ? (
        <StatusButton
          auditId={props.auditId}
          status="review_needed"
          icon={<RiEyeLine className="size-4" />}
          label="Mark reviewed"
          variant="outline"
        />
      ) : null}

      {props.can.approve && props.hasRevision && props.status !== "approved" ? (
        <StatusButton
          auditId={props.auditId}
          status="approved"
          icon={<RiShieldCheckLine className="size-4" />}
          label="Mark approved"
          variant="default"
        />
      ) : null}

      {props.can.run && !props.isRunning ? (
        <Button size="sm" variant="outline" onClick={() => setReviseOpen(true)}>
          {props.hasRevision ? (
            <RiGitBranchLine className="size-4" />
          ) : (
            <RiPlayLine className="size-4" />
          )}
          {props.hasRevision ? "Create revision" : "Run audit"}
        </Button>
      ) : null}

      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button size="icon" variant="ghost" aria-label="More audit actions" />}
        >
          <RiMore2Line className="size-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-60">
          <DropdownMenuLabel>This audit</DropdownMenuLabel>
          <DropdownMenuGroup>
            {props.can.share ? (
              <DropdownMenuItem nativeButton={false} render={<Link href={`${base}/share`} />}>
                <RiShareLine className="size-4" />
                Share
              </DropdownMenuItem>
            ) : null}
            {props.can.exportAudit ? (
              <DropdownMenuItem nativeButton={false} render={<Link href={`${base}/export`} />}>
                <RiDownloadLine className="size-4" />
                Export
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem nativeButton={false} render={<Link href={`${base}/revisions`} />}>
              <RiGitBranchLine className="size-4" />
              Compare revisions
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator />
          <DropdownMenuLabel>Change it</DropdownMenuLabel>
          <DropdownMenuGroup>
            {props.can.edit ? (
              <>
                <DropdownMenuItem nativeButton={false} render={<Link href={`${base}/edit#inputs`} />}>
                  <RiAddLine className="size-4" />
                  Add evidence
                </DropdownMenuItem>
                <DropdownMenuItem nativeButton={false} render={<Link href={`${base}/edit#instructions`} />}>
                  <RiEditLine className="size-4" />
                  Edit instructions for a new revision
                </DropdownMenuItem>
              </>
            ) : null}
            {props.can.create ? <DuplicateItem slug={props.slug} auditId={props.auditId} /> : null}
          </DropdownMenuGroup>

          {props.can.remove ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {props.status !== "archived" ? (
                  <DropdownMenuItem onClick={() => setArchiveOpen(true)}>
                    <RiArchiveLine className="size-4" />
                    Archive
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem variant="destructive" onClick={() => setDeleteOpen(true)}>
                  <RiDeleteBinLine className="size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>

      <ReviseDialog
        open={reviseOpen}
        onOpenChange={setReviseOpen}
        slug={props.slug}
        auditId={props.auditId}
        hasRevision={props.hasRevision}
      />

      <ConfirmDialog
        open={archiveOpen}
        onOpenChange={setArchiveOpen}
        title={`Archive “${props.auditName}”?`}
        description="It leaves the working set but stays fully readable, and its revisions are untouched. You can restore it from the archived list."
        confirmLabel="Archive"
        action={setAuditStatus}
        fields={{ auditId: props.auditId, status: "archived" }}
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete “${props.auditName}”?`}
        description="This removes the audit, every revision, all findings and all uploaded evidence. It cannot be undone. If you only want it out of the way, archive it instead."
        confirmLabel="Delete permanently"
        destructive
        action={deleteAudit}
        fields={{ auditId: props.auditId, workspaceSlug: props.slug }}
      />
    </div>
  );
}

function StatusButton({
  auditId,
  status,
  icon,
  label,
  variant,
}: {
  auditId: string;
  status: string;
  icon: React.ReactNode;
  label: string;
  variant: "default" | "outline";
}) {
  const [pending, startTransition] = useTransition();
  return (
    <form
      action={(formData: FormData) => {
        startTransition(async () => {
          await setAuditStatus(formData);
        });
      }}
    >
      <input type="hidden" name="auditId" value={auditId} />
      <input type="hidden" name="status" value={status} />
      <Button type="submit" size="sm" variant={variant} disabled={pending}>
        {pending ? <RiLoader4Line className="size-4 animate-spin" /> : icon}
        {label}
      </Button>
    </form>
  );
}

function DuplicateItem({ slug, auditId }: { slug: string; auditId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <DropdownMenuItem
      closeOnClick={false}
      onClick={() => {
        const formData = new FormData();
        formData.set("auditId", auditId);
        formData.set("workspaceSlug", slug);
        startTransition(async () => {
          await duplicateAudit(formData);
        });
      }}
    >
      {pending ? (
        <RiLoader4Line className="size-4 animate-spin" />
      ) : (
        <RiFileCopyLine className="size-4" />
      )}
      Duplicate
    </DropdownMenuItem>
  );
}

/**
 * "Create revision" is the only way to re-run an audit, and it is worth being explicit that the
 * existing result survives — that immutability is the product's promise, not a limitation.
 */
function ReviseDialog({
  open,
  onOpenChange,
  slug,
  auditId,
  hasRevision,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  slug: string;
  auditId: string;
  hasRevision: boolean;
}) {
  const initial: RunAuditState = {};
  const [state, formAction, pending] = useActionState(runAudit, initial);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form action={formAction}>
          <DialogHeader>
            <DialogTitle>{hasRevision ? "Create a new revision" : "Run this audit"}</DialogTitle>
            <DialogDescription>
              {hasRevision
                ? "The current revision stays exactly as it is. This runs the audit again against today's inputs and instructions and publishes the result as the next revision."
                : "The audit runs against the evidence and instructions attached to it. The result is published as revision 1."}
            </DialogDescription>
          </DialogHeader>

          <input type="hidden" name="auditId" value={auditId} />
          <input type="hidden" name="workspaceSlug" value={slug} />

          <div className="py-3">
            <Field>
              <FieldLabel htmlFor="revision-reason">Why are you re-running it?</FieldLabel>
              <Textarea
                id="revision-reason"
                name="reason"
                rows={3}
                placeholder="e.g. Added the November bank statements."
              />
              <FieldDescription>
                Optional, but it is what the revision history will show a reviewer in six months.
              </FieldDescription>
            </Field>
          </div>

          {state.error ? (
            <p aria-live="polite" className="mb-3 text-sm text-destructive">
              {state.error}
            </p>
          ) : null}

          <DialogFooter>
            <DialogClose render={<Button type="button" variant="outline" />}>Cancel</DialogClose>
            <Button type="submit" disabled={pending}>
              {pending ? <RiLoader4Line className="size-4 animate-spin" /> : null}
              {hasRevision ? "Create revision" : "Run audit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel,
  destructive,
  action,
  fields,
}: {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  action: (formData: FormData) => Promise<void>;
  fields: Record<string, string>;
}) {
  const [pending, startTransition] = useTransition();
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <form
          action={(formData: FormData) => {
            startTransition(async () => {
              await action(formData);
            });
          }}
        >
          {Object.entries(fields).map(([name, value]) => (
            <input key={name} type="hidden" name={name} value={value} />
          ))}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <Button type="submit" variant={destructive ? "destructive" : "default"} disabled={pending}>
              {pending ? <RiLoader4Line className="size-4 animate-spin" /> : null}
              {confirmLabel}
            </Button>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
