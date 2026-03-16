import { Shimmer } from "@/components/ui/shimmer";

export default function AnalyticsLoading() {
  return (
    <div className="space-y-6 p-4 md:p-6">
      <Shimmer className="h-6 w-24" />

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-4">
            <Shimmer className="h-3 w-24" />
            <Shimmer className="mt-3 h-7 w-16" />
            <Shimmer className="mt-2 h-3 w-12" />
          </div>
        ))}
      </div>

      {/* Charts row */}
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-border bg-card p-6 md:col-span-2">
          <Shimmer className="h-4 w-28" />
          <Shimmer className="mt-4 h-52" />
        </div>
        <div className="rounded-xl border border-border bg-card p-6">
          <Shimmer className="h-4 w-36" />
          <Shimmer className="mx-auto mt-4 size-40 rounded-full" />
        </div>
      </div>
    </div>
  );
}
