import { Skeleton } from "@/components/ui/skeleton";

function ShelfSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-6 w-48" />
      <div className="flex gap-4 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-3 shrink-0 w-40">
            <Skeleton className="aspect-[3/4] w-full rounded-xl" />
            <Skeleton className="h-3 w-2/3" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-1/2" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function EditoraLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero skeleton */}
      <div className="bg-secondary py-12 px-4">
        <div className="container mx-auto max-w-7xl">
          <div className="grid md:grid-cols-2 gap-8 items-center">
            <div className="flex flex-col gap-4">
              <Skeleton className="h-4 w-24 rounded-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-4/5" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
              <div className="flex gap-3 mt-2">
                <Skeleton className="h-10 w-36 rounded-lg" />
                <Skeleton className="h-10 w-28 rounded-lg" />
              </div>
            </div>
            <Skeleton className="aspect-[4/3] rounded-2xl hidden md:block" />
          </div>
        </div>
      </div>
      {/* Prateleiras skeleton */}
      <div className="container mx-auto max-w-7xl px-4 py-12 flex flex-col gap-12">
        <ShelfSkeleton />
        <ShelfSkeleton />
        <ShelfSkeleton />
      </div>
    </div>
  );
}
