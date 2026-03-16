import { cn } from "@/lib/utils";

export function Shimmer({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("shimmer rounded", className)} {...props} />;
}
