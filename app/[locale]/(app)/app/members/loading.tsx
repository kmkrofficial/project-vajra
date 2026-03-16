export default function MembersLoading() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      {/* Search/filter bar */}
      <div className="flex items-center gap-3">
        <div className="h-9 flex-1 animate-pulse rounded-lg bg-muted" />
        <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
        <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
      </div>

      {/* Table header */}
      <div className="rounded-xl border border-border bg-card">
        <div className="flex gap-4 border-b border-border px-4 py-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-3 w-20 animate-pulse rounded bg-muted" />
          ))}
        </div>
        {/* Table rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0">
            <div className="size-8 shrink-0 animate-pulse rounded-full bg-muted" />
            <div className="h-3 w-32 animate-pulse rounded bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
            <div className="h-5 w-16 animate-pulse rounded-full bg-muted" />
          </div>
        ))}
      </div>
    </div>
  );
}
