export default function AnalyticsLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="h-6 w-24 animate-pulse rounded bg-muted" />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-7 w-16 animate-pulse rounded bg-muted" />
            <div className="mt-2 h-3 w-12 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 md:col-span-2">
          <div className="h-4 w-28 animate-pulse rounded bg-muted" />
          <div className="mt-4 h-52 animate-pulse rounded bg-muted" />
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <div className="h-4 w-36 animate-pulse rounded bg-muted" />
          <div className="mx-auto mt-4 size-40 animate-pulse rounded-full bg-muted" />
        </div>
      </div>
    </div>
  );
}
