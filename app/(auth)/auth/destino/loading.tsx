import { Skeleton } from "@/components/ui/skeleton";

export default function DestinoLoading() {
  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-5">
      <Skeleton className="h-16 w-48" />
      <div className="bg-white rounded-2xl shadow-sm border border-border p-8 flex flex-col gap-6 w-full">
        <div className="flex flex-col items-center gap-2">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-32" />
        </div>
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
