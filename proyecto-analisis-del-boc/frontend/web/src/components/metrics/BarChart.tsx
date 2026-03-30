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
  onBarClick?: (label: string) => void;
}

function barFill(value: number): string {
  if (value >= 95) return "#10b981"; // emerald-500
  if (value >= 50) return "#0ea5e9"; // sky-500
  return "#f97316"; // orange-500
}

const ACCENT = "#1a5fb4"; // logo blue — matches --accent
const ACCENT_HOVER = "#3584e4"; // logo blue light — matches --accent-light

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
          margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          {isVertical ? (
            <>
              <XAxis type="number" domain={[0, 100]} />
              <YAxis type="category" dataKey="label" width={50} />
            </>
          ) : (
            <>
              <XAxis dataKey="label" />
              <YAxis
                domain={[0, "auto"]}
                tickFormatter={(v: number) => v.toLocaleString("es-ES")}
              />
            </>
          )}
          <Tooltip
            formatter={(value) => [Number(value).toLocaleString("es-ES"), "Resultados"]}
            cursor={clickable ? { fill: "var(--accent-muted, rgba(99,102,241,0.12))" } : undefined}
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
