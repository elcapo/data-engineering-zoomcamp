// Tipos de dominio web — independientes del esquema del pipeline.
// Si el pipeline cambia su esquema, solo hay que actualizar los repositorios.

export interface Bulletin {
  year: number;
  issue: number;
  title: string;
  date: string;
  url: string;
  summaryPdfUrl: string;
  dispositionCount: number;
  sectionCounts: SectionCount[];
}

export interface SectionCount {
  section: string;
  count: number;
}

export interface Disposition {
  year: number;
  issue: number;
  number: string;
  section: string;
  subsection?: string;
  organization: string;
  title: string;
  date: string;
  identifier?: string;
  pdfUrl: string;
  htmlUrl?: string;
  body?: string;
  excerpt?: string; // fragmento con coincidencias resaltadas (búsquedas)
}

export interface SearchFilters {
  q?: string;
  section?: string[];
  excludeSection?: string[];
  org?: string[];
  excludeOrg?: string[];
  dateRanges?: DateRangeFilter[];
  excludeDateRanges?: DateRangeFilter[];
}

export interface DateRangeFilter {
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
}

// ── Filtros activos (UI) ─────────────────────────────────────────────────

export type FilterType = "term" | "section" | "org" | "dateRange";
export type FilterMode = "include" | "exclude";

export interface ActiveFilter {
  id: string;
  type: FilterType;
  mode: FilterMode;
  value: string;     // texto para term/section/org, "" para dateRange
  from?: string;     // solo dateRange, YYYY-MM-DD
  to?: string;       // solo dateRange, YYYY-MM-DD
}

export interface SearchCursor {
  year: number;
  issue: number;
  number: string;
}

export interface FacetBucket {
  label: string;
  count: number;
}

export interface SearchFacets {
  byYear: FacetBucket[];
  bySection: FacetBucket[];
  byOrg: FacetBucket[];
}

export interface SearchResult {
  results: Disposition[];
  total: number;
  nextCursor: string | null;
  prevCursor: string | null;
  facets: SearchFacets;
}

// ── Métricas ──────────────────────────────────────────────────────────────

export interface YearBreakdown {
  year: number;
  total: number;
  done: number;
  percentage: number;
}

export interface IssueBreakdown {
  year: number;
  issue: number;
  total: number;
  done: number;
  percentage: number;
}

export interface DataQualityReport {
  downloads: {
    years: { total: number; downloaded: number; percentage: number };
    issues: YearBreakdown[];
    documents: IssueBreakdown[];
  };
  extractions: {
    years: { total: number; extracted: number; percentage: number };
    issues: YearBreakdown[];
    documents: IssueBreakdown[];
  };
}

// ── Métricas por entidad ──────────────────────────────────────────────────

export interface ArchiveCompletion {
  totalYears: number;
  downloadedYears: number;
  extractedYears: number;
  downloadedPercentage: number;
  extractedPercentage: number;
  downloadedAt: string | null;
}

export interface ArchiveDetail {
  year: number;
  absoluteLink: string | null;
  objectKey: string | null;
  downloadedAt: string | null;
  extractedAt: string | null;
}

export interface YearCompletion {
  year: number;
  totalIssues: number;
  downloadedIssues: number;
  downloadPercentage: number;
  extractedIssues: number;
  extractedPercentage: number;
  downloadedAt: string | null;
}

export interface YearDetail {
  year: number;
  issue: number;
  url: string | null;
  objectKey: string | null;
  downloadedAt: string | null;
  extractedAt: string | null;
}

export interface IssueCompletion {
  year: number;
  issue: number;
  totalDocuments: number;
  downloadedDocuments: number;
  downloadPercentage: number;
  extractedDocuments: number;
  extractedPercentage: number;
  downloadedAt: string | null;
}

export interface IssueDetail {
  year: number;
  issue: number;
  disposition: number;
  objectKey: string | null;
  downloadedAt: string | null;
  extractedAt: string | null;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
