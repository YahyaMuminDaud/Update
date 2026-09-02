import { SpinnerIcon } from "@/components/icons";

export default function Loading() {
  return (
    <main className="flex flex-1 items-center justify-center">
      <SpinnerIcon className="h-6 w-6 text-muted" />
    </main>
  );
}
