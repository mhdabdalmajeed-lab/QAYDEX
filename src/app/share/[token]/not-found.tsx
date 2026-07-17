import { RiLinkUnlink } from "@remixicon/react";

/**
 * Reached when a token matches nothing (PRD §24).
 *
 * Deliberately says nothing about whether an audit exists, existed, or was deleted — the
 * wording is identical for a typo, a truncated paste and a token that was never issued. Anyone
 * probing this endpoint learns exactly one bit: "not this string".
 */
export default function ShareNotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-16 text-center">
      <span className="flex size-11 items-center justify-center rounded-full border border-border bg-muted">
        <RiLinkUnlink aria-hidden="true" className="size-5 text-muted-foreground" />
      </span>
      <h1 className="text-lg font-semibold tracking-tight">This link doesn’t open anything</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">
        The address is incomplete or was never issued. Share links are long and easy to break in
        half when pasted — check you copied the whole URL.
      </p>
      <p className="text-sm text-muted-foreground">
        If it still doesn’t work, ask the person who sent it for a new link.
      </p>
    </div>
  );
}
