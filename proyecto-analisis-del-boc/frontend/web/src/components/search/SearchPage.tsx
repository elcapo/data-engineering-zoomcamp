"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SearchFilters, SearchResult } from "@/types/domain";
import type { BooleanTerm } from "@/lib/search/query-builder";
import { parseSearchParams, buildSearchUrl } from "@/lib/search/url-params";
import { FilterPanel } from "./FilterPanel";
import { ResultsChart } from "./ResultsChart";
import { SemanticPaginator } from "./SemanticPaginator";
import { DispositionCard } from "@/components/bulletin/DispositionCard";
import { Spinner } from "@/components/ui/Spinner";

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

  function handleSubmit() {
    const url = buildSearchUrl(filters, terms);
    const qs = url.split("?")[1] ?? "";
    const apiParams = new URLSearchParams(qs);

    // Actualiza URL y lanza fetch en paralelo
    router.push(url);
    fetchResults(apiParams);
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
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold text-zinc-900 dark:text-zinc-100">Buscar en el BOC</h1>

      <FilterPanel
        filters={filters}
        terms={terms}
        onFiltersChange={setFilters}
        onTermsChange={setTerms}
        onSubmit={handleSubmit}
      />

      <div className="mt-8">
        {loading && (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        )}

        {error && (
          <p className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-400">
            {error}
          </p>
        )}

        {!loading && !error && result && (
          <>
            <ResultsChart results={result.results} />

            {result.results.length === 0 ? (
              <p className="py-8 text-center text-zinc-500 dark:text-zinc-400">
                No se encontraron resultados. Prueba con otros términos o filtros.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {result.results.map((d) => (
                  <DispositionCard key={`${d.year}-${d.issue}-${d.number}`} disposition={d} />
                ))}
              </div>
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

        {!loading && !error && !result && !hasQuery && (
          <p className="py-8 text-center text-zinc-500 dark:text-zinc-400">
            Usa los filtros de arriba para buscar disposiciones en el BOC.
          </p>
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
