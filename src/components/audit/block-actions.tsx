"use client";

import {
  RiChat3Line,
  RiEyeLine,
  RiEyeOffLine,
  RiLoader4Line,
  RiMore2Line,
} from "@remixicon/react";
import Link from "next/link";
import { useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { setBlockState } from "@/server/actions/audit";

/**
 * Per-block controls (PRD §18.4).
 *
 * Hiding a block and excluding it from a report are reader-side preferences, so they write to
 * `block_states` and leave the published revision untouched. A hidden block is never deleted —
 * it collapses to a line saying it is hidden, because an auditor needs to know the report they
 * are reading is not the whole output.
 */
export function BlockActions({
  slug,
  auditId,
  blockId,
  blockTitle,
  hidden,
  includeInReport,
  canEdit,
}: {
  slug: string;
  auditId: string;
  blockId: string;
  blockTitle: string;
  hidden: boolean;
  includeInReport: boolean;
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();

  function save(next: { hidden: boolean; includeInReport: boolean }) {
    const formData = new FormData();
    formData.set("blockId", blockId);
    formData.set("auditId", auditId);
    formData.set("hidden", String(next.hidden));
    formData.set("includeInReport", String(next.includeInReport));
    startTransition(async () => {
      await setBlockState(formData);
    });
  }

  const askHref = `/w/${slug}/chat/new?audit=${auditId}&block=${blockId}&q=${encodeURIComponent(
    `Explain the “${blockTitle}” block in this audit.`,
  )}`;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-7"
            aria-label={`Actions for ${blockTitle}`}
          />
        }
      >
        {pending ? (
          <RiLoader4Line className="size-4 animate-spin" />
        ) : (
          <RiMore2Line className="size-4" />
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem nativeButton={false} render={<Link href={askHref} />}>
          <RiChat3Line className="size-4" />
          Ask AI about this block
        </DropdownMenuItem>
        {canEdit ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              closeOnClick={false}
              onClick={() => save({ hidden: !hidden, includeInReport })}
            >
              {hidden ? <RiEyeLine className="size-4" /> : <RiEyeOffLine className="size-4" />}
              {hidden ? "Show block" : "Hide block"}
            </DropdownMenuItem>
            <DropdownMenuCheckboxItem
              checked={includeInReport}
              closeOnClick={false}
              onCheckedChange={(checked: boolean) => save({ hidden, includeInReport: checked })}
            >
              Include in exported report
            </DropdownMenuCheckboxItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** The placeholder a hidden block leaves behind. */
export function HiddenBlockRow({
  auditId,
  blockId,
  blockTitle,
  blockType,
  canEdit,
}: {
  auditId: string;
  blockId: string;
  blockTitle: string;
  blockType: string;
  canEdit: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-dashed border-border px-4 py-2.5">
      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <RiEyeOffLine className="size-4 shrink-0" aria-hidden />
        <span>
          Hidden: <span className="font-medium">{blockTitle}</span>{" "}
          <span className="text-xs">({blockType.replace(/_/g, " ")})</span>
        </span>
      </p>
      {canEdit ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            const formData = new FormData();
            formData.set("blockId", blockId);
            formData.set("auditId", auditId);
            formData.set("hidden", "false");
            formData.set("includeInReport", "true");
            startTransition(async () => {
              await setBlockState(formData);
            });
          }}
        >
          {pending ? (
            <RiLoader4Line className="size-4 animate-spin" />
          ) : (
            <RiEyeLine className="size-4" />
          )}
          Show
        </Button>
      ) : null}
    </div>
  );
}
