import { Shimmer } from "@/components/ui/shimmer";

export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <div>
        <Shimmer className="h-7 w-24" />
        <Shimmer className="mt-1 h-4 w-48" />
      </div>

      {/* Settings sections */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <Shimmer className="size-9 rounded-lg" />
            <div>
              <Shimmer className="h-4 w-32" />
              <Shimmer className="mt-1 h-3 w-48" />
            </div>
          </div>
          <div className="space-y-4 px-5 py-4">
            <Shimmer className="h-9 w-full rounded-lg" />
            <Shimmer className="h-9 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}
