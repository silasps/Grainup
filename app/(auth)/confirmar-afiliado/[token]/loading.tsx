import { Skeleton } from "@/components/ui/skeleton";

export default function ConfirmarAfiliadoLoading() {
  return (
    <div className="w-full max-w-sm flex flex-col items-center gap-5">
      <Skeleton className="h-14 w-32" />
      <div className="bg-white rounded-2xl border border-border p-8 w-full flex flex-col gap-6">
        <div className="flex flex-col items-center gap-3">
          <Skeleton className="h-14 w-14 rounded-full" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-4 w-full" />
          <div className="grid grid-cols-2 gap-3">
            <Skeleton className="h-16 rounded-xl" />
            <Skeleton className="h-16 rounded-xl" />
          </div>
        </div>
        <Skeleton className="h-20 w-full rounded-lg" />
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}
