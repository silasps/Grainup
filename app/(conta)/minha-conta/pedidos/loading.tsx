import { Skeleton } from "@/components/ui/skeleton";

function OrderRowSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-border p-5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <Skeleton className="h-4 w-3/4" />
      <div className="flex items-center justify-between">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-7 w-28 rounded-lg" />
      </div>
    </div>
  );
}

export default function PedidosLoading() {
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-xl border border-border p-5 flex flex-col gap-1">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-3 w-28" />
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <OrderRowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
