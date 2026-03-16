export default function PricingLoading() {
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
          <div className="mx-auto h-12 w-full max-w-lg animate-pulse rounded-lg bg-muted sm:h-16" />
          <div className="mx-auto mt-6 h-6 w-60 animate-pulse rounded bg-muted" />
        </div>
      </section>

      {/* Card skeleton */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 md:pb-28">
        <div className="mx-auto max-w-md">
          <div className="flex flex-col rounded-2xl border border-border bg-card p-8">
            <div className="mb-5 size-11 animate-pulse rounded-xl bg-muted" />
            <div className="h-6 w-24 animate-pulse rounded bg-muted" />
            <div className="mt-1.5 h-4 w-40 animate-pulse rounded bg-muted" />
            <div className="mt-6 mb-6">
              <div className="h-10 w-28 animate-pulse rounded bg-muted" />
            </div>
            <div className="mb-8 flex-1 space-y-3">
              {Array.from({ length: 8 }).map((_, j) => (
                <div key={j} className="flex items-center gap-2.5">
                  <div className="size-4 shrink-0 animate-pulse rounded bg-muted" />
                  <div className="h-4 w-full animate-pulse rounded bg-muted" />
                </div>
              ))}
            </div>
            <div className="h-11 w-full animate-pulse rounded-xl bg-muted" />
          </div>
          <div className="mx-auto mt-6 h-4 w-72 animate-pulse rounded bg-muted" />
        </div>
      </section>

      {/* FAQ skeleton */}
      <section className="border-t border-border bg-card/30">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 md:py-28">
          <div className="mx-auto h-9 w-64 animate-pulse rounded-lg bg-muted" />
          <div className="mt-12 divide-y divide-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="py-6">
                <div className="h-5 w-56 animate-pulse rounded bg-muted" />
                <div className="mt-2 h-4 w-full animate-pulse rounded bg-muted" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
