"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchFilters, SearchResult } from "@/types/domain";
import type { BooleanTerm } from "@/lib/search/query-builder";
import { parseSearchParams, buildSearchUrl } from "@/lib/search/url-params";
import { FilterPanel } from "./FilterPanel";
import { ResultsFacets } from "./ResultsChart";
import { SemanticPaginator } from "./SemanticPaginator";
import { DispositionCard } from "@/components/bulletin/DispositionCard";
import { SkeletonCard } from "@/components/ui/Skeleton";

export function SearchPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Convierte ReadonlyURLSearchParams a Record para parseSearchParams
  const paramsRecord = paramsToRecord(searchParams);
  const parsed = parseSearchParams(paramsRecord);

  const [filters, setFilters] = useState<SearchFilters>(parsed.filters);
  const [terms, setTerms] = useState<BooleanTerm[]>(parsed.terms);
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchResults = useCallback(async (params: URLSearchParams) => {
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

  // Ejecuta búsqueda al cargar la página si hay parámetros en la URL
  useEffect(() => {
    if (searchParams.size > 0) {
      fetchResults(searchParams);
      // Sincroniza estado local con los params de la URL
      setFilters(parsed.filters);
      setTerms(parsed.terms);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams.toString()]);

  function submitWith(f: SearchFilters, t: BooleanTerm[]) {
    const url = buildSearchUrl(f, t);
    const qs = url.split("?")[1] ?? "";
    router.push(url);
    fetchResults(new URLSearchParams(qs));
  }

  function handleSubmit() {
    submitWith(filters, terms);
  }

  function handleNavigate(cursor: string | null) {
    const url = buildSearchUrl(filters, terms, cursor);
    const qs = url.split("?")[1] ?? "";
    const apiParams = new URLSearchParams(qs);

    router.push(url);
    fetchResults(apiParams);
  }

  const hasQuery = searchParams.size > 0;

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="mb-1 text-sm text-zinc-500 dark:text-zinc-400">Inicio &gt; Buscar</p>
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Buscar en el BOC</h1>

      <FilterPanel
        filters={filters}
        terms={terms}
        onFiltersChange={setFilters}
        onTermsChange={setTerms}
        onSubmit={handleSubmit}
      />

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
                <p className="mb-4 text-lg font-medium text-zinc-900 dark:text-zinc-100">
                  {result.total.toLocaleString("es-ES")} {result.total === 1 ? "resultado" : "resultados"}
                </p>
                <div className="flex flex-col gap-4">
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

            {result.facets && (
              <div className="mt-8">
                <ResultsFacets
                  facets={result.facets}
                  onYearClick={(year) => {
                    const next = { ...filters, year };
                    setFilters(next);
                    submitWith(next, terms);
                  }}
                  onSectionClick={(section) => {
                    const next = { ...filters, section: [section] };
                    setFilters(next);
                    submitWith(next, terms);
                  }}
                  onOrgClick={(org) => {
                    const next = { ...filters, org };
                    setFilters(next);
                    submitWith(next, terms);
                  }}
                />
              </div>
            )}
          </>
        )}

        {!loading && !error && !result && !hasQuery && (
          <div className="flex flex-col items-center gap-3 py-12">
            <svg className="size-12 text-zinc-300 dark:text-zinc-600" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25" />
            </svg>
            <p className="text-lg font-medium text-zinc-700 dark:text-zinc-300">Busca en el BOC</p>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Usa los filtros de arriba para encontrar disposiciones.</p>
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
