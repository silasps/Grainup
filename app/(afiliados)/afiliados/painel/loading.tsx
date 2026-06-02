import { Skeleton } from "@/components/ui/skeleton";

export default function PainelAfiliadoLoading() {
  return (
    <div className="flex flex-col gap-6">
      {/* Status banner */}
      <Skeleton className="h-16 w-full rounded-xl" />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-border p-5 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-7 rounded-md" />
            </div>
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Two cards */}
      <div className="grid lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-border overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <Skeleton className="h-4 w-36" />
            </div>
            <div className="p-5 flex flex-col gap-3">
              {Array.from({ length: 3 }).map((_, j) => (
                <Skeleton key={j} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Rules */}
      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  );
}
