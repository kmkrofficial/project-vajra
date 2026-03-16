import { Shimmer } from "@/components/ui/shimmer";

export default function AuditLogsLoading() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <Shimmer className="h-6 w-24" />
      <div className="rounded-xl border border-border bg-card">
        <div className="flex gap-4 border-b border-border px-4 py-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className="h-3 w-20" />
          ))}
        </div>
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0">
            <Shimmer className="h-3 w-32" />
            <Shimmer className="h-3 w-24" />
            <Shimmer className="h-3 w-40" />
            <Shimmer className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}
