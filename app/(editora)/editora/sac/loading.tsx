import { Skeleton } from "@/components/ui/skeleton";

export default function SacLoading() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto max-w-3xl px-4 py-12">
        <div className="flex flex-col gap-2 mb-8">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        {/* FAQ items */}
        <div className="flex flex-col gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-border p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-4 rounded" />
              </div>
              {i < 2 && (
                <>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-4/5" />
                </>
              )}
            </div>
          ))}
        </div>
        {/* Contact CTA */}
        <div className="mt-8 bg-white rounded-2xl border border-border p-6 flex flex-col gap-3 items-center text-center">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
