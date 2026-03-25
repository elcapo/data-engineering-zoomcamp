import { Card } from "@/components/ui/Card";

interface MetricKPIProps {
  label: string;
  value: string | number;
  detail?: string;
}

export function MetricKPI({ label, value, detail }: MetricKPIProps) {
  return (
    <Card className="flex flex-col items-center gap-1 text-center">
      <span className="text-3xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">
        {typeof value === "number" ? `${value.toFixed(1)}%` : value}
      </span>
      <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{label}</span>
      {detail && (
        <span className="text-xs text-zinc-400 dark:text-zinc-500">{detail}</span>
      )}
    </Card>
  );
}
