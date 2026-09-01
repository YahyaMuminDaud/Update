import { ComplaintSkeleton } from "@/components/EmptyState";
import { MegaphoneIcon } from "@/components/icons";

export default function Loading() {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-border bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <MegaphoneIcon className="h-5 w-5 text-primary" />
            <span className="text-lg font-bold tracking-tight text-foreground">Complainathon</span>
          </div>
          <div className="h-10 w-10 rounded-full bg-border animate-pulse" aria-hidden="true" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6">
        <div className="space-y-4">
          <div className="h-32 rounded-xl border border-border bg-card animate-pulse" aria-hidden="true" />
          <div className="space-y-3">
            <ComplaintSkeleton />
            <ComplaintSkeleton />
            <ComplaintSkeleton />
          </div>
        </div>
      </main>
    </>
  );
}
