"use client";

import {
  RiCheckLine,
  RiDeleteBinLine,
  RiErrorWarningLine,
  RiEyeOffLine,
  RiFileCopyLine,
  RiLoader4Line,
  RiShareLine,
  RiTimeLine,
} from "@remixicon/react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { NativeSelect } from "@/components/ui/native-select";
import { Separator } from "@/components/ui/separator";
import {
  createShareLink,
  revokeShareLink,
  type CreateShareLinkState,
  type RevokeShareLinkState,
  type ShareLinkRow,
} from "@/server/actions/share";

/**
 * Create, copy and revoke share links for one audit (PRD §24, §29 P1).
 *
 * A share link is an unauthenticated URL: whoever holds it reads the audit. The dialog says
 * that in plain words rather than in a footnote, because the person clicking "Create link"
 * is the only control left once the link exists.
 *
 * The scope switches are *stored on the link*, not applied at read time — so what the
 * creator chooses here is exactly what the public page will honour, forever, for that link.
 */

export type ShareDialogProps = {
  slug: string;
  auditId: string;
  auditName: string;
  /** The revision the link will pin to, shown so nobody shares a version they did not mean to. */
  currentRevisionNumber: number | null;
  links: ShareLinkRow[];
  // ReactElement, not ReactNode: Base UI's `render` prop clones the element it is given, so a
  // bare string or fragment has nothing to clone and fails to type-check.
  trigger?: React.ReactElement;
};

/**
 * `window.location.origin` and the clock are external stores, not render-time values.
 * Neither changes while the dialog is mounted, so subscribe is a no-op; what matters is that
 * each has an explicit server snapshot, so the server and the first client render agree.
 */
function subscribeNever(): () => void {
  return () => {};
}

function getOrigin(): string {
  return window.location.origin;
}

function getOriginServer(): string {
  return "";
}

// Snapshots must be referentially stable, so the clock is bucketed to the minute: expiry is
// shown to the day, and an unstable snapshot would make useSyncExternalStore loop forever.
function getNow(): number {
  return Math.floor(Date.now() / 60_000) * 60_000;
}

function getNowServer(): number {
  return 0;
}

const EXPIRY_CHOICES = [
  { value: "1", label: "1 day" },
  { value: "7", label: "7 days" },
  { value: "30", label: "30 days" },
  { value: "90", label: "90 days" },
  { value: "365", label: "1 year" },
] as const;

const dateTime = new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" });
const dateOnly = new Intl.DateTimeFormat("en", { dateStyle: "medium" });

type LinkStatus = { kind: "active" | "expired" | "revoked"; label: string };

function statusOf(link: ShareLinkRow, now: number): LinkStatus {
  if (link.revokedAt) {
    return { kind: "revoked", label: `Revoked ${dateOnly.format(link.revokedAt)}` };
  }
  if (link.expiresAt && link.expiresAt.getTime() <= now) {
    return { kind: "expired", label: `Expired ${dateOnly.format(link.expiresAt)}` };
  }
  return {
    kind: "active",
    label: link.expiresAt ? `Expires ${dateOnly.format(link.expiresAt)}` : "No expiry",
  };
}

function scopeSummary(scope: ShareLinkRow["scope"]): string {
  const extras = [
    scope.includeEvidence ? "evidence excerpts" : null,
    scope.includeInternalNotes ? "internal notes" : null,
  ].filter((value): value is string => value !== null);
  if (extras.length === 0) return "Findings and report only";
  return `Findings and report, plus ${extras.join(" and ")}`;
}

