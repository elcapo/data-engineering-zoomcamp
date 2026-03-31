"use client";

import Link from "next/link";
import type { YearOverview } from "@/types/domain";
import { formatNumber } from "@/lib/format";
import { MetricBar } from "@/components/ui/MetricBar";

interface ArchiveSectionProps {
  years: YearOverview[];
}

export function ArchiveSection({ years }: ArchiveSectionProps) {
  return (
    <section className="mb-12">
      <h2 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">Años</h2>

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
