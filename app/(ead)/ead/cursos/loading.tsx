import { Skeleton } from "@/components/ui/skeleton";

export default function CatalogLoading() {
  return (
    <div className="flex flex-col">
      {/* Hero skeleton */}
      <div className="h-[420px] bg-muted animate-pulse" />

      {/* Course grid skeleton */}
      <div className="container mx-auto max-w-7xl px-4 py-16">
        <Skeleton className="h-8 w-48 mb-8" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl overflow-hidden border border-border bg-white">
              <Skeleton className="aspect-video w-full" />
              <div className="p-4 flex flex-col gap-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-1/2 mt-2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
