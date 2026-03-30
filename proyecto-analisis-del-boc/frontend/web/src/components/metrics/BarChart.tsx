"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { formatNumber } from "@/lib/format";

interface BarChartDatum {
  label: string;
  value: number;
}

interface BarChartProps {
  data: BarChartDatum[];
  layout?: "horizontal" | "vertical";
  height?: number;
  colorByValue?: boolean;
  className?: string;
  onBarClick?: (label: string) => void;
}

function barFill(value: number): string {
  if (value >= 95) return "#10b981"; // emerald-500
  if (value >= 50) return "#0ea5e9"; // sky-500
  return "#f97316"; // orange-500
}

const ACCENT = "#60a5fa"; // blue-400
const ACCENT_HOVER = "#93c5fd"; // blue-300

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 shadow-lg dark:border-zinc-700 dark:bg-zinc-800">
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{label}</p>
      <p className="text-sm font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">
        {formatNumber(Number(payload[0].value))} resultados
      </p>
    </div>
  );
}

export function BarChart({ data, layout = "vertical", height = 400, colorByValue = false, className = "", onBarClick }: BarChartProps) {
  const isVertical = layout === "vertical";
  const clickable = !!onBarClick;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleBarClick(entry: any) {
    if (onBarClick && entry?.label) {
      onBarClick(entry.label);
    }
  }

  return (
    <div className={className} style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <RechartsBarChart
          data={data}
          layout={isVertical ? "vertical" : "horizontal"}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <CartesianGrid vertical={false} stroke="var(--color-zinc-200, #e4e4e7)" strokeDasharray="3 3" opacity={0.5} />
          {isVertical ? (
            <>
              <XAxis type="number" domain={[0, 100]} />
              <YAxis type="category" dataKey="label" width={50} />
            </>
          ) : (
            <>
              <XAxis
                dataKey="label"
                interval={0}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[0, "auto"]}
                tickFormatter={(v: number) => formatNumber(v)}
                tick={{ fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                width={45}
              />
            </>
          )}
          <Tooltip
            content={<CustomTooltip />}
            cursor={false}
          />
          <Bar
            dataKey="value"
            radius={[4, 4, 0, 0]}
            fill={colorByValue ? undefined : ACCENT}
            style={clickable ? { cursor: "pointer" } : undefined}
            onClick={clickable ? handleBarClick : undefined}
            activeBar={{ fill: ACCENT_HOVER }}
          >
            {colorByValue
              ? data.map((entry, i) => <Cell key={i} fill={barFill(entry.value)} />)
              : null}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
