import { Dumbbell } from "lucide-react";
import { Shimmer } from "@/components/ui/shimmer";

export default function OnboardingLoading() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="flex h-14 shrink-0 items-center justify-center border-b border-border px-4">
        <div className="flex items-center gap-2">
          <Dumbbell className="size-5 text-primary" />
          <span className="text-lg font-bold">Vajra</span>
        </div>
      </header>

      <div className="mx-auto mt-8 flex w-full max-w-md items-center gap-2 px-6">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
            <Shimmer className="h-1 w-full rounded-full" />
            <Shimmer className="h-2 w-10" />
          </div>
        ))}
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 pb-24">
        <div className="space-y-6">
          <div>
            <Shimmer className="size-10 rounded-lg" />
            <Shimmer className="mt-3 h-7 w-40" />
            <Shimmer className="mt-2 h-4 w-64" />
          </div>
          <div className="space-y-4">
            <Shimmer className="h-9 w-full rounded-lg" />
            <Shimmer className="h-9 w-full rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
