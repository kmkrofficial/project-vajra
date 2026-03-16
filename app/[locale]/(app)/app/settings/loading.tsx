export default function SettingsLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 p-4 md:p-6">
      <div>
        <div className="h-7 w-24 animate-pulse rounded bg-muted" />
        <div className="mt-1 h-4 w-48 animate-pulse rounded bg-muted" />
      </div>

      {/* Settings sections */}
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="rounded-xl border border-border bg-card">
          <div className="flex items-center gap-3 border-b border-border px-5 py-4">
            <div className="size-9 animate-pulse rounded-lg bg-muted" />
            <div>
              <div className="h-4 w-32 animate-pulse rounded bg-muted" />
              <div className="mt-1 h-3 w-48 animate-pulse rounded bg-muted" />
            </div>
          </div>
          <div className="space-y-4 px-5 py-4">
            <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
            <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
