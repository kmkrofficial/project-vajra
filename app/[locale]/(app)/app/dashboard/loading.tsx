export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <div className="h-10 animate-pulse rounded-lg bg-muted" />
        <div className="h-10 animate-pulse rounded-lg bg-muted" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="mt-3 h-7 w-16 animate-pulse rounded bg-muted" />
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-border bg-card p-6">
        <div className="h-4 w-28 animate-pulse rounded bg-muted" />
        <div className="mt-4 h-48 animate-pulse rounded bg-muted" />
      </div>
    </div>
  );
}
