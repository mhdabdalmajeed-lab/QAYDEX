import { PageHeaderSkeleton } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function ConversationLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading conversation…</span>

      <PageHeaderSkeleton breadcrumb actions />

      <div className="flex-1 overflow-hidden">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5 md:px-6">
          {/* Alternating question / answer shapes: the transcript's real rhythm. */}
          {Array.from({ length: 3 }, (_, index) => (
            <div key={index} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-10 w-2/3 rounded-lg" />
              </div>
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-full" />
                <Skeleton className="h-3.5 w-4/5" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="border-t border-border">
        <div className="mx-auto w-full max-w-3xl px-4 py-3 md:px-6">
          <div className="flex items-end gap-2">
            <Skeleton className="h-16 flex-1 rounded-md" />
            <Skeleton className="size-9 rounded-md" />
          </div>
          <Skeleton className="mt-2 h-3 w-80 max-w-full" />
        </div>
      </div>
    </div>
  );
}
