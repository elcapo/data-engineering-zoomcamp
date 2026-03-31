"use client";

import { useRouter } from "next/navigation";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import type { FacetBucket } from "@/types/domain";
import { formatNumber } from "@/lib/format";

const PALETTE = [
  "#6366f1", // indigo-500
  "#8b5cf6", // violet-500
  "#a855f7", // purple-500
  "#d946ef", // fuchsia-500
  "#ec4899", // pink-500
  "#f43f5e", // rose-500
  "#f97316", // orange-500
  "#eab308", // yellow-500
  "#22c55e", // green-500
  "#14b8a6", // teal-500
];

const OTHER_COLOR = "#a1a1aa"; // zinc-400

interface DistributionChartsProps {
  sections: FacetBucket[];
  sectionTotal: number;
  organizations: FacetBucket[];
  orgTotal: number;
}

export function DistributionCharts({ sections, sectionTotal, organizations, orgTotal }: DistributionChartsProps) {
  return (
    <section className="mb-10">
      <div className="grid gap-6 lg:grid-cols-2">
        <DistributionChart
          title="Disposiciones por sección"
          data={sections}
          total={sectionTotal}
          filterParam="include_section"
        />
        <DistributionChart
          title="Disposiciones por organismo"
          data={organizations}
          total={orgTotal}
          filterParam="include_org"
        />
      </div>
    </section>
  );
}

interface ChartDatum {
  name: string;
  value: number;
  color: string;
  clickable: boolean;
}

function DistributionChart({ title, data, total, filterParam }: {
  title: string;
  data: FacetBucket[];
  total: number;
  filterParam: string;
}) {
  const router = useRouter();

  const topSum = data.reduce((s, d) => s + d.count, 0);
  const otherCount = total - topSum;

  const chartData: ChartDatum[] = data.map((d, i) => ({
    name: d.label,
    value: d.count,
    color: PALETTE[i % PALETTE.length],
    clickable: true,
  }));

  if (otherCount > 0) {
    chartData.push({ name: "Otros", value: otherCount, color: OTHER_COLOR, clickable: false });
  }

  function handleClick(entry: ChartDatum) {
    if (!entry.clickable) return;
    router.push(`/buscar?${filterParam}=${encodeURIComponent(entry.name)}`);
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-800">
      <h3 className="mb-4 text-sm font-semibold text-zinc-700 dark:text-zinc-300">{title}</h3>

      <div className="flex items-start gap-4">
        {/* Chart */}
        <div className="h-[200px] w-[200px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                outerRadius="90%"
                innerRadius="50%"
                dataKey="value"
                onClick={(_, index) => handleClick(chartData[index])}
                className="outline-none"
              >
                {chartData.map((entry, i) => (
                  <Cell
                    key={i}
                    fill={entry.color}
                    className={entry.clickable ? "cursor-pointer" : ""}
                  />
                ))}
              </Pie>
              <Tooltip
                content={({ active, payload }) => {
                  if (!active || !payload?.[0]) return null;
                  const d = payload[0].payload as ChartDatum;
                  const pct = total > 0 ? ((d.value / total) * 100).toFixed(1) : "0.0";
                  return (
                    <div className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs shadow-md dark:border-zinc-700 dark:bg-zinc-800">
                      <div className="font-medium text-zinc-900 dark:text-zinc-100">{d.name}</div>
                      <div className="text-zinc-500 dark:text-zinc-400">
                        {formatNumber(d.value)} ({pct}%)
                      </div>
                    </div>
                  );
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend */}
        <ul className="flex flex-1 flex-col gap-1.5 pt-1 text-xs">
          {chartData.map((entry, i) => (
            <li key={i} className="flex items-center gap-2">
              <span className="inline-block size-2.5 shrink-0 rounded-full" style={{ backgroundColor: entry.color }} />
              {entry.clickable ? (
                <button
                  onClick={() => handleClick(entry)}
                  className="truncate text-left text-zinc-700 transition-colors hover:text-accent dark:text-zinc-300 dark:hover:text-accent-light"
                >
                  {entry.name}
                </button>
              ) : (
                <span className="truncate text-zinc-400 dark:text-zinc-500">{entry.name}</span>
              )}
              <span className="ml-auto shrink-0 font-mono tabular-nums text-zinc-400 dark:text-zinc-500">
                {formatNumber(entry.value)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
