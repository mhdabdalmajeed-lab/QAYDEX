import { Skeleton } from "@/components/ui/skeleton";

export default function NewAuditLoading() {
  return (
    <>
      <div className="flex flex-col gap-3 border-b border-border px-4 py-4 md:px-6">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-4 w-80" />
      </div>

      <div className="flex-1 px-4 py-5 md:px-6">
        <div className="mx-auto flex max-w-4xl flex-col gap-6">
          <Skeleton className="h-8 w-72" />
          <div className="grid gap-2 md:grid-cols-2">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-24 w-full" />
            ))}
          </div>
          <Skeleton className="h-px w-full" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-9 w-full" />
            <div className="grid gap-4 md:grid-cols-3">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
            <Skeleton className="h-20 w-full" />
          </div>
        </div>
      </div>
      <span className="sr-only" role="status">
        Loading the template library.
      </span>
    </>
  );
}
