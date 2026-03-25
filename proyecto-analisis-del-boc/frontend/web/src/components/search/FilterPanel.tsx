"use client";

import { SearchFilters } from "@/types/domain";
import type { BooleanTerm } from "@/lib/search/query-builder";
import { BooleanTermInput } from "./BooleanTermInput";
import { DateRangePicker } from "./DateRangePicker";
import { Button } from "@/components/ui/Button";

interface FilterPanelProps {
  filters: SearchFilters;
  terms: BooleanTerm[];
  onFiltersChange: (filters: SearchFilters) => void;
  onTermsChange: (terms: BooleanTerm[]) => void;
  onSubmit: () => void;
}

export function FilterPanel({ filters, terms, onFiltersChange, onTermsChange, onSubmit }: FilterPanelProps) {
  function update(patch: Partial<SearchFilters>) {
    onFiltersChange({ ...filters, ...patch });
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div>
        <label className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Términos de búsqueda
        </label>
        <BooleanTermInput terms={terms} onChange={onTermsChange} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="filter-section" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Sección
          </label>
          <input
            id="filter-section"
            type="text"
            value={filters.section?.join(", ") ?? ""}
            onChange={(e) => {
              const vals = e.target.value.split(",").map((s) => s.trim()).filter(Boolean);
              update({ section: vals.length > 0 ? vals : undefined });
            }}
            placeholder="Ej: I, II, III"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div>
          <label htmlFor="filter-org" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Organismo
          </label>
          <input
            id="filter-org"
            type="text"
            value={filters.org ?? ""}
            onChange={(e) => update({ org: e.target.value || undefined })}
            placeholder="Ej: Consejería de Educación"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm placeholder:text-zinc-400 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
      </div>

      <DateRangePicker
        from={filters.from}
        to={filters.to}
        onChange={(from, to) => update({ from, to })}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="filter-year" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Año
          </label>
          <input
            id="filter-year"
            type="number"
            min={1980}
            value={filters.year ?? ""}
            onChange={(e) => update({ year: e.target.value ? parseInt(e.target.value, 10) : undefined })}
            placeholder="Ej: 2024"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>

        <div>
          <label htmlFor="filter-issue" className="mb-1 block text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Boletín
          </label>
          <input
            id="filter-issue"
            type="number"
            min={1}
            value={filters.issue ?? ""}
            onChange={(e) => update({ issue: e.target.value ? parseInt(e.target.value, 10) : undefined })}
            placeholder="Ej: 45"
            className="w-full rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
          />
        </div>
      </div>

      <Button onClick={onSubmit} className="self-start">
        Aplicar filtros
      </Button>
    </div>
  );
}
