import { Card } from "@/components/ui/Card";

interface MetricKPIProps {
  label: string;
  value: string | number;
  detail?: string;
}

export function MetricKPI({ label, value, detail }: MetricKPIProps) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-accent" />
      <div className="flex flex-col gap-1 pt-1">
        <span className="text-5xl font-bold tracking-tight tabular-nums font-mono text-zinc-900 dark:text-zinc-100">
          {typeof value === "number" ? `${value.toFixed(1)}%` : value}
        </span>
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
        {detail && (
          <span className="text-xs text-zinc-400 dark:text-zinc-500">{detail}</span>
        )}
      </div>
    </Card>
  );
}
