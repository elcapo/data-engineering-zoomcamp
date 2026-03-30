// Convierte los filtros de la UI a una expresión tsquery válida para PostgreSQL
// con la configuración lingüística española.

import type { ActiveFilter } from "@/types/domain";

export interface BooleanTerm {
  value: string;
  mode: "include" | "exclude";
  group?: number; // términos del mismo grupo se unen con OR
}

/**
 * Extrae BooleanTerms de un array de ActiveFilter (solo los de tipo "term").
 * Todos los includes comparten grupo 0 (OR entre ellos).
 */
export function activeFiltersToTerms(filters: ActiveFilter[]): BooleanTerm[] {
  return filters
    .filter((f) => f.type === "term" && f.value.trim())
    .map((f) => ({
      value: f.value,
      mode: f.mode,
      group: f.mode === "include" ? 0 : undefined,
    }));
}

/**
 * Construye una expresión tsquery a partir de una lista de términos booleanos.
 *
 * Ejemplo:
 *   include "convocatoria" (grupo 0) + include "beca" (grupo 0) + exclude "universidad"
 *   → (convocatoria:* | beca:*) & !universidad:*
 *
 *   include "Fernández Trujillo" →  (fernández:* & trujillo:*)
 */
export function buildTsquery(terms: BooleanTerm[]): string | null {
  if (terms.length === 0) return null;

  const includes = terms.filter((t) => t.mode === "include");
  const excludes = terms.filter((t) => t.mode === "exclude");

  if (includes.length === 0 && excludes.length === 0) return null;

  // Agrupa los includes por su grupo (OR dentro del grupo, AND entre grupos)
  const groups = new Map<number, string[]>();
  for (const term of includes) {
    const g = term.group ?? 0;
    const existing = groups.get(g) ?? [];
    const sanitized = sanitizeTerm(term.value);
    if (sanitized) existing.push(sanitized);
    groups.set(g, existing);
  }

  const includeParts = Array.from(groups.values())
    .map((terms) => terms.filter(Boolean))
    .filter((terms) => terms.length > 0)
    .map((terms) =>
      terms.length === 1 ? terms[0] : `(${terms.join(" | ")})`
    );

  const excludeParts = excludes
    .map((t) => sanitizeTerm(t.value))
    .filter(Boolean)
    .map((s) => `!${s}`);

  const allParts = [...includeParts, ...excludeParts];
  if (allParts.length === 0) return null;
  return allParts.join(" & ");
}

/**
 * Convierte una cadena de texto libre (q=...) a tsquery.
 * Interpreta AND implícito entre palabras.
 */
export function buildTsqueryFromString(q: string): string | null {
  const words = q
    .trim()
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);

  if (words.length === 0) return null;

  const parts = words.map(sanitizeWord).filter(Boolean);
  if (parts.length === 0) return null;

  return parts.join(" & ");
}

/**
 * Sanitiza un término que puede contener espacios (ej. "Fernández Trujillo").
 * Lo divide en palabras y las une con AND, envolviendo en paréntesis si es multi-palabra.
 */
function sanitizeTerm(term: string): string {
  const words = term
    .split(/\s+/)
    .map(sanitizeWord)
    .filter(Boolean);

  if (words.length === 0) return "";
  if (words.length === 1) return words[0];
  return `(${words.join(" & ")})`;
}

/**
 * Limpia una palabra individual: elimina caracteres especiales y aplica prefijo.
 */
function sanitizeWord(word: string): string {
  const clean = word.replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9\-]/g, "").toLowerCase();
  if (!clean) return "";
  return `${clean}:*`;
}
