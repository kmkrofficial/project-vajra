import { Shimmer } from "@/components/ui/shimmer";

export default function PricingLoading() {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      {/* Nav skeleton */}
      <header className="sticky top-0 z-50 border-b border-transparent">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <Shimmer className="size-8 rounded-lg" />
            <Shimmer className="h-5 w-14" />
          </div>
          <div className="hidden items-center gap-4 md:flex">
            <Shimmer className="h-4 w-12" />
            <Shimmer className="h-4 w-12" />
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <Shimmer className="h-9 w-16 rounded-lg" />
            <Shimmer className="h-9 w-20 rounded-lg" />
          </div>
        </div>
      </header>

      {/* Hero skeleton */}
      <section className="mx-auto max-w-6xl px-4 pt-20 pb-12 sm:px-6 md:pt-32 md:pb-20">
        <div className="mx-auto max-w-3xl text-center">
          <Shimmer className="mx-auto h-12 w-full max-w-lg rounded-lg sm:h-16" />
          <Shimmer className="mx-auto mt-6 h-6 w-60" />
        </div>
      </section>

      {/* Card skeleton */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-20 sm:px-6 md:pb-28">
        <div className="mx-auto max-w-md">
          <div className="flex flex-col rounded-2xl border border-border bg-card p-8">
            <Shimmer className="mb-5 size-11 rounded-xl" />
            <Shimmer className="h-6 w-24" />
            <Shimmer className="mt-1.5 h-4 w-40" />
            <div className="mt-6 mb-6">
              <Shimmer className="h-10 w-28" />
            </div>
            <div className="mb-8 flex-1 space-y-3">
              {Array.from({ length: 8 }).map((_, j) => (
                <div key={j} className="flex items-center gap-2.5">
                  <Shimmer className="size-4 shrink-0" />
                  <Shimmer className="h-4 w-full" />
                </div>
              ))}
            </div>
            <Shimmer className="h-11 w-full rounded-xl" />
          </div>
          <Shimmer className="mx-auto mt-6 h-4 w-72" />
        </div>
      </section>

      {/* FAQ skeleton */}
      <section className="border-t border-border bg-card/30">
        <div className="mx-auto max-w-3xl px-4 py-20 sm:px-6 md:py-28">
          <Shimmer className="mx-auto h-9 w-64 rounded-lg" />
          <div className="mt-12 divide-y divide-border">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="py-6">
                <Shimmer className="h-5 w-56" />
                <Shimmer className="mt-2 h-4 w-full" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
