"use client";

import { useEffect } from "react";
import { RiErrorWarningLine } from "@remixicon/react";

import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

/**
 * Next.js 16 renames the reset callback: the second prop is `unstable_retry`.
 */
export default function WorkspaceError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <RiErrorWarningLine aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>Something went wrong</EmptyTitle>
          <EmptyDescription>
            This page could not be loaded. Nothing was changed — audits and their evidence
            are unaffected. Try again, and if it keeps happening quote the reference below.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button onClick={unstable_retry}>Try again</Button>
          {error.digest ? (
            <p className="font-mono text-xs text-muted-foreground">Reference: {error.digest}</p>
          ) : null}
        </EmptyContent>
      </Empty>
    </main>
  );
}
