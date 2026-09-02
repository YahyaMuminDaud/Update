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
