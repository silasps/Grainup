import { Skeleton } from "@/components/ui/skeleton";

export default function FaqLoading() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12">
      <div className="flex flex-col items-center gap-3 mb-10">
        <Skeleton className="h-12 w-12 rounded-full" />
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="flex flex-col gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}
