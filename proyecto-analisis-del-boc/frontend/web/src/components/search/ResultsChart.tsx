"use client";

import { Disposition } from "@/types/domain";
import { BarChart } from "@/components/metrics/BarChart";

interface ResultsChartProps {
  results: Disposition[];
}

/**
 * Gráfica de barras con la distribución de resultados por año.
 * Se calcula a partir de los resultados de la página actual.
 */
export function ResultsChart({ results }: ResultsChartProps) {
  if (results.length === 0) return null;

  const countsByYear = new Map<number, number>();
  for (const d of results) {
    countsByYear.set(d.year, (countsByYear.get(d.year) ?? 0) + 1);
  }

  const data = Array.from(countsByYear.entries())
    .sort(([a], [b]) => a - b)
    .map(([year, count]) => ({ label: String(year), value: count }));

  if (data.length <= 1) return null;

  return (
    <div className="mb-6">
      <h3 className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
        Resultados por año (página actual)
      </h3>
      <BarChart data={data} layout="horizontal" height={200} />
    </div>
  );
}
