"use client";

import { useState } from "react";
import { IssueBreakdown, YearBreakdown } from "@/types/domain";
import { MetricBar } from "@/components/ui/MetricBar";

interface YearDetailTableProps {
  years: YearBreakdown[];
  documents: IssueBreakdown[];
}

export function YearDetailTable({ years, documents }: YearDetailTableProps) {
  const [expanded, setExpanded] = useState<number | null>(null);

  function toggle(year: number) {
    setExpanded(expanded === year ? null : year);
  }

  const issuesByYear = new Map<number, IssueBreakdown[]>();
  for (const d of documents) {
    const list = issuesByYear.get(d.year) ?? [];
    list.push(d);
    issuesByYear.set(d.year, list);
  }

  return (
    <div className="flex flex-col gap-1">
      {years.map((y) => (
        <div key={y.year}>
          <button
            onClick={() => toggle(y.year)}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-expanded={expanded === y.year}
          >
            <span className="w-12 shrink-0 font-medium tabular-nums text-zinc-900 dark:text-zinc-100">
              {y.year}
            </span>
            <MetricBar percentage={y.percentage} className="flex-1" />
            <span className="w-20 shrink-0 text-right text-xs text-zinc-500 dark:text-zinc-400">
              {y.done}/{y.total}
            </span>
            <span className="shrink-0 text-zinc-400" aria-hidden="true">
              {expanded === y.year ? "▾" : "▸"}
            </span>
          </button>

          {expanded === y.year && (
            <div className="ml-16 mb-2 border-l-2 border-zinc-200 pl-4 dark:border-zinc-700">
              {(issuesByYear.get(y.year) ?? []).map((ib) => (
                <div key={ib.issue} className="flex items-center gap-3 py-1 text-xs">
                  <span className="w-10 shrink-0 tabular-nums text-zinc-600 dark:text-zinc-400">
                    N.&ordm; {ib.issue}
                  </span>
                  <MetricBar percentage={ib.percentage} className="flex-1" />
                  <span className="w-16 shrink-0 text-right text-zinc-500 dark:text-zinc-400">
                    {ib.done}/{ib.total}
                  </span>
                </div>
              ))}
              {!(issuesByYear.get(y.year) ?? []).length && (
                <p className="py-1 text-xs text-zinc-400">Sin detalle por boletín</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
