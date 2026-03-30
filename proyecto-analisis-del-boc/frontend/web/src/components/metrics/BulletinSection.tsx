"use client";

import { useState, useMemo } from "react";
import type { YearCompletion, YearDetail } from "@/types/domain";
import { MetricBar } from "@/components/ui/MetricBar";
import { formatNumber } from "@/lib/format";
import { ChevronIcon } from "@/components/ui/ChevronIcon";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

interface BulletinSectionProps {
  years: YearCompletion[];
}

export function BulletinSection({ years }: BulletinSectionProps) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [details, setDetails] = useState<Map<number, YearDetail[]>>(new Map());
  const [loading, setLoading] = useState<number | null>(null);

  const summary = useMemo(() => {
    const totalIssues = years.reduce((s, y) => s + y.totalIssues, 0);
    const downloadedIssues = years.reduce((s, y) => s + y.downloadedIssues, 0);
    const pct = totalIssues > 0 ? (downloadedIssues / totalIssues) * 100 : 0;
    return { totalIssues, downloadedIssues, pct };
  }, [years]);

  async function toggle(year: number) {
    if (expanded === year) {
      setExpanded(null);
      return;
    }
    setExpanded(year);
    if (!details.has(year)) {
      setLoading(year);
      try {
        const res = await fetch(`/api/metrics/year-details?year=${year}`);
        const data: YearDetail[] = await res.json();
        setDetails((prev) => new Map(prev).set(year, data));
      } finally {
        setLoading(null);
      }
    }
  }

  return (
    <section className="mb-12">
      <h2 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">Boletines</h2>

      <p className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        <span className="font-mono tabular-nums">{summary.pct.toFixed(1)}%</span> descargado
        <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
          ({formatNumber(summary.downloadedIssues)} de {formatNumber(summary.totalIssues)} boletines)
        </span>
      </p>

      <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
        Haz clic en un año para ver el detalle por boletín.
      </p>

      <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/30 dark:text-zinc-400">
                <th className="px-4 py-2.5 font-medium">Año</th>
                <th className="px-4 py-2.5 font-medium">Últ. descarga</th>
                <th className="px-4 py-2.5 font-medium text-right">Total</th>
                <th className="px-4 py-2.5 font-medium text-right">Descargados</th>
                <th className="px-4 py-2.5 font-medium text-right">Extraídos</th>
                <th className="px-4 py-2.5 font-medium" style={{ minWidth: 120 }}>Progreso</th>
              </tr>
            </thead>
            {years.map((y) => (
              <tbody key={y.year}>
                  <tr
                    className="cursor-pointer border-b border-zinc-100 transition-colors duration-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                    onClick={() => toggle(y.year)}
                  >
                    <td className="px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-100">
                      <span className="flex items-center gap-1.5">
                        <ChevronIcon expanded={expanded === y.year} />
                        <span className="font-mono tabular-nums">{y.year}</span>
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">{formatDate(y.downloadedAt)}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums">{y.totalIssues}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-accent dark:text-accent-light">{y.downloadedIssues}</td>
                    <td className="px-4 py-2.5 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{y.extractedIssues}</td>
                    <td className="px-4 py-2.5">
                      <MetricBar percentage={y.downloadPercentage} />
                    </td>
                  </tr>

                  {expanded === y.year && (
                    <tr>
                      <td colSpan={6} className="px-4 pb-3 pt-1">
                        {loading === y.year ? (
                          <div className="flex items-center gap-2 py-3 pl-6 text-xs text-zinc-400">
                            <div className="size-3 animate-spin rounded-full border-2 border-zinc-300 border-t-accent" />
                            Cargando...
                          </div>
                        ) : (
                          <div className="ml-2 border-l-2 border-accent/40 pl-4">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-zinc-500 dark:text-zinc-400">
                                  <th className="pb-1.5 pr-3 text-left font-medium">N.&ordm;</th>
                                  <th className="pb-1.5 pr-3 text-left font-medium">Descargado</th>
                                  <th className="pb-1.5 text-left font-medium">Extraído</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(details.get(y.year) ?? []).map((d) => (
                                  <tr key={d.issue} className="border-b border-zinc-50 transition-colors duration-100 dark:border-zinc-800/50">
                                    <td className="py-1.5 pr-3 font-mono tabular-nums text-zinc-700 dark:text-zinc-300">{d.issue}</td>
                                    <td className="py-1.5 pr-3">
                                      {d.downloadedAt
                                        ? <span className="text-accent dark:text-accent-light">{formatDate(d.downloadedAt)}</span>
                                        : <span className="text-zinc-400">—</span>}
                                    </td>
                                    <td className="py-1.5">
                                      {d.extractedAt
                                        ? <span className="text-emerald-600 dark:text-emerald-400">{formatDate(d.extractedAt)}</span>
                                        : <span className="text-zinc-400">—</span>}
                                    </td>
                                  </tr>
                                ))}
                                {(details.get(y.year) ?? []).length === 0 && (
                                  <tr><td colSpan={3} className="py-1.5 text-zinc-400">Sin detalle</td></tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
              </tbody>
            ))}
          </table>
        </div>
      </div>
    </section>
  );
}
