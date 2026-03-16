export default function ProfileLoading() {
  return (
    <div className="mx-auto max-w-lg space-y-6 p-4 md:p-6">
      <div>
        <div className="h-6 w-16 animate-pulse rounded bg-muted" />
        <div className="mt-1 h-4 w-40 animate-pulse rounded bg-muted" />
      </div>

      <div className="space-y-4">
        <div>
          <div className="mb-1.5 h-3 w-12 animate-pulse rounded bg-muted" />
          <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
        </div>
        <div>
          <div className="mb-1.5 h-3 w-12 animate-pulse rounded bg-muted" />
          <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
        </div>
        <div>
          <div className="mb-1.5 h-3 w-16 animate-pulse rounded bg-muted" />
          <div className="h-9 w-full animate-pulse rounded-lg bg-muted" />
        </div>
        <div className="h-10 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}
