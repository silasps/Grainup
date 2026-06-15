import { Skeleton } from "@/components/ui/skeleton";

export default function CertificadosLoading() {
  return (
    <div className="container mx-auto max-w-4xl px-4 py-8 flex flex-col gap-6">
      <Skeleton className="h-8 w-52" />
      <div className="flex flex-col gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-border p-5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Skeleton className="w-12 h-12 rounded-xl" />
              <div className="flex flex-col gap-1.5">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
            </div>
            <Skeleton className="h-9 w-28 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}
