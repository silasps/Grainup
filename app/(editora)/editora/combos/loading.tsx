import { Skeleton } from "@/components/ui/skeleton";

function ComboCardSkeleton() {
  return (
    <div className="border border-border rounded-2xl p-6 flex flex-col gap-4">
      <div className="flex items-start justify-between">
        <div className="flex flex-col gap-2 flex-1">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full ml-4 flex-shrink-0" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-5 w-20 rounded-full" />
        ))}
      </div>
      <div className="flex gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="aspect-[3/4] w-20 rounded-lg flex-shrink-0" />
        ))}
      </div>
      <div className="flex items-center justify-between mt-2">
        <div className="flex flex-col gap-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-6 w-32" />
        </div>
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
    </div>
  );
}

export default function CombosLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-5xl px-4 py-12">
        <div className="flex flex-col gap-2 mb-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="flex flex-col gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <ComboCardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}
