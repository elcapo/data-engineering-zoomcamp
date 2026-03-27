"use client";

import React, { useState, useMemo } from "react";
import type { IssueCompletion, IssueDetail, PaginatedResult } from "@/types/domain";
import { MetricBar } from "@/components/ui/MetricBar";
import { ChevronIcon } from "@/components/ui/ChevronIcon";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

interface DispositionSectionProps {
  issues: IssueCompletion[];
}

export function DispositionSection({ issues }: DispositionSectionProps) {
  const [expandedYear, setExpandedYear] = useState<number | null>(null);
  const [expandedIssue, setExpandedIssue] = useState<string | null>(null);
  const [details, setDetails] = useState<Map<string, PaginatedResult<IssueDetail>>>(new Map());
  const [loading, setLoading] = useState<string | null>(null);

  const byYear = useMemo(() => {
    const map = new Map<number, IssueCompletion[]>();
    for (const i of issues) {
      const list = map.get(i.year) ?? [];
      list.push(i);
      map.set(i.year, list);
    }
    return map;
  }, [issues]);

  const years = useMemo(() => [...byYear.keys()].sort((a, b) => b - a), [byYear]);

  const yearSummary = useMemo(() => {
    return years.map((year) => {
      const items = byYear.get(year)!;
      const totalDocuments = items.reduce((s, i) => s + i.totalDocuments, 0);
      const downloadedDocuments = items.reduce((s, i) => s + i.downloadedDocuments, 0);
      const extractedDocuments = items.reduce((s, i) => s + i.extractedDocuments, 0);
      const latestDownload = items.reduce<string | null>((latest, i) => {
        if (!i.downloadedAt) return latest;
        if (!latest) return i.downloadedAt;
        return i.downloadedAt > latest ? i.downloadedAt : latest;
      }, null);
      return {
        year,
        totalDocuments,
        downloadedDocuments,
        extractedDocuments,
        downloadPercentage: totalDocuments > 0 ? (downloadedDocuments / totalDocuments) * 100 : 0,
        downloadedAt: latestDownload,
      };
    });
  }, [years, byYear]);

  const globalSummary = useMemo(() => {
    const total = yearSummary.reduce((s, y) => s + y.totalDocuments, 0);
    const downloaded = yearSummary.reduce((s, y) => s + y.downloadedDocuments, 0);
    const pct = total > 0 ? (downloaded / total) * 100 : 0;
    return { total, downloaded, pct };
  }, [yearSummary]);

  async function loadDetails(year: number, issue: number, page = 1) {
    const key = `${year}-${issue}`;
    setLoading(key);
    try {
      const res = await fetch(`/api/metrics/issue-details?year=${year}&issue=${issue}&page=${page}&pageSize=50`);
      const data: PaginatedResult<IssueDetail> = await res.json();
      setDetails((prev) => new Map(prev).set(key, data));
    } finally {
      setLoading(null);
    }
  }

  function toggleYear(year: number) {
    setExpandedYear(expandedYear === year ? null : year);
    setExpandedIssue(null);
  }

  function toggleIssue(year: number, issue: number) {
    const key = `${year}-${issue}`;
    if (expandedIssue === key) {
      setExpandedIssue(null);
      return;
    }
    setExpandedIssue(key);
    if (!details.has(key)) {
      loadDetails(year, issue);
    }
  }

  return (
    <section className="mb-12">
      <h2 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">Disposiciones</h2>

      <p className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
        <span className="font-mono tabular-nums">{globalSummary.pct.toFixed(1)}%</span> descargado
        <span className="ml-2 text-sm font-normal text-zinc-500 dark:text-zinc-400">
          ({globalSummary.downloaded.toLocaleString("es-ES")} de {globalSummary.total.toLocaleString("es-ES")} disposiciones)
        </span>
      </p>

      <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
        Haz clic en un año para ver sus boletines, y en un boletín para ver el detalle por disposición.
      </p>

      <div className="overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50/50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/30 dark:text-zinc-400">
                <th className="px-4 py-2.5 font-medium">Año</th>
                <th className="px-4 py-2.5 font-medium">Últ. descarga</th>
                <th className="px-4 py-2.5 font-medium text-right">Total</th>
                <th className="px-4 py-2.5 font-medium text-right">Descargadas</th>
                <th className="px-4 py-2.5 font-medium text-right">Extraídas</th>
                <th className="px-4 py-2.5 font-medium" style={{ minWidth: 120 }}>Progreso</th>
              </tr>
            </thead>
            {yearSummary.map((ys) => (
              <tbody key={ys.year}>
                <tr
                  className="cursor-pointer border-b border-zinc-100 transition-colors duration-100 hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800/50"
                  onClick={() => toggleYear(ys.year)}
                >
                  <td className="px-4 py-2.5 font-medium text-zinc-900 dark:text-zinc-100">
                    <span className="flex items-center gap-1.5">
                      <ChevronIcon expanded={expandedYear === ys.year} />
                      <span className="font-mono tabular-nums">{ys.year}</span>
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-600 dark:text-zinc-400">{formatDate(ys.downloadedAt)}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums">{ys.totalDocuments}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-accent dark:text-accent-light">{ys.downloadedDocuments}</td>
                  <td className="px-4 py-2.5 text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">{ys.extractedDocuments}</td>
                  <td className="px-4 py-2.5">
                    <MetricBar percentage={ys.downloadPercentage} />
                  </td>
                </tr>

                {expandedYear === ys.year && (byYear.get(ys.year) ?? []).map((iss) => {
                  const key = `${iss.year}-${iss.issue}`;
                  const detail = details.get(key);
                  return (
                    <React.Fragment key={key}>
                      <tr
                        className="cursor-pointer border-b border-zinc-50 bg-zinc-50/50 transition-colors duration-100 hover:bg-zinc-100/50 dark:border-zinc-800/50 dark:bg-zinc-800/20 dark:hover:bg-zinc-800/40"
                        onClick={() => toggleIssue(iss.year, iss.issue)}
                      >
                        <td className="py-2 pl-10 pr-4 text-zinc-700 dark:text-zinc-300">
                          <span className="flex items-center gap-1.5">
                            <ChevronIcon expanded={expandedIssue === key} className="size-3.5" />
                            <span className="font-mono tabular-nums">N.&ordm; {iss.issue}</span>
                          </span>
                        </td>
                        <td className="py-2 pr-4 text-xs text-zinc-500 dark:text-zinc-400">{formatDate(iss.downloadedAt)}</td>
                        <td className="py-2 pr-4 text-right font-mono tabular-nums text-xs">{iss.totalDocuments}</td>
                        <td className="py-2 pr-4 text-right font-mono tabular-nums text-xs text-accent dark:text-accent-light">{iss.downloadedDocuments}</td>
                        <td className="py-2 pr-4 text-right font-mono tabular-nums text-xs text-emerald-600 dark:text-emerald-400">{iss.extractedDocuments}</td>
                        <td className="py-2 pr-4">
                          <MetricBar percentage={iss.downloadPercentage} />
                        </td>
                      </tr>

                      {expandedIssue === key && (
                        <tr>
                          <td colSpan={6} className="px-4 pb-3 pt-1">
                            {loading === key ? (
                              <div className="flex items-center gap-2 py-3 pl-12 text-xs text-zinc-400">
                                <div className="size-3 animate-spin rounded-full border-2 border-zinc-300 border-t-accent" />
                                Cargando...
                              </div>
                            ) : detail ? (
                              <div className="ml-8 border-l-2 border-accent/40 pl-4">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-zinc-500 dark:text-zinc-400">
                                      <th className="pb-1.5 pr-3 text-left font-medium">Disp.</th>
                                      <th className="pb-1.5 pr-3 text-left font-medium">Descargada</th>
                                      <th className="pb-1.5 text-left font-medium">Extraída</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {detail.data.map((d) => (
                                      <tr key={d.disposition} className="border-b border-zinc-50 transition-colors duration-100 dark:border-zinc-800/50">
                                        <td className="py-1.5 pr-3 font-mono tabular-nums text-zinc-700 dark:text-zinc-300">{d.disposition}</td>
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
                                  </tbody>
                                </table>

                                {detail.totalPages > 1 && (
                                  <div className="mt-2 flex items-center gap-2 text-xs">
                                    <button
                                      disabled={detail.page <= 1}
                                      onClick={(e) => { e.stopPropagation(); loadDetails(iss.year, iss.issue, detail.page - 1); }}
                                      className="rounded-lg px-2 py-1 text-accent transition-colors duration-150 hover:bg-accent-muted disabled:text-zinc-300 dark:text-accent-light dark:disabled:text-zinc-600"
                                    >
                                      ← Anterior
                                    </button>
                                    <span className="font-mono tabular-nums text-zinc-500">
                                      Página {detail.page} de {detail.totalPages} ({detail.total} disp.)
                                    </span>
                                    <button
                                      disabled={detail.page >= detail.totalPages}
                                      onClick={(e) => { e.stopPropagation(); loadDetails(iss.year, iss.issue, detail.page + 1); }}
                                      className="rounded-lg px-2 py-1 text-accent transition-colors duration-150 hover:bg-accent-muted disabled:text-zinc-300 dark:text-accent-light dark:disabled:text-zinc-600"
                                    >
                                      Siguiente →
                                    </button>
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            ))}
          </table>
        </div>
      </div>
    </section>
  );
}
