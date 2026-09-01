"use client";

import { useEffect } from "react";
import { MegaphoneIcon } from "@/components/icons";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col items-center justify-center px-4 py-16 text-center">
      <MegaphoneIcon className="h-8 w-8 text-muted" />
      <h1 className="mt-4 text-lg font-semibold text-foreground">Couldn&apos;t load the feed</h1>
      <p className="mt-1 max-w-sm text-sm text-muted">
        Something went wrong reaching the database. This is usually temporary.
      </p>
      <button
        type="button"
        onClick={reset}
        className="cursor-pointer mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary-hover transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        Try again
      </button>
    </main>
  );
}
