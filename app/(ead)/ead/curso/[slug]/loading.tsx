import { Skeleton } from "@/components/ui/skeleton";

export default function CourseAreaLoading() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-2">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="h-10 w-32 rounded-lg" />
      </div>
      <Skeleton className="h-16 w-full rounded-xl" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl overflow-hidden border border-border bg-white">
          <Skeleton className="h-14 w-full" />
          {Array.from({ length: 4 }).map((_, j) => (
            <Skeleton key={j} className="h-12 w-full border-t border-border" />
          ))}
        </div>
      ))}
    </div>
  );
}
