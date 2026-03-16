import { Shimmer } from "@/components/ui/shimmer";

export default function DashboardLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Shimmer className="h-14 rounded-lg" />
        <Shimmer className="h-14 rounded-lg" />
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <Shimmer className="h-3 w-20" />
            <Shimmer className="mt-3 h-7 w-16" />
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-xl border border-border bg-card p-6">
        <Shimmer className="h-4 w-28" />
        <Shimmer className="mt-4 h-48" />
      </div>
    </div>
  );
}
