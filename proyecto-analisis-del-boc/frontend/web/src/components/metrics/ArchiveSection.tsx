"use client";

import { useState } from "react";
import type { ArchiveCompletion, ArchiveDetail } from "@/types/domain";
import { Card } from "@/components/ui/Card";

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
    <section className="mb-10">
      <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">Archivo</h2>

      <Card>
        <div className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
          Última descarga: <span className="font-medium text-zinc-700 dark:text-zinc-300">{formatDate(summary.downloadedAt)}</span>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div className="text-center">
            <span className="block text-2xl font-bold tabular-nums text-zinc-900 dark:text-zinc-100">{summary.totalYears}</span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">años publicados</span>
          </div>
          <div className="text-center">
            <span className="block text-2xl font-bold tabular-nums text-emerald-600 dark:text-emerald-400">{summary.downloadedYears}</span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">años descargados</span>
          </div>
          <div className="text-center">
            <span className="block text-2xl font-bold tabular-nums text-blue-600 dark:text-blue-400">{summary.extractedYears}</span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">años extraídos</span>
          </div>
        </div>

        <button
          onClick={() => setShowDetail(!showDetail)}
          className="mt-4 text-sm font-medium text-blue-600 hover:underline dark:text-blue-400"
        >
          {showDetail ? "▾ Ocultar detalle" : "▸ Ver detalle por año"}
        </button>

        {showDetail && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
                  <th className="pb-2 pr-4 font-medium">Año</th>
                  <th className="pb-2 pr-4 font-medium">Descargado</th>
                  <th className="pb-2 font-medium">Extraído</th>
                </tr>
              </thead>
              <tbody>
                {details.map((d) => (
                  <tr key={d.year} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="py-1.5 pr-4 tabular-nums font-medium text-zinc-900 dark:text-zinc-100">{d.year}</td>
                    <td className="py-1.5 pr-4">
                      {d.downloadedAt
                        ? <span className="text-emerald-600 dark:text-emerald-400">{formatDate(d.downloadedAt)}</span>
                        : <span className="text-zinc-400">—</span>}
                    </td>
                    <td className="py-1.5">
                      {d.extractedAt
                        ? <span className="text-blue-600 dark:text-blue-400">{formatDate(d.extractedAt)}</span>
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
