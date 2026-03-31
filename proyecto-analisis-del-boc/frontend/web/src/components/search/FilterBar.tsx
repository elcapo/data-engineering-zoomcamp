"use client";

import { useEffect, useRef, useState } from "react";
import type { ActiveFilter, FilterType, FilterMode } from "@/types/domain";
import { DateRangePicker } from "./DateRangePicker";
import { Autocomplete } from "./Autocomplete";
import { OrgIcon } from "@/components/ui/OrgIcon";

// ── Iconos ───────────────────────────────────────────────────────────────

function SearchIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function TermIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 011.037-.443 48.2 48.2 0 005.887-.47c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
  );
}

function SectionIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
    </svg>
  );
}


function CalendarIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
    </svg>
  );
}

function HashIcon({ className = "size-4" }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 8.25h15m-16.5 7.5h15m-1.8-13.5l-3.9 19.5m-2.1-19.5l-3.9 19.5" />
    </svg>
  );
}

const FILTER_ICONS: Record<FilterType, React.ReactNode> = {
  term: <TermIcon />,
  section: <SectionIcon />,
  org: <OrgIcon />,
  dateRange: <CalendarIcon />,
  ref: <HashIcon />,
};

// ── Constantes ───────────────────────────────────────────────────────────

const FILTER_OPTIONS: { type: FilterType; label: string }[] = [
  { type: "term", label: "Término" },
  { type: "section", label: "Sección" },
  { type: "org", label: "Organismo" },
  { type: "dateRange", label: "Rango de fechas" },
  { type: "ref", label: "Año, boletín y disposición" },
];

const TYPE_LABELS: Record<FilterType, string> = {
  term: "Término",
  section: "Sección",
  org: "Organismo",
  dateRange: "Fechas",
  ref: "Ref.",
};

// ── Props ────────────────────────────────────────────────────────────────

interface FilterBarProps {
  filters: ActiveFilter[];
  onChange: (filters: ActiveFilter[]) => void;
}

