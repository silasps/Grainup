import { Skeleton } from "@/components/ui/skeleton";

export default function ComboDetailLoading() {
  return (
    <div>
      <div className="border-b border-border bg-white">
        <div className="container mx-auto max-w-7xl px-4 py-3">
          <Skeleton className="h-4 w-40" />
        </div>
      </div>
      <div className="container mx-auto max-w-5xl px-4 py-10">
        <div className="grid md:grid-cols-2 gap-10">
          <div className="flex flex-col gap-6">
            <Skeleton className="rounded-2xl min-h-[300px]" />
            <Skeleton className="h-52 rounded-xl" />
          </div>
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-3">
              <Skeleton className="h-5 w-28" />
              <Skeleton className="h-9 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </div>
            <Skeleton className="h-36 rounded-xl" />
            <Skeleton className="h-12 rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
