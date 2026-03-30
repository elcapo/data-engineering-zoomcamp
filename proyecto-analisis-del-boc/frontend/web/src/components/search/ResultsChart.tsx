"use client";

import { useState } from "react";
import { SearchFacets } from "@/types/domain";
import { BarChart } from "@/components/metrics/BarChart";
import { formatNumber } from "@/lib/format";

const DEFAULT_CARD_LIMIT = 5;

interface ResultsFacetsProps {
  facets: SearchFacets;
  onYearClick: (year: number) => void;
  onSectionClick: (section: string) => void;
  onOrgClick: (org: string) => void;
}

/**
 * Gráfica de años (ancho completo) + tarjetas de secciones y organismos.
 * Los datos vienen de facets (búsqueda completa, no solo la página actual).
 * Un click aplica el filtro correspondiente y relanza la búsqueda.
 */
export function ResultsFacets({ facets, onYearClick, onSectionClick, onOrgClick }: ResultsFacetsProps) {
  const hasYear = facets.byYear.length > 1;
  const hasSection = facets.bySection.length > 0;
  const hasOrg = facets.byOrg.length > 0;

  if (!hasYear && !hasSection && !hasOrg) return null;

  // Años ordenados de más reciente a más antiguo (izquierda → derecha)
  const yearData = [...facets.byYear]
    .sort((a, b) => parseInt(b.label, 10) - parseInt(a.label, 10))
    .map((b) => ({ label: b.label, value: b.count }));

  return (
    <div className="flex flex-col gap-6">
      {hasYear && (
        <div>
          <h3 className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">
            Resultados por año
          </h3>
          <BarChart
            data={yearData}
            layout="horizontal"
            height={220}
            onBarClick={(label) => onYearClick(parseInt(label, 10))}
          />
        </div>
      )}

      {(hasSection || hasOrg) && (
        <div className="grid gap-6 sm:grid-cols-2">
          {hasSection && (
            <FacetCardList
              title="Secciones"
              items={facets.bySection}
              limit={DEFAULT_CARD_LIMIT}
              onClick={onSectionClick}
            />
          )}
          {hasOrg && (
            <FacetCardList
              title="Organismos"
              items={facets.byOrg}
              limit={DEFAULT_CARD_LIMIT}
              onClick={onOrgClick}
            />
          )}
        </div>
      )}
    </div>
  );
}

// ── Tarjetas de facets ──────────────────────────────────────────────────

function FacetCardList({ title, items, limit, onClick }: {
  title: string;
  items: { label: string; count: number }[];
  limit: number;
  onClick: (label: string) => void;
}) {
  const [visibleCount, setVisibleCount] = useState(limit);
  const visible = items.slice(0, visibleCount);
  const hasMore = visibleCount < items.length;

  return (
    <div>
      <h3 className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">{title}</h3>
      <div className="flex flex-col gap-2">
        {visible.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => onClick(item.label)}
            className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-left transition-colors hover:border-blue-300 hover:bg-blue-50 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-blue-700 dark:hover:bg-blue-950"
          >
            <span className="text-sm text-zinc-800 dark:text-zinc-200">{item.label}</span>
            <span className="ml-3 shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
              {formatNumber(item.count)}
            </span>
          </button>
        ))}
        {hasMore && (
          <button
            type="button"
            onClick={() => setVisibleCount((c) => c + limit)}
            className="mt-1 text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
          >
            Mostrar más
          </button>
        )}
      </div>
    </div>
  );
}

// Re-export con nombre anterior para compatibilidad del import en SearchPage
export { ResultsFacets as ResultsChart };
