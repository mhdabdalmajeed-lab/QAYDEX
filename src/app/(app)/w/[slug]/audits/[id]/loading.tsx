import { Skeleton } from "@/components/ui/skeleton";

/**
 * The audit detail skeleton.
 *
 * It mirrors the real three-part layout — panel, canvas, chat dock — so the page does not
 * reflow when the data lands. Nothing here is a number: a skeleton that implies "14 findings"
 * before the query returns would be an invented figure like any other.
 */
export default function AuditDetailLoading() {
  return (
    <>
      <div className="flex flex-col gap-3 border-b border-border px-4 py-4 md:px-6">
        <Skeleton className="h-4 w-56" />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-72 max-w-full" />
            <Skeleton className="h-4 w-80 max-w-full" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-8 w-28" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
      </div>

      <div className="flex flex-1 items-start">
        {/* Left input panel */}
        <div className="hidden w-80 shrink-0 flex-col gap-4 border-r border-border p-4 lg:flex">
          <Skeleton className="h-8 w-full" />
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-2 rounded-xl border border-border p-3">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-40" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div className="min-w-0 flex-1 px-4 py-5 md:px-6">
          <div className="mx-auto flex max-w-4xl flex-col gap-6">
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Skeleton key={index} className="h-6 w-28" />
              ))}
            </div>
            <Skeleton className="h-20 w-full" />
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex flex-col gap-3 rounded-xl border border-border p-4">
                <Skeleton className="h-5 w-48" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-40 w-full" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <span className="sr-only" role="status">
        Loading the audit.
      </span>
    </>
  );
}
