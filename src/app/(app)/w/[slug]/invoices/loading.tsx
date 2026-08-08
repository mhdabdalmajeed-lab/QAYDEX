import { PageHeaderSkeleton } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";

/** Mirrors the customer invoice list: header, then the invoice table. */
export default function CustomerInvoicesLoading() {
  return (
    <div className="flex flex-1 flex-col" aria-busy="true">
      <span className="sr-only" role="status">
        Loading customer invoices…
      </span>

      <PageHeaderSkeleton />

      <div className="flex flex-1 flex-col gap-5 px-4 py-5 md:px-6">
        <div className="rounded-lg border border-border">
          <div className="flex items-center gap-4 border-b border-border px-4 py-2.5">
            {["w-28", "w-40", "w-24", "w-20", "w-16"].map((width) => (
              <Skeleton key={width} className={`h-3.5 ${width}`} />
            ))}
          </div>
          {Array.from({ length: 8 }, (_, index) => (
            <div
              key={index}
              className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-b-0"
            >
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-4 w-52" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="ml-auto h-4 w-20" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
