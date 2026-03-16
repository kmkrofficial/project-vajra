import { Shimmer } from "@/components/ui/shimmer";

export default function ProfileLoading() {
  return (
    <div className="mx-auto max-w-lg space-y-6 p-4 md:p-6">
      <div>
        <Shimmer className="h-6 w-16" />
        <Shimmer className="mt-1 h-4 w-40" />
      </div>

      <div className="space-y-4">
        <div>
          <Shimmer className="mb-1.5 h-3 w-12" />
          <Shimmer className="h-9 w-full rounded-lg" />
        </div>
        <div>
          <Shimmer className="mb-1.5 h-3 w-12" />
          <Shimmer className="h-9 w-full rounded-lg" />
        </div>
        <div>
          <Shimmer className="mb-1.5 h-3 w-16" />
          <Shimmer className="h-9 w-full rounded-lg" />
        </div>
        <Shimmer className="h-10 w-full rounded-lg" />
      </div>
    </div>
  );
}
