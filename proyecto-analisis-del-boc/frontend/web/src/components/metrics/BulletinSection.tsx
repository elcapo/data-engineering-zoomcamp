"use client";

import { useState } from "react";
import type { YearCompletion, YearDetail } from "@/types/domain";
import { MetricBar } from "@/components/ui/MetricBar";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

interface BulletinSectionProps {
  years: YearCompletion[];
}

export function BulletinSection({ years }: BulletinSectionProps) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [details, setDetails] = useState<Map<number, YearDetail[]>>(new Map());
  const [loading, setLoading] = useState<number | null>(null);

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
    <section className="mb-10">
      <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">Boletines</h2>
      <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
        Haz clic en un año para ver el detalle por boletín.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              <th className="pb-2 pr-4 font-medium">Año</th>
              <th className="pb-2 pr-4 font-medium">Últ. descarga</th>
              <th className="pb-2 pr-4 font-medium text-right">Total</th>
              <th className="pb-2 pr-4 font-medium text-right">Descargados</th>
              <th className="pb-2 pr-4 font-medium text-right">Extraídos</th>
              <th className="pb-2 font-medium" style={{ minWidth: 120 }}>Progreso</th>
            </tr>
          </thead>
          {years.map((y) => (
            <tbody key={y.year}>
                <tr
                  className="cursor-pointer border-b border-zinc-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                  onClick={() => toggle(y.year)}
                >
                  <td className="py-1.5 pr-4 font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
                    <span className="mr-1 text-zinc-400">{expanded === y.year ? "▾" : "▸"}</span>
                    {y.year}
                  </td>
                  <td className="py-1.5 pr-4 text-zinc-600 dark:text-zinc-400">{formatDate(y.downloadedAt)}</td>
                  <td className="py-1.5 pr-4 text-right tabular-nums">{y.totalIssues}</td>
                  <td className="py-1.5 pr-4 text-right tabular-nums">{y.downloadedIssues}</td>
                  <td className="py-1.5 pr-4 text-right tabular-nums">{y.extractedIssues}</td>
                  <td className="py-1.5">
                    <MetricBar percentage={y.downloadPercentage} />
                  </td>
                </tr>

                {expanded === y.year && (
                  <tr>
                    <td colSpan={6} className="pb-3 pl-8">
                      {loading === y.year ? (
                        <p className="py-2 text-xs text-zinc-400">Cargando...</p>
                      ) : (
                        <div className="border-l-2 border-zinc-200 pl-4 dark:border-zinc-700">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-zinc-500 dark:text-zinc-400">
                                <th className="pb-1 pr-3 text-left font-medium">N.&ordm;</th>
                                <th className="pb-1 pr-3 text-left font-medium">Descargado</th>
                                <th className="pb-1 text-left font-medium">Extraído</th>
                              </tr>
                            </thead>
                            <tbody>
                              {(details.get(y.year) ?? []).map((d) => (
                                <tr key={d.issue} className="border-b border-zinc-50 dark:border-zinc-800/50">
                                  <td className="py-1 pr-3 tabular-nums text-zinc-700 dark:text-zinc-300">{d.issue}</td>
                                  <td className="py-1 pr-3">
                                    {d.downloadedAt
                                      ? <span className="text-blue-600 dark:text-blue-400">{formatDate(d.downloadedAt)}</span>
                                      : <span className="text-zinc-400">—</span>}
                                  </td>
                                  <td className="py-1">
                                    {d.extractedAt
                                      ? <span className="text-emerald-600 dark:text-emerald-400">{formatDate(d.extractedAt)}</span>
                                      : <span className="text-zinc-400">—</span>}
                                  </td>
                                </tr>
                              ))}
                              {(details.get(y.year) ?? []).length === 0 && (
                                <tr><td colSpan={3} className="py-1 text-zinc-400">Sin detalle</td></tr>
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
    </section>
  );
}
