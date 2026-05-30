import { Skeleton } from "@/components/ui/skeleton";

export default function PedidoDetalheLoading() {
  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="bg-white rounded-xl border border-border p-5 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-24 rounded-full" />
        </div>
        <Skeleton className="h-3 w-32" />
      </div>

      {/* Items */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        <div className="px-5 py-3 border-b border-border">
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="divide-y divide-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="h-16 w-12 rounded-lg flex-shrink-0" />
              <div className="flex-1 flex flex-col gap-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-5 w-16 flex-shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Address + payment */}
      <div className="grid sm:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-border p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded" />
              <Skeleton className="h-4 w-28" />
            </div>
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>

      {/* Total */}
      <div className="bg-white rounded-xl border border-border p-5 flex flex-col gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
        <div className="flex justify-between mt-2 pt-3 border-t border-border">
          <Skeleton className="h-5 w-12" />
          <Skeleton className="h-5 w-24" />
        </div>
      </div>
    </div>
  );
}
