import { Skeleton } from "@/components/ui/skeleton";

export default function SegurancaLoading() {
  return (
    <div className="bg-white rounded-xl border border-border p-5 flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10 rounded-lg shrink-0" />
        <div className="flex flex-col gap-1.5">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3.5 w-40" />
        </div>
      </div>
      <div className="flex flex-col gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1.5">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-10 w-full rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
