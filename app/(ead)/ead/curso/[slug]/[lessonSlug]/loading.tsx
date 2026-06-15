import { Skeleton } from "@/components/ui/skeleton";

export default function LessonPlayerLoading() {
  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden">
      <main className="flex-1 flex flex-col overflow-y-auto p-4 md:p-6 gap-6">
        <Skeleton className="aspect-video w-full rounded-xl" />
        <Skeleton className="h-7 w-2/3" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </main>
      <div className="hidden lg:flex w-80 xl:w-96 flex-col bg-white border-l border-border">
        <div className="p-4 border-b border-border">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-2 w-full mt-2" />
        </div>
        <div className="p-3 flex flex-col gap-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded" />
          ))}
        </div>
      </div>
    </div>
  );
}
