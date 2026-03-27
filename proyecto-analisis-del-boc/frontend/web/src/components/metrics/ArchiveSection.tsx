"use client";

import { useState } from "react";
import type { ArchiveCompletion, ArchiveDetail } from "@/types/domain";
import { Card } from "@/components/ui/Card";
import { ChevronIcon } from "@/components/ui/ChevronIcon";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

interface ArchiveSectionProps {
  summary: ArchiveCompletion;
  details: ArchiveDetail[];
}

export function ArchiveSection({ summary, details }: ArchiveSectionProps) {
  const [showDetail, setShowDetail] = useState(false);

  return (
    <section className="mb-12">
      <h2 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">Archivo</h2>

      <Card>
        <div className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
          Última descarga: <span className="font-medium text-zinc-700 dark:text-zinc-300">{formatDate(summary.downloadedAt)}</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <span className="block text-3xl font-bold tracking-tight tabular-nums font-mono text-zinc-900 dark:text-zinc-100">{summary.totalYears}</span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">años publicados</span>
          </div>
          <div>
            <span className="block text-3xl font-bold tracking-tight tabular-nums font-mono text-accent dark:text-accent-light">{summary.downloadedYears}</span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">años descargados</span>
          </div>
          <div>
            <span className="block text-3xl font-bold tracking-tight tabular-nums font-mono text-emerald-600 dark:text-emerald-400">{summary.extractedYears}</span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">años extraídos</span>
          </div>
        </div>

        <button
          onClick={() => setShowDetail(!showDetail)}
          className="mt-4 flex items-center gap-1 text-sm font-medium text-accent transition-colors duration-150 hover:text-accent-light dark:text-accent-light dark:hover:text-accent"
        >
          <ChevronIcon expanded={showDetail} />
          {showDetail ? "Ocultar detalle" : "Ver detalle por año"}
        </button>

        {showDetail && (
          <div className="mt-3 overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50/50 text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/30 dark:text-zinc-400">
                  <th className="px-4 py-2.5 font-medium">Año</th>
                  <th className="px-4 py-2.5 font-medium">Descargado</th>
                  <th className="px-4 py-2.5 font-medium">Extraído</th>
                </tr>
              </thead>
              <tbody>
                {details.map((d) => (
                  <tr key={d.year} className="border-b border-zinc-100 transition-colors duration-100 even:bg-zinc-50/50 dark:border-zinc-800 dark:even:bg-zinc-800/20">
                    <td className="px-4 py-2.5 font-mono tabular-nums font-medium text-zinc-900 dark:text-zinc-100">{d.year}</td>
                    <td className="px-4 py-2.5">
                      {d.downloadedAt
                        ? <span className="text-accent dark:text-accent-light">{formatDate(d.downloadedAt)}</span>
                        : <span className="text-zinc-400">—</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      {d.extractedAt
                        ? <span className="text-emerald-600 dark:text-emerald-400">{formatDate(d.extractedAt)}</span>
                        : <span className="text-zinc-400">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </section>
  );
}
