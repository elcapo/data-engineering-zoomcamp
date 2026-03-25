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
  subsection?: string[];
  org?: string;
  from?: string; // YYYY-MM-DD
  to?: string;   // YYYY-MM-DD
  year?: number;
  issue?: number;
}

export interface SearchCursor {
  year: number;
  issue: number;
  number: string;
}

export interface SearchResult {
  results: Disposition[];
  total: number;
  nextCursor: string | null;
  prevCursor: string | null;
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
