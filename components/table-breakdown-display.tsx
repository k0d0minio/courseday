type Props = {
  breakdown: number[];
};

export function TableBreakdownDisplay({ breakdown }: Props) {
  if (breakdown.length === 0) return null;
  const total = breakdown.reduce((s, n) => s + n, 0);
  return (
    <div className="space-y-1">
      <div className="flex flex-wrap gap-1.5">
        {breakdown.map((seats, i) => (
          <span
            key={i}
            className="inline-flex items-center justify-center rounded-md border bg-muted text-xs font-medium px-2 py-1 min-w-[1.75rem]"
          >
            {seats}
          </span>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {breakdown.length} {breakdown.length === 1 ? 'table' : 'tables'} · {total} covers
      </p>
    </div>
  );
}
