"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ComparisonDatum {
  label: string;
  downloaded: number;
  extracted: number;
}

interface ComparisonChartProps {
  data: ComparisonDatum[];
  height?: number;
  className?: string;
}

export function ComparisonChart({ data, height = 350, className = "" }: ComparisonChartProps) {
  return (
    <div className={className} style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <RechartsBarChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="label" />
          <YAxis domain={[0, 100]} />
          <Tooltip formatter={(v) => `${Number(v).toFixed(1)}%`} />
          <Legend />
          <Bar dataKey="downloaded" name="Descargado" fill="#4f46e5" radius={[4, 4, 0, 0]} />
          <Bar dataKey="extracted" name="Extraído" fill="#10b981" radius={[4, 4, 0, 0]} />
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
