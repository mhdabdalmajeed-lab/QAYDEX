import { Skeleton } from "@/components/ui/skeleton";

export default function InstructionDetailLoading() {
  return (
    <>
      <div className="flex flex-col gap-3 border-b border-border px-4 py-4 md:px-6">
        <Skeleton className="h-4 w-48" />
        <Skeleton className="h-5 w-64" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>

      <div className="flex-1 px-4 py-5 md:px-6">
        <div className="mx-auto flex max-w-3xl flex-col gap-6">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-24 w-full" />
          <div className="flex flex-col gap-4">
            <Skeleton className="h-9 w-full" />
            <Skeleton className="h-40 w-full" />
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </div>
          </div>
          <Skeleton className="h-32 w-full" />
        </div>
      </div>

      <span className="sr-only" role="status">
        Loading the instruction and its version history.
      </span>
    </>
  );
}
