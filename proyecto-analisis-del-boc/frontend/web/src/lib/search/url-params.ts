import type { ActiveFilter, SearchFilters, DateRangeFilter, RefFilter } from "@/types/domain";
import { buildTsquery, activeFiltersToTerms } from "@/lib/search/query-builder";

/**
 * Reconstruye ActiveFilter[] y cursor/limit desde los searchParams de la URL.
 */
export function parseSearchParams(params: Record<string, string | string[] | undefined>): {
  filters: ActiveFilter[];
  cursor?: string;
  limit: number;
} {
  const filters: ActiveFilter[] = [];
  let nextId = 1;
  const id = () => String(nextId++);

  // Términos: include_term / exclude_term (o legacy q sin include/exclude)
  const includeTerms = asArray(params.include_term);
  const excludeTerms = asArray(params.exclude_term);

  // Legacy: si no hay include_term/exclude_term pero sí include/exclude (formato antiguo)
  const legacyIncludes = asArray(params.include);
  const legacyExcludes = asArray(params.exclude);

  const termIncludes = includeTerms.length > 0 ? includeTerms : legacyIncludes;
  const termExcludes = excludeTerms.length > 0 ? excludeTerms : legacyExcludes;

  if (termIncludes.length > 0 || termExcludes.length > 0) {
    for (const val of termIncludes) {
      filters.push({ id: id(), type: "term", mode: "include", value: val });
    }
    for (const val of termExcludes) {
      filters.push({ id: id(), type: "term", mode: "exclude", value: val });
    }
  } else {
    // Sin include/exclude: convierte q a chips (ej. "beca convocatoria" → 2 chips)
    const q = asString(params.q);
    if (q) {
      for (const word of q.split(/\s+/).filter(Boolean)) {
        filters.push({ id: id(), type: "term", mode: "include", value: word });
      }
    }
  }

  // Secciones
  for (const val of asArray(params.include_section)) {
    filters.push({ id: id(), type: "section", mode: "include", value: val });
  }
  for (const val of asArray(params.exclude_section)) {
    filters.push({ id: id(), type: "section", mode: "exclude", value: val });
  }
  // Legacy: section sin prefijo → include
  if (!params.include_section && !params.exclude_section) {
    for (const val of asArray(params.section)) {
      filters.push({ id: id(), type: "section", mode: "include", value: val });
    }
  }

  // Organismos
  for (const val of asArray(params.include_org)) {
    filters.push({ id: id(), type: "org", mode: "include", value: val });
  }
  for (const val of asArray(params.exclude_org)) {
    filters.push({ id: id(), type: "org", mode: "exclude", value: val });
  }
  // Legacy: org sin prefijo → include
  if (!params.include_org && !params.exclude_org) {
    const org = asString(params.org);
    if (org) filters.push({ id: id(), type: "org", mode: "include", value: org });
  }

  // Rangos de fecha (indexados: include_from_0, include_to_0, ...)
  parseDateRangeParams(params, "include", filters, id);
  parseDateRangeParams(params, "exclude", filters, id);
  // Legacy: from/to sin prefijo → include
  if (!hasPrefixedDateParams(params)) {
    const from = asString(params.from);
    const to = asString(params.to);
    if (from || to) {
      filters.push({ id: id(), type: "dateRange", mode: "include", value: "", from, to });
    }
  }

  // Refs (año/boletín/disposición): include_ref_year_0, include_ref_issue_0, include_ref_number_0 ...
  parseRefParams(params, "include", filters, id);
  parseRefParams(params, "exclude", filters, id);

  return {
    filters,
    cursor: asString(params.cursor),
    limit: Math.min(Math.max(asInt(params.limit) ?? 20, 1), 100),
  };
}

/**
 * Serializa ActiveFilter[] a URL para navegación del browser.
 */
export function buildSearchUrl(activeFilters: ActiveFilter[], cursor?: string | null): string {
  const params = new URLSearchParams();

  // Construye tsquery desde los términos
  const terms = activeFiltersToTerms(activeFilters);
  const tsquery = buildTsquery(terms);
  if (tsquery) params.set("q", tsquery);

  // Serializa cada filtro
  let dateIncludeIdx = 0;
  let dateExcludeIdx = 0;
  let refIncludeIdx = 0;
  let refExcludeIdx = 0;

  for (const f of activeFilters) {
    switch (f.type) {
      case "term":
        if (f.value.trim()) {
          params.append(f.mode === "include" ? "include_term" : "exclude_term", f.value);
        }
        break;
      case "section":
        if (f.value.trim()) {
          params.append(f.mode === "include" ? "include_section" : "exclude_section", f.value);
        }
        break;
      case "org":
        if (f.value.trim()) {
          params.append(f.mode === "include" ? "include_org" : "exclude_org", f.value);
        }
        break;
      case "dateRange": {
        const prefix = f.mode === "include" ? "include" : "exclude";
        const idx = f.mode === "include" ? dateIncludeIdx++ : dateExcludeIdx++;
        if (f.from) params.set(`${prefix}_from_${idx}`, f.from);
        if (f.to) params.set(`${prefix}_to_${idx}`, f.to);
        break;
      }
      case "ref": {
        const prefix = f.mode === "include" ? "include" : "exclude";
        const idx = f.mode === "include" ? refIncludeIdx++ : refExcludeIdx++;
        if (f.refYear) params.set(`${prefix}_ref_year_${idx}`, f.refYear);
        if (f.refIssue) params.set(`${prefix}_ref_issue_${idx}`, f.refIssue);
        if (f.refDisposition) params.set(`${prefix}_ref_number_${idx}`, f.refDisposition);
        break;
      }
    }
  }

  if (cursor) params.set("cursor", cursor);

  const qs = params.toString();
  return `/buscar${qs ? `?${qs}` : ""}`;
}

