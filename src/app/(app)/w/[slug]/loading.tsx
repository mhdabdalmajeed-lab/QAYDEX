import { PageHeaderSkeleton } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function WorkspaceLoading() {
  return (
    <div className="flex flex-1 flex-col" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading workspace…</span>

      <PageHeaderSkeleton />

      <div className="flex flex-col gap-5 px-4 py-5 md:px-6">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="rounded-lg border border-border p-3">
              <Skeleton className="h-7 w-10" />
              <Skeleton className="mt-2 h-3 w-20" />
            </div>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-3">
          <div className="rounded-lg border border-border p-4 lg:col-span-2">
            <Skeleton className="h-4 w-28" />
            <div className="mt-4 flex flex-col gap-3.5">
              {Array.from({ length: 6 }, (_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex flex-1 flex-col gap-1.5">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                  <Skeleton className="h-5 w-16 rounded-full" />
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-border p-4">
            <Skeleton className="h-4 w-40" />
            <div className="mt-4 flex flex-col gap-3.5">
              {Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="flex flex-col gap-1.5">
                  <Skeleton className="h-4 w-4/5" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
