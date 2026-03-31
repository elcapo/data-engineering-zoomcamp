"use client";

import Link from "next/link";
import { PieChart, Pie, Sector, Tooltip, ResponsiveContainer } from "recharts";
import type { PieSectorDataItem } from "recharts";
import type { BulletinSummary, ProcessedBulletin } from "@/types/domain";
import { formatNumber } from "@/lib/format";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

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

interface BulletinSectionProps {
  summary: BulletinSummary;
  recent: ProcessedBulletin[];
  oldest: ProcessedBulletin[];
}

export function BulletinSection({ summary, recent, oldest }: BulletinSectionProps) {
  const chartData = [
    { name: "Procesados", value: summary.processed, fill: COLORS.processed },
    { name: "Sin procesar", value: summary.total - summary.processed, fill: COLORS.pending },
  ];

  return (
    <section className="mb-12">
      <h2 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">Boletines</h2>

      <p className="mb-6 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        <span className="font-mono tabular-nums">{summary.percentage.toFixed(1)}%</span> procesado
        <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
          ({formatNumber(summary.processed)} de {formatNumber(summary.total)} boletines)
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

      {/* Tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        <BulletinTable title="Últimos procesados" bulletins={recent} />
        <BulletinTable title="Primeros procesados" bulletins={oldest} />
      </div>
    </section>
  );
}

function BulletinTable({ title, bulletins }: { title: string; bulletins: ProcessedBulletin[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-800">
      <h3 className="border-b border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/30 dark:text-zinc-300">
        {title}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              <th className="px-4 py-2 font-medium">Boletín</th>
              <th className="px-4 py-2 font-medium">Procesado</th>
            </tr>
          </thead>
          <tbody>
            {bulletins.map((b) => (
              <tr key={`${b.year}-${b.issue}`} className="border-b border-zinc-100 transition-colors duration-100 last:border-b-0 dark:border-zinc-800">
                <td className="px-4 py-2.5">
                  <Link
                    href={`/boletin/${b.year}/${b.issue}`}
                    className="font-mono tabular-nums text-accent transition-colors hover:text-accent-light dark:text-accent-light dark:hover:text-accent"
                  >
                    {b.year}/{String(b.issue).padStart(3, "0")}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                  {formatDate(b.processedAt)}
                </td>
              </tr>
            ))}
            {bulletins.length === 0 && (
              <tr><td colSpan={2} className="px-4 py-3 text-zinc-400">Sin datos</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