/**
 * Convierte ActiveFilter[] al formato SearchFilters que espera la API/repositorio.
 */
export function activeFiltersToSearchFilters(activeFilters: ActiveFilter[]): SearchFilters {
  const sf: SearchFilters = {};

  // Términos → tsquery
  const terms = activeFiltersToTerms(activeFilters);
  const tsquery = buildTsquery(terms);
  if (tsquery) sf.q = tsquery;

  // Secciones
  const includeSections = activeFilters.filter((f) => f.type === "section" && f.mode === "include" && f.value.trim()).map((f) => f.value);
  const excludeSections = activeFilters.filter((f) => f.type === "section" && f.mode === "exclude" && f.value.trim()).map((f) => f.value);
  if (includeSections.length > 0) sf.section = includeSections;
  if (excludeSections.length > 0) sf.excludeSection = excludeSections;

  // Organismos
  const includeOrgs = activeFilters.filter((f) => f.type === "org" && f.mode === "include" && f.value.trim()).map((f) => f.value);
  const excludeOrgs = activeFilters.filter((f) => f.type === "org" && f.mode === "exclude" && f.value.trim()).map((f) => f.value);
  if (includeOrgs.length > 0) sf.org = includeOrgs;
  if (excludeOrgs.length > 0) sf.excludeOrg = excludeOrgs;

  // Rangos de fecha
  const includeDates: DateRangeFilter[] = activeFilters
    .filter((f) => f.type === "dateRange" && f.mode === "include" && (f.from || f.to))
    .map((f) => ({ from: f.from, to: f.to }));
  const excludeDates: DateRangeFilter[] = activeFilters
    .filter((f) => f.type === "dateRange" && f.mode === "exclude" && (f.from || f.to))
    .map((f) => ({ from: f.from, to: f.to }));
  if (includeDates.length > 0) sf.dateRanges = includeDates;
  if (excludeDates.length > 0) sf.excludeDateRanges = excludeDates;

  // Refs (año/boletín/disposición)
  const toRef = (f: ActiveFilter): RefFilter => {
    const ref: RefFilter = {};
    if (f.refYear) ref.year = parseInt(f.refYear, 10);
    if (f.refIssue) ref.issue = parseInt(f.refIssue, 10);
    if (f.refDisposition) ref.number = parseInt(f.refDisposition, 10);
    return ref;
  };
  const includeRefs = activeFilters
    .filter((f) => f.type === "ref" && f.mode === "include" && (f.refYear || f.refIssue || f.refDisposition))
    .map(toRef);
  const excludeRefs = activeFilters
    .filter((f) => f.type === "ref" && f.mode === "exclude" && (f.refYear || f.refIssue || f.refDisposition))
    .map(toRef);
  if (includeRefs.length > 0) sf.refs = includeRefs;
  if (excludeRefs.length > 0) sf.excludeRefs = excludeRefs;

  return sf;
}

/**
 * Genera la URL de búsqueda por defecto: últimos 7 días.
 */
export function buildSearchHref(): string {
  const today = new Date();
  const weekAgo = new Date(today);
  weekAgo.setDate(today.getDate() - 7);
  const to = today.toISOString().slice(0, 10);
  const from = weekAgo.toISOString().slice(0, 10);
  return `/buscar?include_from_0=${from}&include_to_0=${to}`;
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

function parseDateRangeParams(
  params: Record<string, string | string[] | undefined>,
  mode: "include" | "exclude",
  filters: ActiveFilter[],
  id: () => string,
) {
  for (let i = 0; i < 10; i++) {
    const from = asString(params[`${mode}_from_${i}`]);
    const to = asString(params[`${mode}_to_${i}`]);
    if (!from && !to) break;
    filters.push({ id: id(), type: "dateRange", mode, value: "", from, to });
  }
}

function hasPrefixedDateParams(params: Record<string, string | string[] | undefined>): boolean {
  return !!(params.include_from_0 || params.include_to_0 || params.exclude_from_0 || params.exclude_to_0);
}

function parseRefParams(
  params: Record<string, string | string[] | undefined>,
  mode: "include" | "exclude",
  filters: ActiveFilter[],
  id: () => string,
) {
  for (let i = 0; i < 10; i++) {
    const year = asString(params[`${mode}_ref_year_${i}`]);
    const issue = asString(params[`${mode}_ref_issue_${i}`]);
    const number = asString(params[`${mode}_ref_number_${i}`]);
    if (!year && !issue && !number) break;
    filters.push({
      id: id(),
      type: "ref",
      mode,
      value: "",
      refYear: year,
      refIssue: issue,
      refDisposition: number,
    });
  }
}