export function ShareDialog({
  slug,
  auditId,
  auditName,
  currentRevisionNumber,
  links,
  trigger,
}: ShareDialogProps) {
  const [open, setOpen] = useState(false);
  // `window` and the clock are read through useSyncExternalStore rather than in an effect:
  // both are external state, and reading them during render would make render impure and risk
  // hydrating over a value the server could not have produced. The subscribe callbacks never
  // fire because neither value changes while the dialog is open — the point is the
  // server/client split, which getServerSnapshot expresses honestly.
  const origin = useSyncExternalStore(subscribeNever, getOrigin, getOriginServer);
  const now = useSyncExternalStore(subscribeNever, getNow, getNowServer);

  const [createState, createAction, creating] = useActionState<CreateShareLinkState, FormData>(
    createShareLink,
    {},
  );
  const [revokeState, revokeAction, revoking] = useActionState<RevokeShareLinkState, FormData>(
    revokeShareLink,
    {},
  );

  // `links` arrives from the server component that rendered the dialog, so the list only
  // changes once that page re-renders. The actions revalidate their own route; this pulls the
  // fresh list back into whichever page is actually showing the dialog.
  const router = useRouter();
  const createdToken = createState.token;
  const revokedId = revokeState.revokedId;
  useEffect(() => {
    if (createdToken || revokedId) router.refresh();
  }, [createdToken, revokedId, router]);

  const shareUrl = (token: string) => (origin ? `${origin}/share/${token}` : `/share/${token}`);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button variant="outline" size="sm">
              <RiShareLine aria-hidden="true" />
              Share
            </Button>
          )
        }
      />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Share “{auditName}”</DialogTitle>
          <DialogDescription>
            {currentRevisionNumber === null
              ? "This audit has no published revision yet. Run it before sharing — a link always points at one fixed revision."
              : `A link publishes revision ${currentRevisionNumber} exactly as it stands now. Later revisions are not shared by this link.`}
          </DialogDescription>
        </DialogHeader>

        <div
          className="flex items-start gap-2.5 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm"
          role="note"
        >
          <RiErrorWarningLine aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-destructive" />
          <p className="text-foreground">
            <span className="font-medium">Anyone with the link can read this audit.</span> There is
            no sign-in, no password and no way to tell who opened it. Send it only to people who
            should see these findings, and revoke it when they no longer should.
          </p>
        </div>

        <form action={createAction} className="grid gap-4">
          <input type="hidden" name="auditId" value={auditId} />
          <input type="hidden" name="workspaceSlug" value={slug} />
          <input type="hidden" name="revisionId" value="" />

          <Field>
            <FieldLabel htmlFor="share-expiry">Expires after</FieldLabel>
            <NativeSelect
              id="share-expiry"
              name="expiresInDays"
              defaultValue="7"
              className="sm:w-56"
            >
              {EXPIRY_CHOICES.map((choice) => (
                <option key={choice.value} value={choice.value}>
                  {choice.label}
                </option>
              ))}
            </NativeSelect>
            <FieldDescription>
              The link stops working at the end of this period. Shorter is safer.
            </FieldDescription>
          </Field>

          <fieldset className="grid gap-3">
            <legend className="text-sm font-medium">What the reader may see</legend>

            <label className="flex items-start gap-2.5 text-sm" htmlFor="share-evidence">
              <Checkbox id="share-evidence" name="includeEvidence" className="mt-0.5" />
              <span>
                <span className="font-medium">Evidence excerpts</span>
                <span className="block text-muted-foreground">
                  Quoted lines from the uploaded files behind each finding. These can contain raw
                  transaction detail.
                </span>
              </span>
            </label>

            <label className="flex items-start gap-2.5 text-sm" htmlFor="share-notes">
              <Checkbox id="share-notes" name="includeInternalNotes" className="mt-0.5" />
              <span>
                <span className="font-medium">Internal notes</span>
                <span className="block text-muted-foreground">
                  Your team’s comments and reviewer remarks on the findings. Written for
                  colleagues, not for the recipient.
                </span>
              </span>
            </label>
          </fieldset>

          {createState.error ? (
            <p className="text-sm text-destructive" role="alert">
              {createState.error}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" disabled={creating || currentRevisionNumber === null}>
              {creating ? (
                <RiLoader4Line aria-hidden="true" className="animate-spin" />
              ) : (
                <RiShareLine aria-hidden="true" />
              )}
              Create link
            </Button>
          </div>
        </form>

        <Separator />

        <section aria-labelledby="share-existing" className="grid gap-2">
          <h3 id="share-existing" className="text-sm font-medium">
            Existing links
          </h3>

          {revokeState.error ? (
            <p className="text-sm text-destructive" role="alert">
              {revokeState.error}
            </p>
          ) : null}

          {links.length === 0 ? (
            <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
              No links yet. Nothing about this audit is publicly reachable.
            </p>
          ) : (
            <ul className="grid gap-2">
              {links.map((link) => {
                const status = statusOf(link, now);
                const live = status.kind === "active";
                return (
                  <li key={link.id} className="rounded-md border p-3 text-sm">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                        {live ? (
                          <RiCheckLine aria-hidden="true" className="size-3.5 shrink-0" />
                        ) : status.kind === "expired" ? (
                          <RiTimeLine aria-hidden="true" className="size-3.5 shrink-0" />
                        ) : (
                          <RiEyeOffLine aria-hidden="true" className="size-3.5 shrink-0" />
                        )}
                        {/* Never colour alone: the icon and this word carry the state. */}
                        <span className={live ? "text-foreground" : undefined}>
                          {live ? "Active" : status.kind === "expired" ? "Expired" : "Revoked"}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{status.label}</span>
                      </span>

                      <span className="text-xs text-muted-foreground">
                        {link.revisionNumber === null
                          ? "Revision unavailable"
                          : `Revision ${link.revisionNumber}`}
                      </span>
                    </div>

                    <p className="mt-1.5 text-xs text-muted-foreground">
                      {scopeSummary(link.scope)} · Created {dateOnly.format(link.createdAt)} ·{" "}
                      {link.lastAccessedAt
                        ? `Last opened ${dateTime.format(link.lastAccessedAt)}`
                        : "Never opened"}
                    </p>

                    {live ? (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <code className="min-w-0 flex-1 truncate rounded bg-muted px-2 py-1 font-mono text-xs">
                          {shareUrl(link.token)}
                        </code>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={async () => {
                            try {
                              await navigator.clipboard.writeText(shareUrl(link.token));
                              toast.success("Share link copied to the clipboard.");
                            } catch {
                              toast.error("Could not copy. Select the link and copy it manually.");
                            }
                          }}
                        >
                          <RiFileCopyLine aria-hidden="true" />
                          Copy
                          <span className="sr-only"> link created {dateOnly.format(link.createdAt)}</span>
                        </Button>
                        <form action={revokeAction}>
                          <input type="hidden" name="shareLinkId" value={link.id} />
                          <input type="hidden" name="auditId" value={auditId} />
                          <input type="hidden" name="workspaceSlug" value={slug} />
                          <Button type="submit" variant="ghost" size="sm" disabled={revoking}>
                            <RiDeleteBinLine aria-hidden="true" />
                            Revoke
                            <span className="sr-only">
                              {" "}
                              link created {dateOnly.format(link.createdAt)}
                            </span>
                          </Button>
                        </form>
                      </div>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">
                        This link no longer opens the audit.
                      </p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Done</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
