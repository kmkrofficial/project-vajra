import { Shimmer } from "@/components/ui/shimmer";

export default function AboutLoading() {
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
          <Shimmer className="mx-auto h-12 w-full max-w-xl rounded-lg sm:h-16" />
          <Shimmer className="mx-auto mt-6 h-6 w-full max-w-md" />
        </div>
      </section>

      {/* Story skeleton */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <div className="mx-auto max-w-3xl">
          <Shimmer className="h-8 w-40" />
          <div className="mt-6 space-y-3">
            <Shimmer className="h-4 w-full" />
            <Shimmer className="h-4 w-5/6" />
            <Shimmer className="h-4 w-full" />
            <Shimmer className="h-4 w-4/5" />
            <Shimmer className="h-4 w-full" />
            <Shimmer className="h-4 w-3/4" />
          </div>
        </div>
      </section>

      {/* Values skeleton */}
      <section className="border-y border-border bg-card/30">
        <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 md:py-28">
          <div className="mx-auto max-w-2xl text-center">
            <Shimmer className="mx-auto h-9 w-56 rounded-lg" />
            <Shimmer className="mx-auto mt-4 h-5 w-72" />
          </div>
          <div className="mt-16 grid gap-8 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-8">
                <Shimmer className="mb-5 size-11 rounded-xl" />
                <Shimmer className="mb-2 h-5 w-28" />
                <Shimmer className="h-4 w-full" />
                <Shimmer className="mt-1.5 h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
