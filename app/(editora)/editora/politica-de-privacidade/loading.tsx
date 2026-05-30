import { Skeleton } from "@/components/ui/skeleton";

export default function PoliticaPrivacidadeLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <div className="flex flex-col gap-2 mb-8">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-3 w-36" />
        </div>
        <div className="bg-white rounded-2xl border border-border p-8 flex flex-col gap-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex flex-col gap-3">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              {i % 2 === 0 && <Skeleton className="h-4 w-3/4" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
