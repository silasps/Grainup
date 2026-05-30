import { Skeleton } from "@/components/ui/skeleton";

export default function AfiliadosLoading() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <div className="bg-secondary py-16 px-4">
        <div className="container mx-auto max-w-4xl flex flex-col items-center gap-4 text-center">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-10 w-full max-w-lg" />
          <Skeleton className="h-4 w-full max-w-md" />
          <Skeleton className="h-4 w-3/4 max-w-md" />
          <Skeleton className="h-11 w-36 rounded-xl mt-2" />
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-12 flex flex-col gap-12">
        {/* Benefits grid */}
        <div className="grid sm:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3 p-6 border border-border rounded-2xl bg-white">
              <Skeleton className="h-10 w-10 rounded-xl" />
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          ))}
        </div>

        {/* Form card */}
        <div className="bg-white rounded-2xl border border-border p-8 flex flex-col gap-5">
          <Skeleton className="h-6 w-48" />
          <div className="grid sm:grid-cols-2 gap-5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex flex-col gap-2">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-10 w-full rounded-lg" />
              </div>
            ))}
          </div>
          <Skeleton className="h-11 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
