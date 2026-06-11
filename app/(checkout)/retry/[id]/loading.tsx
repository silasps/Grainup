import { Skeleton } from "@/components/ui/skeleton";

export default function RetryPaymentLoading() {
  return (
    <div className="min-h-screen bg-muted flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-border overflow-hidden">
        <div className="px-6 py-5 border-b border-border">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-3 w-32 mt-2" />
        </div>
        <div className="flex flex-col gap-4 py-8 px-4">
          <Skeleton className="h-8 w-40 mx-auto" />
          <Skeleton className="h-14 w-full rounded-lg" />
          <Skeleton className="h-14 w-full rounded-lg" />
        </div>
      </div>
    </div>
  );
}
