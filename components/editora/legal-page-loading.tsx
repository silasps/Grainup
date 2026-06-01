import { Skeleton } from "@/components/ui/skeleton";

export function LegalPageLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero skeleton */}
      <div className="bg-foreground/10 py-20">
        <div className="container mx-auto max-w-7xl px-4 flex flex-col gap-5">
          <Skeleton className="h-6 w-40 rounded-full" />
          <Skeleton className="h-12 w-80 max-w-full" />
          <Skeleton className="h-4 w-96 max-w-full" />
          <Skeleton className="h-4 w-72 max-w-full" />
        </div>
      </div>

      {/* Content skeleton */}
      <div className="container mx-auto max-w-4xl px-4 py-14">
        <div className="flex items-center gap-3 mb-2">
          <Skeleton className="h-10 w-10 rounded-lg" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-3 w-36 mb-8 ml-[52px]" />

        <div className="bg-card rounded-2xl border border-border p-8 sm:p-10 flex flex-col gap-5">
          <Skeleton className="h-7 w-56" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
          <Skeleton className="h-7 w-48 mt-2" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <Skeleton className="h-7 w-52 mt-2" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-4/5" />
          </div>
        </div>
      </div>
    </div>
  );
}
