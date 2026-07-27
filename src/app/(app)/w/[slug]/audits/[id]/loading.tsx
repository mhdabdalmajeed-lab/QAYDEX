import { Skeleton } from "@/components/ui/skeleton";

/**
 * The audit detail skeleton.
 *
 * It mirrors the real two-part layout — results canvas, then the panel on the right — so the
 * page does not reflow when the data lands. Nothing here is a number: a skeleton that implies
 * "14 findings" before the query returns would be an invented figure like any other.
 */
export default function AuditDetailLoading() {
  return (
    <div className="flex min-h-0 flex-1" aria-busy="true">
      <main className="flex min-w-0 flex-1 flex-col">
        {/* The audit page writes its own header rather than using PageHeader: title, the
            status chips under it, then the actions. */}
        <div className="flex flex-wrap items-start justify-between gap-3 px-4 py-4 md:px-6">
          <div className="flex min-w-0 flex-col gap-2">
            <Skeleton className="h-6 w-56" />
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-28 rounded-full" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="size-8" />
          </div>
        </div>

        <div className="flex-1 px-6 pb-32 pt-6">
          <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
            <div className="rounded-xl border border-border p-5">
              <Skeleton className="h-3.5 w-20" />
              <div className="mt-3 flex flex-col gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-11/12" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>

            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="flex flex-col gap-3 rounded-xl border border-border p-4">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-40 w-full rounded-lg" />
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Evidence, instructions and period, on the right. */}
      <aside className="hidden w-[21rem] shrink-0 border-l border-border bg-sidebar lg:block">
        <div className="flex flex-col gap-3 p-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-7 w-24" />
          </div>
          {Array.from({ length: 5 }, (_, index) => (
            <div
              key={index}
              className="flex items-center justify-between border-b border-border pb-3"
            >
              <Skeleton className="h-4 w-28" />
              <Skeleton className="size-4 rounded" />
            </div>
          ))}
        </div>
      </aside>

      <span className="sr-only" role="status">
        Loading the audit.
      </span>
    </div>
  );
}
