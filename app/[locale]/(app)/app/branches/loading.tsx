import { Shimmer } from "@/components/ui/shimmer";

export default function BranchesLoading() {
  return (
    <div className="space-y-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <Shimmer className="h-6 w-32" />
        <Shimmer className="h-9 w-28 rounded-lg" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card p-5">
            <Shimmer className="h-5 w-36" />
            <Shimmer className="mt-2 h-3 w-48" />
            <Shimmer className="mt-4 h-3 w-24" />
          </div>
        ))}
      </div>
    </div>
  );
}
