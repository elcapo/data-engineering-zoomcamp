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
}

function barFill(value: number): string {
  if (value >= 95) return "#10b981"; // emerald-500
  if (value >= 50) return "#0ea5e9"; // sky-500
  return "#f97316"; // orange-500
}

export function BarChart({ data, layout = "vertical", height = 400, colorByValue = false, className = "" }: BarChartProps) {
  const isVertical = layout === "vertical";

  return (
    <div className={className} style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <RechartsBarChart
          data={data}
          layout={isVertical ? "vertical" : "horizontal"}
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          {isVertical ? (
            <>
              <XAxis type="number" domain={[0, 100]} />
              <YAxis type="category" dataKey="label" width={50} />
            </>
          ) : (
            <>
              <XAxis dataKey="label" />
              <YAxis domain={[0, "auto"]} />
            </>
          )}
          <Tooltip />
          <Bar dataKey="value" radius={[4, 4, 0, 0]}>
            {colorByValue
              ? data.map((entry, i) => <Cell key={i} fill={barFill(entry.value)} />)
              : null}
          </Bar>
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