// ── Componente principal ─────────────────────────────────────────────────

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [newFilterId, setNewFilterId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [filterOptions, setFilterOptions] = useState<{ sections: string[]; organizations: string[] }>({ sections: [], organizations: [] });

  // Carga secciones y organismos una sola vez
  useEffect(() => {
    fetch("/api/filters")
      .then((r) => r.json())
      .then((data) => setFilterOptions(data))
      .catch(() => {});
  }, []);

  // Cierra menú al hacer clic fuera
  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  function addFilter(type: FilterType, mode: FilterMode = "include") {
    const newFilter: ActiveFilter = {
      id: crypto.randomUUID(),
      type,
      mode,
      value: "",
    };
    onChange([...filters, newFilter]);
    setNewFilterId(newFilter.id);
    setMenuOpen(false);
  }

  function updateFilter(id: string, patch: Partial<ActiveFilter>) {
    onChange(filters.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removeFilter(id: string) {
    onChange(filters.filter((f) => f.id !== id));
  }

  function commitFilter(id: string) {
    const filter = filters.find((f) => f.id === id);
    if (!filter) return;
    if (filter.type === "dateRange") {
      // dateRange siempre se mantiene
    } else if (filter.type === "ref") {
      if (!filter.refYear && !filter.refIssue && !filter.refDisposition) {
        removeFilter(id);
      }
    } else if (!filter.value.trim()) {
      removeFilter(id);
    }
  }

  function toggleMode(id: string) {
    const filter = filters.find((f) => f.id === id);
    if (!filter) return;
    updateFilter(id, { mode: filter.mode === "include" ? "exclude" : "include" });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Botón Añadir filtro */}
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          <SearchIcon />
          Añadir filtro
        </button>

        {menuOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 w-62 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            {FILTER_OPTIONS.map((opt) => (
              <div key={opt.type} className="flex">
                <button
                  type="button"
                  onClick={() => addFilter(opt.type, "include")}
                  className="flex flex-1 items-center gap-2 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
                  {FILTER_ICONS[opt.type]}
                  {opt.label}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Chips de filtros activos */}
      {filters.map((filter) => (
        <FilterChip
          key={filter.id}
          filter={filter}
          initiallyActive={newFilterId === filter.id}
          filterOptions={filterOptions}
          onCommit={() => commitFilter(filter.id)}
          onUpdate={(patch) => updateFilter(filter.id, patch)}
          onRemove={() => removeFilter(filter.id)}
          onToggleMode={() => toggleMode(filter.id)}
        />
      ))}

      {/* Limpiar todos */}
      {filters.length > 0 && (
        <button
          type="button"
          onClick={() => onChange([])}
          className="text-xs text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200"
        >
          Limpiar todo
        </button>
      )}
    </div>
  );
}

// ── Chip individual ──────────────────────────────────────────────────────

interface FilterChipProps {
  filter: ActiveFilter;
  initiallyActive: boolean;
  filterOptions: { sections: string[]; organizations: string[] };
  onCommit: () => void;
  onUpdate: (patch: Partial<ActiveFilter>) => void;
  onRemove: () => void;
  onToggleMode: () => void;
}

function FilterChip({ filter, initiallyActive, filterOptions, onCommit, onUpdate, onRemove, onToggleMode }: FilterChipProps) {
  const chipRef = useRef<HTMLDivElement>(null);
  const blurTimeout = useRef<ReturnType<typeof setTimeout>>(undefined);
  const mounted = useRef(false);
  const [active, setActive] = useState(initiallyActive);

  // Ignora blurs durante el montaje inicial (autoFocus puede tardar un tick)
  useEffect(() => {
    const id = setTimeout(() => { mounted.current = true; }, 50);
    return () => clearTimeout(id);
  }, []);

  function handleFocus() {
    clearTimeout(blurTimeout.current);
    setActive(true);
  }

  function handleBlur() {
    blurTimeout.current = setTimeout(() => {
      if (mounted.current && !chipRef.current?.contains(document.activeElement)) {
        setActive(false);
        onCommit();
      }
    }, 10);
  }

  useEffect(() => () => clearTimeout(blurTimeout.current), []);

  const borderColor = filter.mode === "include"
    ? "border-emerald-300 dark:border-emerald-700"
    : "border-red-300 dark:border-red-700";

  return (
    <div
      ref={chipRef}
      onFocus={handleFocus}
      onBlur={handleBlur}
      className={`inline-flex items-center gap-1 rounded-lg border bg-white px-1.5 py-1 text-sm text-zinc-800 dark:bg-zinc-900 dark:text-zinc-200 ${borderColor}`}
    >
      {/* Selector incluir/excluir (visible cuando el chip está activo) */}
      <div className={`flex items-center gap-0.5 overflow-hidden transition-all duration-150 ${active ? "max-w-40 opacity-100" : "max-w-0 opacity-0"}`}>
        <button
          type="button"
          onClick={() => { if (filter.mode !== "include") onToggleMode(); }}
          className={`rounded px-1.5 py-0.5 text-xs font-semibold transition-colors ${
            filter.mode === "include"
              ? "bg-emerald-500 text-white dark:bg-emerald-600"
              : "text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
          }`}
        >
          Incluir
        </button>
        <button
          type="button"
          onClick={() => { if (filter.mode !== "exclude") onToggleMode(); }}
          className={`rounded px-1.5 py-0.5 text-xs font-semibold transition-colors ${
            filter.mode === "exclude"
              ? "bg-red-500 text-white dark:bg-red-600"
              : "text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30"
          }`}
        >
          Excluir
        </button>
      </div>

      {/* Etiqueta del tipo */}
      <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400">{TYPE_LABELS[filter.type]}:</span>

      {/* Valor: editor cuando activo, solo lectura cuando inactivo */}
      {active ? (
        <FilterEditor filter={filter} filterOptions={filterOptions} onUpdate={onUpdate} onCommit={onCommit} />
      ) : (
        <button
          type="button"
          onClick={() => setActive(true)}
          className="max-w-48 truncate text-sm font-medium"
          title={displayValue(filter)}
        >
          {displayValue(filter) || "(vacío)"}
        </button>
      )}

      {/* Botón eliminar */}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Eliminar filtro ${TYPE_LABELS[filter.type]}`}
        className="ml-0.5 rounded-full p-0.5 opacity-60 transition-opacity hover:opacity-100"
      >
        <svg className="size-3.5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
        </svg>
      </button>
    </div>
  );
}

// ── Editor inline por tipo de filtro ─────────────────────────────────────

function FilterEditor({
  filter,
  filterOptions,
  onUpdate,
  onCommit,
}: {
  filter: ActiveFilter;
  filterOptions: { sections: string[]; organizations: string[] };
  onUpdate: (patch: Partial<ActiveFilter>) => void;
  onCommit: () => void;
}) {
  if (filter.type === "dateRange") {
    return (
      <DateRangePicker
        from={filter.from}
        to={filter.to}
        onChange={(from, to) => onUpdate({ from, to })}
        compact
      />
    );
  }

  if (filter.type === "ref") {
    return (
      <RefEditor
        refYear={filter.refYear}
        refIssue={filter.refIssue}
        refDisposition={filter.refDisposition}
        onChange={(patch) => onUpdate(patch)}
        onCommit={onCommit}
      />
    );
  }

  const placeholder = {
    term: "Ej: convocatoria",
    section: "Ej: I",
    org: "Ej: Consejería de Educación",
    dateRange: "",
    ref: "",
  }[filter.type];

  if (filter.type === "section" || filter.type === "org") {
    const options = filter.type === "section" ? filterOptions.sections : filterOptions.organizations;
    return (
      <Autocomplete
        value={filter.value}
        options={options}
        placeholder={placeholder}
        onChange={(value) => onUpdate({ value })}
        onCommit={onCommit}
        onSelect={(value) => { onUpdate({ value }); }}
      />
    );
  }

  return (
    <input
      type="text"
      autoFocus
      value={filter.value}
      onChange={(e) => onUpdate({ value: e.target.value })}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === "Escape") {
          (e.target as HTMLElement).blur();
        }
      }}
      placeholder={placeholder}
      className="w-36 rounded border-0 bg-transparent px-1 py-0 text-sm font-medium placeholder:text-current placeholder:opacity-40 focus:outline-none focus:ring-0"
    />
  );
}

// ── Editor de referencia (año/boletín/disposición) ──────────────────

function RefEditor({
  refYear,
  refIssue,
  refDisposition,
  onChange,
  onCommit,
}: {
  refYear?: string;
  refIssue?: string;
  refDisposition?: string;
  onChange: (patch: Partial<ActiveFilter>) => void;
  onCommit: () => void;
}) {
  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" || e.key === "Escape") onCommit();
  }
  const inputClass =
    "w-16 rounded border-0 bg-transparent px-1 py-0 text-sm font-medium tabular-nums placeholder:text-current placeholder:opacity-40 focus:outline-none focus:ring-0";

  return (
    <div className="flex items-center gap-1">
      <input
        type="text"
        inputMode="numeric"
        autoFocus
        value={refYear ?? ""}
        onChange={(e) => onChange({ refYear: e.target.value.replace(/\D/g, "") || undefined })}
        onKeyDown={handleKey}
        placeholder="Año"
        className={inputClass}
      />
      <span className="text-xs text-zinc-400">/</span>
      <input
        type="text"
        inputMode="numeric"
        value={refIssue ?? ""}
        onChange={(e) => onChange({ refIssue: e.target.value.replace(/\D/g, "") || undefined })}
        onKeyDown={handleKey}
        placeholder="Bol."
        className={inputClass}
      />
      <span className="text-xs text-zinc-400">/</span>
      <input
        type="text"
        inputMode="numeric"
        value={refDisposition ?? ""}
        onChange={(e) => onChange({ refDisposition: e.target.value.replace(/\D/g, "") || undefined })}
        onKeyDown={handleKey}
        placeholder="Disp."
        className={inputClass}
      />
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────

function displayValue(filter: ActiveFilter): string {
  if (filter.type === "dateRange") {
    const parts: string[] = [];
    if (filter.from) parts.push(formatDisplayDate(filter.from));
    if (filter.to) parts.push(formatDisplayDate(filter.to));
    return parts.join(" \u2013 ");
  }
  if (filter.type === "ref") {
    const parts = [filter.refYear || "*", filter.refIssue || "*", filter.refDisposition || "*"];
    return parts.join("/");
  }
  return filter.value;
}

function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
