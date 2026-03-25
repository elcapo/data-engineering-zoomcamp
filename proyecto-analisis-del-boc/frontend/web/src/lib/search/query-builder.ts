// Convierte los filtros de la UI a una expresión tsquery válida para PostgreSQL
// con la configuración lingüística española.

export interface BooleanTerm {
  value: string;
  mode: "include" | "exclude";
  group?: number; // términos del mismo grupo se unen con OR
}

/**
 * Construye una expresión tsquery a partir de una lista de términos booleanos.
 *
 * Ejemplo:
 *   include "convocatoria" (grupo 0) + include "beca" (grupo 0) + exclude "universidad"
 *   → (convocatoria | beca) & !universidad
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
    existing.push(sanitizeTerm(term.value));
    groups.set(g, existing);
  }

  const includeParts = Array.from(groups.values()).map((terms) =>
    terms.length === 1 ? terms[0] : `(${terms.join(" | ")})`
  );

  const excludeParts = excludes.map((t) => `!${sanitizeTerm(t.value)}`);

  const allParts = [...includeParts, ...excludeParts];
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

  return words.map(sanitizeTerm).join(" & ");
}

// Elimina caracteres que romperían tsquery y aplica prefijo de concordancia parcial
function sanitizeTerm(term: string): string {
  const clean = term.replace(/[^a-zA-ZáéíóúüñÁÉÍÓÚÜÑ0-9\-]/g, "").toLowerCase();
  return `${clean}:*`; // prefijo → busca también derivaciones
}
