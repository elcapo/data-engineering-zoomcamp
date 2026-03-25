import { SearchFilters } from "@/types/domain";
import type { BooleanTerm } from "@/lib/search/query-builder";
import { buildTsquery } from "@/lib/search/query-builder";

/**
 * Extrae SearchFilters y BooleanTerm[] de los searchParams de la URL.
 */
export function parseSearchParams(params: Record<string, string | string[] | undefined>): {
  filters: SearchFilters;
  terms: BooleanTerm[];
  cursor?: string;
  limit: number;
} {
  const filters: SearchFilters = {};

  // filters.q nunca se almacena — el texto de búsqueda se gestiona
  // exclusivamente a través de BooleanTerms (chips).

  const section = asArray(params.section);
  if (section.length > 0) filters.section = section;

  const subsection = asArray(params.subsection);
  if (subsection.length > 0) filters.subsection = subsection;

  const org = asString(params.org);
  if (org) filters.org = org;

  const from = asString(params.from);
  if (from) filters.from = from;

  const to = asString(params.to);
  if (to) filters.to = to;

  const year = asInt(params.year);
  if (year) filters.year = year;

  const issue = asInt(params.issue);
  if (issue) filters.issue = issue;

  // Reconstruye BooleanTerms desde los parámetros include/exclude de la URL.
  // Si la URL solo tiene q (ej. desde SearchBar) sin include/exclude,
  // lo convertimos a chips include para que sea visible y editable.
  const terms: BooleanTerm[] = [];
  const includes = asArray(params.include);
  const excludes = asArray(params.exclude);

  if (includes.length > 0 || excludes.length > 0) {
    for (const val of includes) {
      terms.push({ value: val, mode: "include", group: 0 });
    }
    for (const val of excludes) {
      terms.push({ value: val, mode: "exclude" });
    }
  } else {
    // Sin include/exclude: convierte q a chips (ej. "beca convocatoria" → 2 chips include)
    const q = asString(params.q);
    if (q) {
      for (const word of q.split(/\s+/).filter(Boolean)) {
        terms.push({ value: word, mode: "include", group: 0 });
      }
    }
  }

  return {
    filters,
    terms,
    cursor: asString(params.cursor),
    limit: Math.min(Math.max(asInt(params.limit) ?? 20, 1), 100),
  };
}

/**
 * Construye query string para la URL de búsqueda a partir de filtros y términos.
 */
export function buildSearchUrl(filters: SearchFilters, terms: BooleanTerm[], cursor?: string | null): string {
  const params = new URLSearchParams();

  // q viene exclusivamente de los BooleanTerms.
  // include/exclude se guardan en la URL para reconstruir los chips.
  const tsquery = buildTsquery(terms);
  if (tsquery) {
    params.set("q", tsquery);
  }
  for (const t of terms) {
    if (t.mode === "include") params.append("include", t.value);
    else params.append("exclude", t.value);
  }

  if (filters.section) {
    for (const s of filters.section) params.append("section", s);
  }
  if (filters.subsection) {
    for (const s of filters.subsection) params.append("subsection", s);
  }
  if (filters.org) params.set("org", filters.org);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (filters.year) params.set("year", String(filters.year));
  if (filters.issue) params.set("issue", String(filters.issue));
  if (cursor) params.set("cursor", cursor);

  const qs = params.toString();
  return `/buscar${qs ? `?${qs}` : ""}`;
}

// ── helpers ───────────────────────────────────────────────────────────────

function asString(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v || undefined;
}

function asArray(v: string | string[] | undefined): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  return [v];
}

function asInt(v: string | string[] | undefined): number | undefined {
  const s = asString(v);
  if (!s) return undefined;
  const n = parseInt(s, 10);
  return Number.isNaN(n) ? undefined : n;
}
