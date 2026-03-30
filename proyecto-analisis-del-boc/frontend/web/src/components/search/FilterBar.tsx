"use client";

import { useEffect, useRef, useState } from "react";
import type { ActiveFilter, FilterType, FilterMode } from "@/types/domain";
import { DateRangePicker } from "./DateRangePicker";

// ── Constantes ───────────────────────────────────────────────────────────

const FILTER_OPTIONS: { type: FilterType; label: string }[] = [
  { type: "term", label: "Término" },
  { type: "section", label: "Sección" },
  { type: "org", label: "Organismo" },
  { type: "dateRange", label: "Rango de fechas" },
];

const TYPE_LABELS: Record<FilterType, string> = {
  term: "Término",
  section: "Sección",
  org: "Organismo",
  dateRange: "Fechas",
};

const MODE_COLORS: Record<FilterMode, string> = {
  include: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200",
  exclude: "bg-red-100 text-red-800 dark:bg-red-900/60 dark:text-red-200",
};

const MODE_BORDER: Record<FilterMode, string> = {
  include: "border-emerald-200 dark:border-emerald-800",
  exclude: "border-red-200 dark:border-red-800",
};

// ── Props ────────────────────────────────────────────────────────────────

interface FilterBarProps {
  filters: ActiveFilter[];
  onChange: (filters: ActiveFilter[]) => void;
}

// ── Componente principal ─────────────────────────────────────────────────

export function FilterBar({ filters, onChange }: FilterBarProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

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
    setEditingId(newFilter.id);
    setMenuOpen(false);
  }

  function updateFilter(id: string, patch: Partial<ActiveFilter>) {
    onChange(filters.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  }

  function removeFilter(id: string) {
    onChange(filters.filter((f) => f.id !== id));
    if (editingId === id) setEditingId(null);
  }

  function commitFilter(id: string) {
    const filter = filters.find((f) => f.id === id);
    if (!filter) return;
    // Si el filtro está vacío (no dateRange), eliminarlo
    if (filter.type !== "dateRange" && !filter.value.trim()) {
      removeFilter(id);
    } else {
      setEditingId(null);
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
          <svg className="size-4" viewBox="0 0 20 20" fill="currentColor">
            <path d="M10.75 4.75a.75.75 0 00-1.5 0v4.5h-4.5a.75.75 0 000 1.5h4.5v4.5a.75.75 0 001.5 0v-4.5h4.5a.75.75 0 000-1.5h-4.5v-4.5z" />
          </svg>
          Añadir filtro
        </button>

        {menuOpen && (
          <div className="absolute left-0 top-full z-50 mt-1 w-52 rounded-lg border border-zinc-200 bg-white py-1 shadow-lg dark:border-zinc-700 dark:bg-zinc-900">
            {FILTER_OPTIONS.map((opt) => (
              <div key={opt.type} className="flex">
                <button
                  type="button"
                  onClick={() => addFilter(opt.type, "include")}
                  className="flex-1 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
                >
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
          editing={editingId === filter.id}
          onEdit={() => setEditingId(filter.id)}
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
  editing: boolean;
  onEdit: () => void;
  onCommit: () => void;
  onUpdate: (patch: Partial<ActiveFilter>) => void;
  onRemove: () => void;
  onToggleMode: () => void;
}

function FilterChip({ filter, editing, onEdit, onCommit, onUpdate, onRemove, onToggleMode }: FilterChipProps) {
  const chipRef = useRef<HTMLDivElement>(null);

  // Cierra edición al hacer clic fuera del chip
  useEffect(() => {
    if (!editing) return;
    function handleClick(e: MouseEvent) {
      if (chipRef.current && !chipRef.current.contains(e.target as Node)) {
        onCommit();
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [editing, onCommit]);

  return (
    <div
      ref={chipRef}
      className={`inline-flex items-center gap-1 rounded-lg border px-1.5 py-1 text-sm ${MODE_BORDER[filter.mode]} ${MODE_COLORS[filter.mode]}`}
    >
      {/* Toggle incluir/excluir */}
      <button
        type="button"
        onClick={onToggleMode}
        title={filter.mode === "include" ? "Cambiar a Excluir" : "Cambiar a Incluir"}
        className="rounded px-1 py-0.5 text-xs font-semibold opacity-80 transition-opacity hover:opacity-100"
      >
        {filter.mode === "include" ? "+" : "\u2212"}
      </button>

      {/* Etiqueta del tipo */}
      <span className="text-xs font-medium opacity-70">{TYPE_LABELS[filter.type]}:</span>

      {/* Valor (editable o solo lectura) */}
      {editing ? (
        <FilterEditor filter={filter} onUpdate={onUpdate} onCommit={onCommit} />
      ) : (
        <button
          type="button"
          onClick={onEdit}
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
  onUpdate,
  onCommit,
}: {
  filter: ActiveFilter;
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

  const placeholder = {
    term: "Ej: convocatoria",
    section: "Ej: I",
    org: "Ej: Consejería de Educación",
    dateRange: "",
  }[filter.type];

  return (
    <input
      type="text"
      autoFocus
      value={filter.value}
      onChange={(e) => onUpdate({ value: e.target.value })}
      onKeyDown={(e) => {
        if (e.key === "Enter") onCommit();
        if (e.key === "Escape") onCommit();
      }}
      placeholder={placeholder}
      className="w-36 rounded border-0 bg-transparent px-1 py-0 text-sm font-medium placeholder:text-current placeholder:opacity-40 focus:outline-none focus:ring-0"
    />
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
  return filter.value;
}

function formatDisplayDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}
