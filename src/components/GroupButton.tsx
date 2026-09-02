export function GroupButton({
  name,
  onClick,
}: {
  name: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="cursor-pointer min-w-28 rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-border/40 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {name}
    </button>
  );
}
