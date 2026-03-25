"use client";

import { KeyboardEvent, useState } from "react";
import type { BooleanTerm } from "@/lib/search/query-builder";

interface BooleanTermInputProps {
  terms: BooleanTerm[];
  onChange: (terms: BooleanTerm[]) => void;
}

export function BooleanTermInput({ terms, onChange }: BooleanTermInputProps) {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<"include" | "exclude">("include");

  function addTerm() {
    const value = input.trim();
    if (!value) return;

    // Determina el grupo: los includes del mismo "lote" comparten grupo (OR entre ellos)
    const lastInclude = [...terms].reverse().find((t) => t.mode === "include");
    const group = mode === "include" ? (lastInclude?.group ?? 0) : undefined;

    onChange([...terms, { value, mode, group }]);
    setInput("");
  }

  function removeTerm(index: number) {
    onChange(terms.filter((_, i) => i !== index));
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault();
      addTerm();
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {terms.length > 0 && (
        <div className="flex flex-wrap gap-1.5" role="list" aria-label="Términos de búsqueda">
          {terms.map((term, i) => (
            <span
              key={i}
              role="listitem"
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${
                term.mode === "include"
                  ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              }`}
            >
              {term.mode === "exclude" && "NO "}
              {term.value}
              <button
                type="button"
                onClick={() => removeTerm(i)}
                aria-label={`Eliminar ${term.value}`}
                className="ml-0.5 hover:opacity-70"
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as "include" | "exclude")}
          aria-label="Modo del término"
          className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        >
          <option value="include">Contiene</option>
          <option value="exclude">No contiene</option>
        </select>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Añadir término..."
          aria-label="Nuevo término de búsqueda"
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm placeholder:text-zinc-400 focus:border-blue-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        />
        <button
          type="button"
          onClick={addTerm}
          className="rounded-md bg-zinc-200 px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-600"
        >
          Añadir
        </button>
      </div>
    </div>
  );
}
