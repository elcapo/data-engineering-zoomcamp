"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { ActiveFilter, SearchResult } from "@/types/domain";
import { parseSearchParams, buildSearchUrl, activeFiltersToSearchFilters } from "@/lib/search/url-params";
import { FilterBar } from "./FilterBar";
import { ResultsFacets } from "./ResultsChart";
import { SemanticPaginator } from "./SemanticPaginator";
import { DispositionCard } from "@/components/bulletin/DispositionCard";
import { formatNumber } from "@/lib/format";
import { SkeletonCard } from "@/components/ui/Skeleton";

export function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const paramsRecord = paramsToRecord(searchParams);
  const parsed = parseSearchParams(paramsRecord);

  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>(parsed.filters);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Para evitar doble-fetch en el mount inicial con params en la URL
  const initialFetchDone = useRef(false);

  const fetchResults = useCallback(async (filters: ActiveFilter[], cursor?: string | null) => {
    const sf = activeFiltersToSearchFilters(filters);
    // No buscar si no hay filtros con valor
    const hasValue = filters.some((f) =>
      f.type === "dateRange" ? (f.from || f.to) : f.value.trim()
    );
    if (!hasValue) {
      setResult(null);
      return;
    }

    const params = new URLSearchParams();
    if (sf.q) params.set("q", sf.q);
    if (sf.section) sf.section.forEach((s) => params.append("include_section", s));
    if (sf.excludeSection) sf.excludeSection.forEach((s) => params.append("exclude_section", s));
    if (sf.org) sf.org.forEach((o) => params.append("include_org", o));
    if (sf.excludeOrg) sf.excludeOrg.forEach((o) => params.append("exclude_org", o));
    if (sf.dateRanges) {
      sf.dateRanges.forEach((dr, i) => {
        if (dr.from) params.set(`include_from_${i}`, dr.from);
        if (dr.to) params.set(`include_to_${i}`, dr.to);
      });
    }
    if (sf.excludeDateRanges) {
      sf.excludeDateRanges.forEach((dr, i) => {
        if (dr.from) params.set(`exclude_from_${i}`, dr.from);
        if (dr.to) params.set(`exclude_to_${i}`, dr.to);
      });
    }
    if (cursor) params.set("cursor", cursor);

    const qs = params.toString();
    const apiUrl = `/api/search${qs ? `?${qs}` : ""}`;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error("Error en la búsqueda");
      const data: SearchResult = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error desconocido");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch inicial si hay params en la URL
  useEffect(() => {
    if (!initialFetchDone.current && searchParams.size > 0) {
      initialFetchDone.current = true;
      fetchResults(parsed.filters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-submit: buscar cuando cambian los filtros (después del mount)
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Actualiza la URL sin re-fetch (lo hacemos manualmente aquí)
    const url = buildSearchUrl(activeFilters);
    router.replace(url, { scroll: false });

    // Debounce para evitar búsquedas excesivas mientras el usuario edita
    const timer = setTimeout(() => {
      fetchResults(activeFilters);
    }, 400);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFilters]);

  function handleNavigate(cursor: string | null) {
    const url = buildSearchUrl(activeFilters, cursor);
    router.push(url);
    fetchResults(activeFilters, cursor);
  }

  function handleFacetClick(patch: Partial<Pick<ActiveFilter, "type" | "value">>) {
    const newFilter: ActiveFilter = {
      id: crypto.randomUUID(),
      type: patch.type!,
      mode: "include",
      value: patch.value ?? "",
    };
    const next = [...activeFilters, newFilter];
    setActiveFilters(next);
  }

  const hasFilters = activeFilters.length > 0;

  return (
    <div className="px-4 py-6 sm:px-6 lg:px-8">
      <FilterBar filters={activeFilters} onChange={setActiveFilters} />

      <div className="mt-8">
        {loading && (
          <div className="flex flex-col gap-4">
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </div>
        )}

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}

        {!loading && !error && result && (
          <>
            {result.results.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-12">
                <svg className="size-12 text-zinc-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                </svg>
                <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">Sin resultados</p>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">Prueba con otros términos o ajusta los filtros.</p>
              </div>
            ) : (
              <>
                {result.facets && (
                  <div className="mb-6">
                    <ResultsFacets
                      facets={result.facets}
                      onYearClick={() => {}}
                      onSectionClick={(section) => handleFacetClick({ type: "section", value: section })}
                      onOrgClick={(org) => handleFacetClick({ type: "org", value: org })}
                    />
                  </div>
                )}

                <p className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
                  {formatNumber(result.total)} {result.total === 1 ? "resultado" : "resultados"}
                </p>
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                  {result.results.map((d) => (
                    <DispositionCard key={`${d.year}-${d.issue}-${d.number}`} disposition={d} />
                  ))}
                </div>
              </>
            )}

            <div className="mt-6">
              <SemanticPaginator
                total={result.total}
                nextCursor={result.nextCursor}
                prevCursor={result.prevCursor}
                onNavigate={handleNavigate}
              />
            </div>
          </>
        )}

        {!loading && !error && !result && !hasFilters && (
          <div className="flex flex-col items-center gap-3 py-12">
            <svg className="size-12 text-zinc-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">Busca en el BOC</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Usa el botón &ldquo;Añadir filtro&rdquo; para encontrar disposiciones.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function paramsToRecord(params: URLSearchParams): Record<string, string | string[]> {
  const record: Record<string, string | string[]> = {};
  for (const key of new Set(params.keys())) {
    const values = params.getAll(key);
    record[key] = values.length === 1 ? values[0] : values;
  }
  return record;
}
