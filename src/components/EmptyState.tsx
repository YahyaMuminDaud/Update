import { MegaphoneIcon } from "@/components/icons";

export function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed border-border p-10 text-center">
      <MegaphoneIcon className="mx-auto h-8 w-8 text-muted" />
      <h2 className="mt-3 text-sm font-semibold text-foreground">No complaints yet</h2>
      <p className="mt-1 text-sm text-muted">Be the first to get something off your chest.</p>
    </div>
  );
}

export function ComplaintSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card p-4" aria-hidden="true">
      <div className="flex gap-3">
        <div className="h-10 w-10 shrink-0 rounded-full bg-border animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-32 rounded bg-border animate-pulse" />
          <div className="h-3 w-full rounded bg-border animate-pulse" />
          <div className="h-3 w-2/3 rounded bg-border animate-pulse" />
        </div>
      </div>
    </div>
  );
}
