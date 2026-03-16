export default function KioskLoading() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background">
      <div className="size-12 animate-pulse rounded-xl bg-muted" />
      <div className="mt-4 h-5 w-32 animate-pulse rounded bg-muted" />
    </div>
  );
}
