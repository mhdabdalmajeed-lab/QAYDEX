import { Skeleton } from "@/components/ui/skeleton";

export default function AuditSetupLoading() {
  return (
    <>
      <div className="flex flex-col gap-3 border-b border-border px-4 py-4 md:px-6">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-4 w-72" />
      </div>

      <div className="flex-1 px-4 py-5 md:px-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          <div className="flex flex-wrap gap-1.5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-6 w-24" />
            ))}
          </div>

          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="flex flex-col gap-3">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-4 w-96 max-w-full" />
              <Skeleton className="h-28 w-full" />
            </div>
          ))}
        </div>
      </div>
      <span className="sr-only" role="status">
        Loading the audit setup.
      </span>
    </>
  );
}
