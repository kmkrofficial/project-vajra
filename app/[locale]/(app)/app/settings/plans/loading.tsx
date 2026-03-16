export default function PlansLoading() {
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-7 w-16 animate-pulse rounded bg-muted" />
            <div className="mt-1 h-4 w-40 animate-pulse rounded bg-muted" />
          </div>
          <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" />
        </div>

        <div className="rounded-xl border border-border bg-card">
          <div className="flex gap-4 border-b border-border px-4 py-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-3 w-20 animate-pulse rounded bg-muted" />
            ))}
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 border-b border-border px-4 py-3 last:border-0">
              <div className="h-3 w-32 animate-pulse rounded bg-muted" />
              <div className="h-3 w-16 animate-pulse rounded bg-muted" />
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
              <div className="h-5 w-14 animate-pulse rounded-full bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
