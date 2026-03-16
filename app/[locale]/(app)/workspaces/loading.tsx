export default function WorkspacesLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-lg space-y-6">
        <div className="text-center">
          <div className="mx-auto h-7 w-40 animate-pulse rounded bg-muted" />
          <div className="mx-auto mt-2 h-4 w-56 animate-pulse rounded bg-muted" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-card p-5">
              <div className="h-5 w-40 animate-pulse rounded bg-muted" />
              <div className="mt-2 h-3 w-56 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
