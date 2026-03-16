import { Shimmer } from "@/components/ui/shimmer";

export default function KioskLoading() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background">
      <Shimmer className="size-12 rounded-xl" />
      <Shimmer className="mt-4 h-5 w-32" />
    </div>
  );
}
