export default function AboutLoading() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {/* Nav skeleton */}
      <header className="sticky top-0 z-50 border-b border-transparent">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="size-8 animate-pulse rounded-lg bg-muted" />
            <div className="h-5 w-14 animate-pulse rounded bg-muted" />
          </div>
          <div className="hidden items-center gap-4 md:flex">
            <div className="h-4 w-12 animate-pulse rounded bg-muted" />
            <div className="h-4 w-12 animate-pulse rounded bg-muted" />
            <div className="h-4 w-12 animate-pulse rounded bg-muted" />
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <div className="h-9 w-16 animate-pulse rounded-lg bg-muted" />
            <div className="h-9 w-20 animate-pulse rounded-lg bg-muted" />
          </div>
        </div>
      </header>

      {/* Hero skeleton */}
      <section className="mx-auto max-w-6xl px-4 pt-20 pb-12 sm:px-6 md:pt-32 md:pb-20">
        <div className="mx-auto max-w-3xl text-center">
          <div className="mx-auto h-12 w-full max-w-xl animate-pulse rounded-lg bg-muted sm:h-16" />
          <div className="mx-auto mt-6 h-6 w-full max-w-md animate-pulse rounded bg-muted" />
        </div>
      </section>

      {/* Story skeleton */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-3xl">
          <div className="h-8 w-40 animate-pulse rounded bg-muted" />
          <div className="mt-6 space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-5/6 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
          </div>
        </div>
      </section>

      {/* Values skeleton */}
      <section className="border-y border-border bg-card/30">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto h-9 w-56 animate-pulse rounded-lg bg-muted" />
            <div className="mx-auto mt-4 h-5 w-72 animate-pulse rounded bg-muted" />
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-8">
                <div className="mb-5 size-11 animate-pulse rounded-xl bg-muted" />
                <div className="mb-2 h-5 w-28 animate-pulse rounded bg-muted" />
                <div className="h-4 w-full animate-pulse rounded bg-muted" />
                <div className="mt-1.5 h-4 w-3/4 animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
