"use client";

import { PieChart, Pie, Sector, Tooltip, ResponsiveContainer } from "recharts";
import type { PieSectorDataItem } from "recharts";
import { Card } from "@/components/ui/Card";
import { formatNumber } from "@/lib/format";

const COLORS = {
  processed: "var(--color-accent)",
  pending: "#a1a1aa",
};

function renderActiveShape(props: PieSectorDataItem) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, percent } = props;

  return (
    <g>
      <text x={cx} y={(cy ?? 0) + 6} textAnchor="middle" fill="currentColor" className="text-lg font-bold">
        {`${((percent ?? 0) * 100).toFixed(1)}%`}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={(outerRadius ?? 0) + 3}
        outerRadius={(outerRadius ?? 0) + 6}
        fill={fill}
      />
    </g>
  );
}

interface MetricKPIProps {
  label: string;
  processed: number;
  total: number;
  processedLabel?: string;
}

export function MetricKPI({ label, processed, total, processedLabel = "procesados" }: MetricKPIProps) {
  const chartData = [
    { name: "Procesados", value: processed, fill: COLORS.processed },
    { name: "Sin procesar", value: total - processed, fill: COLORS.pending },
  ];

  return (
    <Card className="relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-1 bg-accent" />
      <div className="flex flex-col items-center gap-2 pt-1">
        <span className="text-sm font-medium text-zinc-600 dark:text-zinc-400">{label}</span>

        <div className="h-[140px] w-[140px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                activeShape={renderActiveShape}
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="78%"
                dataKey="value"
              />
              <Tooltip content={() => null} defaultIndex={0} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <span className="text-xs text-zinc-500 dark:text-zinc-400">
          {formatNumber(processed)} de {formatNumber(total)} {processedLabel}
        </span>
      </div>
    </Card>
  );
}
