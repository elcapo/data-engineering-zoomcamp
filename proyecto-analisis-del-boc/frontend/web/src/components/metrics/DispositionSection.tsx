"use client";

import Link from "next/link";
import type { ProcessedDisposition } from "@/types/domain";

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" });
}

interface DispositionSectionProps {
  recent: ProcessedDisposition[];
  oldest: ProcessedDisposition[];
}

export function DispositionSection({ recent, oldest }: DispositionSectionProps) {
  return (
    <section className="mb-12">
      <h2 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">Disposiciones</h2>

      <div className="grid gap-6 lg:grid-cols-2">
        <DispositionTable
          title="Últimas procesadas"
          dispositions={recent}
        />
        <DispositionTable
          title="Primeras procesadas"
          dispositions={oldest}
        />
      </div>
    </section>
  );
}

function DispositionTable({ title, dispositions }: { title: string; dispositions: ProcessedDisposition[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-800">
      <h3 className="border-b border-zinc-200 bg-zinc-50/50 px-4 py-2.5 text-sm font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800/30 dark:text-zinc-300">
        {title}
      </h3>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-zinc-200 text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              <th className="px-4 py-2 font-medium">Disposición</th>
              <th className="px-4 py-2 font-medium">Boletín</th>
              <th className="px-4 py-2 font-medium">Procesada</th>
            </tr>
          </thead>
          <tbody>
            {dispositions.map((d) => (
              <tr key={`${d.year}-${d.issue}-${d.disposition}`} className="border-b border-zinc-100 transition-colors duration-100 last:border-b-0 dark:border-zinc-800">
                <td className="px-4 py-2.5">
                  <Link
                    href={`/disposicion/${d.year}/${d.issue}/${d.disposition}`}
                    className="text-accent transition-colors hover:text-accent-light dark:text-accent-light dark:hover:text-accent"
                  >
                    <span className="font-mono tabular-nums">{d.year}/{String(d.issue).padStart(3, "0")}/{d.disposition}</span>
                  </Link>
                </td>
                <td className="px-4 py-2.5">
                  <Link
                    href={`/boletin/${d.year}/${d.issue}`}
                    className="font-mono tabular-nums text-zinc-600 transition-colors hover:text-accent dark:text-zinc-400 dark:hover:text-accent-light"
                  >
                    {d.year}/{String(d.issue).padStart(3, "0")}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-zinc-500 dark:text-zinc-400">
                  {formatDate(d.processedAt)}
                </td>
              </tr>
            ))}
            {dispositions.length === 0 && (
              <tr><td colSpan={3} className="px-4 py-3 text-zinc-400">Sin datos</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
