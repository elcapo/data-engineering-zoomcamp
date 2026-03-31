"use client";

import Link from "next/link";
import { PieChart, Pie, Sector, Tooltip, ResponsiveContainer } from "recharts";
import type { PieSectorDataItem } from "recharts";
import type { ArchiveCompletion, YearOverview } from "@/types/domain";
import { formatNumber } from "@/lib/format";
import { MetricBar } from "@/components/ui/MetricBar";

const COLORS = {
  processed: "var(--color-accent)",
  pending: "#a1a1aa",
};

function renderActiveShape(props: PieSectorDataItem) {
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill, payload, percent } = props;

  return (
    <g>
      <text x={cx} y={(cy ?? 0) - 8} textAnchor="middle" fill="currentColor" className="text-sm font-medium">
        {payload?.name}
      </text>
      <text x={cx} y={(cy ?? 0) + 14} textAnchor="middle" fill="currentColor" className="text-xl font-bold">
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
        innerRadius={(outerRadius ?? 0) + 4}
        outerRadius={(outerRadius ?? 0) + 8}
        fill={fill}
      />
    </g>
  );
}

interface ArchiveSectionProps {
  summary: ArchiveCompletion;
  years: YearOverview[];
}

export function ArchiveSection({ summary, years }: ArchiveSectionProps) {
  const chartData = [
    { name: "Procesados", value: summary.downloadedYears, fill: COLORS.processed },
    { name: "Sin procesar", value: summary.totalYears - summary.downloadedYears, fill: COLORS.pending },
  ];

  return (
    <section className="mb-12">
      <h2 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">Años</h2>

      <p className="mb-6 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        <span className="font-mono tabular-nums">{summary.downloadedPercentage.toFixed(1)}%</span> procesado
        <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
          ({formatNumber(summary.downloadedYears)} de {formatNumber(summary.totalYears)} años)
        </span>
      </p>

      {/* Pie chart */}
      <div className="mb-8 flex justify-center">
        <div className="h-[280px] w-full max-w-[360px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                activeShape={renderActiveShape}
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius="55%"
                outerRadius="75%"
                dataKey="value"
              />
              <Tooltip content={() => null} defaultIndex={0} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Year breakdown table */}
      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/30 dark:text-zinc-400">
                <th className="px-4 py-2.5 font-medium">Año</th>
                <th className="px-4 py-2.5 font-medium text-right">Boletines publicados</th>
                <th className="px-4 py-2.5 font-medium text-right">Boletines procesados</th>
                <th className="px-4 py-2.5 font-medium" style={{ minWidth: 100 }}></th>
                <th className="px-4 py-2.5 font-medium text-right">Disposiciones publicadas</th>
                <th className="px-4 py-2.5 font-medium text-right">Disposiciones procesadas</th>
                <th className="px-4 py-2.5 font-medium" style={{ minWidth: 100 }}></th>
              </tr>
            </thead>
            <tbody>
              {years.map((y) => (
                <tr key={y.year} className="border-b border-zinc-100 transition-colors duration-100 last:border-b-0 even:bg-zinc-50/30 dark:border-zinc-800 dark:even:bg-zinc-800/20">
                  <td className="px-4 py-2.5">
                    <Link
                      href={`/ano/${y.year}`}
                      className="font-mono tabular-nums font-medium text-accent transition-colors hover:text-accent-light dark:text-accent-light dark:hover:text-accent"
                    >
                      {y.year}
                    </Link>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">{formatNumber(y.totalBulletins)}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">{formatNumber(y.processedBulletins)}</td>
                  <td className="px-4 py-2.5" title={`${y.bulletinPercentage.toFixed(1)}%`}>
                    <MetricBar percentage={y.bulletinPercentage} />
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">{formatNumber(y.totalDispositions)}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">{formatNumber(y.processedDispositions)}</td>
                  <td className="px-4 py-2.5" title={`${y.dispositionPercentage.toFixed(1)}%`}>
                    <MetricBar percentage={y.dispositionPercentage} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
