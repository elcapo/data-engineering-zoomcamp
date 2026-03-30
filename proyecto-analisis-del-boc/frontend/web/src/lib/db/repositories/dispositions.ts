import { Prisma } from "../../../../app/generated/prisma/client";
import { prisma } from "../prisma";
import { Disposition, SearchFacets, SearchFilters, SearchResult } from "@/types/domain";
import { buildTsqueryFromString } from "@/lib/search/query-builder";

const DEFAULT_LIMIT = 20;

// JOINs comunes: issue__dispositions → issue → document (LEFT)
// Base: disposiciones del índice; document se une opcionalmente.
const FROM_WITH_JOIN = Prisma.sql`
  FROM boc_dataset.issue__dispositions id
  JOIN boc_dataset.issue i ON id._dlt_root_id = i._dlt_id
  LEFT JOIN boc_dataset.document d
    ON d.year = i.year AND d.issue = i.issue
    AND CAST(d.number AS bigint) = id.disposition`;

export const DispositionRepository = {
  /**
   * Búsqueda full-text con filtros combinados y paginación por cursor.
   * Busca tanto en document.body_tsv como en issue__dispositions.summary_tsv.
   */
  async search(
    filters: SearchFilters,
    cursor?: string,
    limit = DEFAULT_LIMIT
  ): Promise<SearchResult> {
    const tsquery = filters.q ? buildTsqueryFromString(filters.q) : null;
    const cursorParsed = cursor ? parseCursor(cursor) : null;

    // Condiciones WHERE dinámicas
    const conditions: Prisma.Sql[] = [];

    if (tsquery) {
      // Busca coincidencias en el texto completo (document) O en el resumen (issue__dispositions)
      conditions.push(
        Prisma.sql`(d.body_tsv @@ to_tsquery('spanish', ${tsquery}) OR id.summary_tsv @@ to_tsquery('spanish', ${tsquery}))`
      );
    }
    // Secciones: include (OR) / exclude (AND NOT)
    if (filters.section?.length) {
      conditions.push(Prisma.sql`COALESCE(d.section, id.section) = ANY(${filters.section})`);
    }
    if (filters.excludeSection?.length) {
      conditions.push(Prisma.sql`COALESCE(d.section, id.section) != ALL(${filters.excludeSection})`);
    }

    // Organismos: include (OR con ILIKE) / exclude (AND NOT ILIKE)
    if (filters.org?.length) {
      const orgConditions = filters.org.map(
        (o) => Prisma.sql`COALESCE(d.organization, id.organization) ILIKE ${"%" + o + "%"}`
      );
      conditions.push(Prisma.sql`(${Prisma.join(orgConditions, " OR ")})`);
    }
    if (filters.excludeOrg?.length) {
      for (const o of filters.excludeOrg) {
        conditions.push(
          Prisma.sql`COALESCE(d.organization, id.organization) NOT ILIKE ${"%" + o + "%"}`
        );
      }
    }

    // Rangos de fecha: include (OR entre rangos) / exclude (AND NOT entre rangos)
    if (filters.dateRanges?.length) {
      const dateConditions = filters.dateRanges.map((dr) => {
        const parts: Prisma.Sql[] = [];
        if (dr.from) parts.push(Prisma.sql`d.date >= ${dr.from}`);
        if (dr.to) parts.push(Prisma.sql`d.date <= ${dr.to}`);
        return parts.length > 1
          ? Prisma.sql`(${Prisma.join(parts, " AND ")})`
          : parts[0];
      }).filter(Boolean);
      if (dateConditions.length === 1) {
        conditions.push(dateConditions[0]);
      } else if (dateConditions.length > 1) {
        conditions.push(Prisma.sql`(${Prisma.join(dateConditions, " OR ")})`);
      }
    }
    if (filters.excludeDateRanges?.length) {
      for (const dr of filters.excludeDateRanges) {
        const parts: Prisma.Sql[] = [];
        if (dr.from) parts.push(Prisma.sql`d.date >= ${dr.from}`);
        if (dr.to) parts.push(Prisma.sql`d.date <= ${dr.to}`);
        if (parts.length > 0) {
          conditions.push(
            Prisma.sql`NOT (${Prisma.join(parts, " AND ")})`
          );
        }
      }
    }
    if (cursorParsed) {
      // El ORDER BY es todo DESC, así que "siguiente página" = tupla menor
      conditions.push(
        Prisma.sql`(i.year, i.issue, id.disposition) < (${cursorParsed.year}, ${cursorParsed.issue}, ${parseInt(cursorParsed.number, 10)})`
      );
    }

    const where =
      conditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
        : Prisma.empty;

    // Excerpt: prioriza coincidencia en body, luego en summary
    const headlineExpr = tsquery
      ? Prisma.sql`CASE
          WHEN d.body_tsv @@ to_tsquery('spanish', ${tsquery})
          THEN ts_headline('spanish', COALESCE(d.body, ''), to_tsquery('spanish', ${tsquery}), 'MaxWords=60, MinWords=20, StartSel=<mark>, StopSel=</mark>')
          WHEN id.summary_tsv @@ to_tsquery('spanish', ${tsquery})
          THEN ts_headline('spanish', COALESCE(id.summary, ''), to_tsquery('spanish', ${tsquery}), 'MaxWords=60, MinWords=20, StartSel=<mark>, StopSel=</mark>')
          ELSE NULL
        END`
      : Prisma.sql`NULL`;

    if (process.env.NODE_ENV === "development") {
      const debugParts: string[] = [];
      if (tsquery) debugParts.push(`tsq='${tsquery}'`);
      if (filters.section?.length) debugParts.push(`section IN ${JSON.stringify(filters.section)}`);
      if (filters.excludeSection?.length) debugParts.push(`section NOT IN ${JSON.stringify(filters.excludeSection)}`);
      if (filters.org?.length) debugParts.push(`org ILIKE ${JSON.stringify(filters.org)}`);
      if (filters.excludeOrg?.length) debugParts.push(`org NOT ILIKE ${JSON.stringify(filters.excludeOrg)}`);
      if (filters.dateRanges?.length) debugParts.push(`dateRanges: ${JSON.stringify(filters.dateRanges)}`);
      if (filters.excludeDateRanges?.length) debugParts.push(`excludeDateRanges: ${JSON.stringify(filters.excludeDateRanges)}`);
      if (cursorParsed) debugParts.push(`cursor < (${cursorParsed.year}, ${cursorParsed.issue}, '${cursorParsed.number}')`);
      const debugWhere = debugParts.length > 0 ? `WHERE ${debugParts.join(" AND ")}` : "";
      console.log(`[dispositions.search] ${debugWhere} LIMIT ${limit + 1}`);
    }

    type Row = {
      year: bigint;
      issue: bigint;
      number: bigint | string;
      section: string | null;
      subsection: string | null;
      organization: string | null;
      title: string | null;
      date: string | null;
      identifier: string | null;
      pdf: string | null;
      signature: string | null;
      body: string | null;
      excerpt: string | null;
      html_url: string | null;
    };

    const rows = await prisma.$queryRaw<Row[]>`
      SELECT DISTINCT ON (i.year, i.issue, id.disposition)
        i.year, i.issue, id.disposition AS number,
        COALESCE(d.section, id.section) AS section,
        COALESCE(d.subsection, id.subsection) AS subsection,
        COALESCE(d.organization, id.organization) AS organization,
        COALESCE(d.title, id.summary) AS title, d.date,
        COALESCE(d.identifier, id.identifier) AS identifier,
        COALESCE(d.pdf, id.pdf) AS pdf,
        d.signature, d.body,
        id.html AS html_url,
        ${headlineExpr} AS excerpt
      ${FROM_WITH_JOIN}
      ${where}
      ORDER BY i.year DESC, i.issue DESC, id.disposition DESC
      LIMIT ${limit + 1}
    `;

    // Condiciones sin cursor para total y facets
    const conditionsForCount = conditions.filter(
      (c) => !cursorParsed || c !== conditions[conditions.length - 1]
    );
    const whereForCount =
      conditionsForCount.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(conditionsForCount, " AND ")}`
        : Prisma.empty;

    // Total + facets en paralelo
    const [countResult, facets] = await Promise.all([
      prisma.$queryRaw<[{ count: bigint }]>`
        SELECT COUNT(DISTINCT (i.year, i.issue, id.disposition)) AS count
        ${FROM_WITH_JOIN}
        ${whereForCount}
      `,
      computeFacets(whereForCount),
    ]);

    const hasMore = rows.length > limit;
    const results = rows.slice(0, limit).map(toDisposition);
    const last = results[results.length - 1];

    return {
      results,
      total: Number(countResult[0].count),
      nextCursor:
        hasMore && last ? formatCursor(last.year, last.issue, last.number) : null,
      prevCursor: cursor ?? null,
      facets,
    };
  },

  /**
   * Devuelve una disposición concreta por año, número de boletín y número de disposición.
   */
  async findByIdentifier(
    year: number,
    issue: number,
    number: string
  ): Promise<Disposition | null> {
    const rows = await prisma.$queryRaw<DocumentRow[]>`
      SELECT
        i.year, i.issue, id.disposition AS number,
        COALESCE(d.section, id.section) AS section,
        COALESCE(d.subsection, id.subsection) AS subsection,
        COALESCE(d.organization, id.organization) AS organization,
        COALESCE(d.title, id.summary) AS title, d.date,
        COALESCE(d.identifier, id.identifier) AS identifier,
        COALESCE(d.pdf, id.pdf) AS pdf,
        d.body,
        id.html AS html_url
      ${FROM_WITH_JOIN}
      WHERE i.year = ${BigInt(year)} AND i.issue = ${BigInt(issue)} AND id.disposition = ${BigInt(parseInt(number, 10))}
      LIMIT 1
    `;

    return rows.length > 0 ? toDisposition(rows[0]) : null;
  },
};

// ── facets ────────────────────────────────────────────────────────────────

/** Límites por defecto para cada facet (top N). */
const FACET_LIMIT_YEAR = 20;
const FACET_LIMIT_SECTION = 10;
const FACET_LIMIT_ORG = 15;

type FacetRow = { label: string; count: bigint };

async function computeFacets(where: Prisma.Sql): Promise<SearchFacets> {
  const [byYear, bySection, byOrg] = await Promise.all([
    prisma.$queryRaw<FacetRow[]>`
      SELECT i.year::text AS label, COUNT(DISTINCT (i.year, i.issue, id.disposition)) AS count
      ${FROM_WITH_JOIN}
      ${where}
      GROUP BY i.year ORDER BY count DESC LIMIT ${FACET_LIMIT_YEAR}`,
    prisma.$queryRaw<FacetRow[]>`
      SELECT COALESCE(NULLIF(d.section, ''), NULLIF(id.section, ''), 'Sin sección') AS label,
             COUNT(DISTINCT (i.year, i.issue, id.disposition)) AS count
      ${FROM_WITH_JOIN}
      ${where}
      GROUP BY label ORDER BY count DESC LIMIT ${FACET_LIMIT_SECTION}`,
    prisma.$queryRaw<FacetRow[]>`
      SELECT COALESCE(d.organization, id.organization, 'Sin organismo') AS label,
             COUNT(DISTINCT (i.year, i.issue, id.disposition)) AS count
      ${FROM_WITH_JOIN}
      ${where}
      GROUP BY label ORDER BY count DESC LIMIT ${FACET_LIMIT_ORG}`,
  ]);

  return {
    byYear: byYear.map((r) => ({ label: r.label, count: Number(r.count) })),
    bySection: bySection.map((r) => ({ label: r.label, count: Number(r.count) })),
    byOrg: byOrg.map((r) => ({ label: r.label, count: Number(r.count) })),
  };
}

// ── mappers ───────────────────────────────────────────────────────────────

type DocumentRow = {
  year: bigint;
  issue: bigint;
  number: bigint | string;
  section?: string | null;
  subsection?: string | null;
  organization?: string | null;
  title?: string | null;
  date?: string | null;
  identifier?: string | null;
  pdf?: string | null;
  body?: string | null;
  excerpt?: string | null;
  html_url?: string | null;
};

function toDisposition(row: DocumentRow): Disposition {
  return {
    year: Number(row.year),
    issue: Number(row.issue),
    number: String(row.number),
    section: row.section ?? "",
    subsection: row.subsection ?? undefined,
    organization: row.organization ?? "",
    title: row.title ?? "",
    date: row.date ?? "",
    identifier: row.identifier ?? undefined,
    pdfUrl: row.pdf ?? "",
    htmlUrl: row.html_url ?? undefined,
    body: row.body ?? undefined,
    excerpt: row.excerpt ?? undefined,
  };
}

function parseCursor(cursor: string): { year: number; issue: number; number: string } | null {
  const parts = cursor.split("-");
  if (parts.length < 3) return null;
  const [year, issue, ...rest] = parts;
  return {
    year: parseInt(year, 10),
    issue: parseInt(issue, 10),
    number: rest.join("-"),
  };
}

function formatCursor(year: number, issue: number, number: string): string {
  return `${year}-${String(issue).padStart(3, "0")}-${number}`;
}
