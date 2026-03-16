import { Shimmer } from "@/components/ui/shimmer";

export default function EmployeesLoading() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <Shimmer className="h-6 w-32" />
        <Shimmer className="h-9 w-32 rounded-lg" />
      </div>
      <div className="rounded-xl border border-border bg-card">
        <div className="flex gap-4 border-b border-border px-4 py-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Shimmer key={i} className="h-3 w-20" />
          ))}
        </div>
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0">
            <Shimmer className="size-8 shrink-0 rounded-full" />
            <Shimmer className="h-3 w-28" />
            <Shimmer className="h-3 w-20" />
            <Shimmer className="h-5 w-16 rounded-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
