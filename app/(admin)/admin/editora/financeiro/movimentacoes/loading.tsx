import { Skeleton } from "@/components/ui/skeleton";

export default function MovimentacoesLoading() {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-px" />
          <Skeleton className="h-4 w-32" />
        </div>
        <Skeleton className="h-8 w-32" />
      </div>
      <div className="flex items-center gap-6 px-6 py-3 border-b border-border flex-shrink-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-28" />
        ))}
      </div>
      <div className="px-6 py-3 border-b border-border flex gap-2 flex-shrink-0">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-32" />
        ))}
      </div>
      <div className="flex-1 px-6 py-4 space-y-2">
        {Array.from({ length: 15 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-full rounded" />
        ))}
      </div>
    </div>
  );
}
