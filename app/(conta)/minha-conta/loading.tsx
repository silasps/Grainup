import { Skeleton } from "@/components/ui/skeleton";

export default function MinhaContaLoading() {
  return (
    <div className="flex flex-col gap-4">
      {/* Welcome */}
      <div className="bg-white rounded-xl border border-border p-5 flex items-center gap-4">
        <Skeleton className="w-12 h-12 rounded-full shrink-0" />
        <div className="flex-1 flex flex-col gap-1.5">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3.5 w-48" />
        </div>
        <Skeleton className="h-3.5 w-16 shrink-0" />
      </div>

      {/* Last order strip */}
      <div className="bg-white rounded-xl border border-border p-4 flex items-center gap-3">
        <Skeleton className="w-9 h-9 rounded-lg shrink-0" />
        <div className="flex-1 flex flex-col gap-1.5">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-3 w-32" />
        </div>
        <Skeleton className="h-4 w-4 shrink-0" />
      </div>

      {/* Section label */}
      <div>
        <Skeleton className="h-3 w-20 mb-2.5" />
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-border p-4 flex flex-col gap-3">
              <Skeleton className="w-9 h-9 rounded-lg" />
              <div className="flex flex-col gap-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
