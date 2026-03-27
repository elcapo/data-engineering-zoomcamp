interface MetricBarProps {
  percentage: number;
  label?: string;
  className?: string;
}

function barColor(pct: number): string {
  if (pct >= 95) return "bg-emerald-500";
  if (pct >= 50) return "bg-sky-500";
  return "bg-orange-500";
}

export function MetricBar({ percentage, label, className = "" }: MetricBarProps) {
  const clamped = Math.min(Math.max(percentage, 0), 100);

  return (
    <div className={className}>
      {label && (
        <div className="mb-1 flex justify-between text-sm">
          <span className="text-zinc-600 dark:text-zinc-400">{label}</span>
          <span className="font-medium font-mono tabular-nums">{clamped.toFixed(1)}%</span>
        </div>
      )}
      <div className="h-3 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
        <div
          className={`h-full rounded-full ${barColor(clamped)}`}
          style={{ width: `${clamped}%`, animation: "grow-bar 600ms ease-out" }}
        />
      </div>
    </div>
  );
}
