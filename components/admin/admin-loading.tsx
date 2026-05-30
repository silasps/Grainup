function Bone({ className }: { className?: string }) {
  return <div className={`bg-gray-100 rounded animate-pulse ${className ?? ""}`} />;
}

export function AdminLoading({ hasKpis = false }: { hasKpis?: boolean }) {
  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex h-14 items-center px-4 md:px-6 border-b border-border bg-white gap-3">
        <Bone className="md:hidden h-8 w-8 rounded-md flex-shrink-0" />
        <div className="flex flex-col gap-1.5">
          <Bone className="h-4 w-28" />
          <Bone className="h-3 w-20" />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col gap-6">
        {hasKpis && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-border p-5 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <Bone className="h-3 w-24" />
                  <Bone className="h-8 w-8 rounded-lg" />
                </div>
                <Bone className="h-7 w-20" />
                <Bone className="h-3 w-16" />
                <Bone className="h-3 w-28" />
              </div>
            ))}
          </div>
        )}

        {/* Table card */}
        <div className="bg-white rounded-xl border border-border overflow-hidden flex-1">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <Bone className="h-4 w-36" />
            <Bone className="h-7 w-20 rounded-md" />
          </div>
          <div className="divide-y divide-border">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3.5 animate-pulse">
                <Bone className="h-4 w-20" />
                <Bone className="h-4 w-32" />
                <Bone className="h-4 flex-1" />
                <Bone className="h-5 w-16 rounded-full" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
