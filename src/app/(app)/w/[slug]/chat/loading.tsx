import { Skeleton } from "@/components/ui/skeleton";

export default function ChatListLoading() {
  return (
    <div className="flex flex-1 flex-col" aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading conversations…</span>

      <div className="flex flex-col gap-3 border-b border-border px-4 py-4 md:px-6">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="px-4 py-5 md:px-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-8 w-full sm:w-72" />
          <div className="flex gap-1">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-7 w-24" />
            ))}
          </div>
        </div>

        <div className="divide-y divide-border rounded-lg border border-border">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="flex items-center gap-3 px-3 py-3">
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
              <Skeleton className="size-8 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
