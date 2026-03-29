import { Prisma } from "../../../../app/generated/prisma/client";
import { prisma } from "../prisma";
import { Disposition, SearchFilters, SearchResult } from "@/types/domain";
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
    if (filters.section?.length) {
      conditions.push(Prisma.sql`COALESCE(d.section, id.section) = ANY(${filters.section})`);
    }
    if (filters.subsection?.length) {
      conditions.push(Prisma.sql`COALESCE(d.subsection, id.subsection) = ANY(${filters.subsection})`);
    }
    if (filters.org) {
      conditions.push(
        Prisma.sql`COALESCE(d.organization, id.organization) ILIKE ${"%" + filters.org + "%"}`
      );
    }
    if (filters.from) {
      conditions.push(Prisma.sql`d.date >= ${filters.from}`);
    }
    if (filters.to) {
      conditions.push(Prisma.sql`d.date <= ${filters.to}`);
    }
    if (filters.year) {
      conditions.push(Prisma.sql`i.year = ${filters.year}`);
    }
    if (filters.issue) {
      conditions.push(Prisma.sql`i.issue = ${filters.issue}`);
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
      if (tsquery) debugParts.push(`(d.body_tsv @@ tsq OR id.summary_tsv @@ tsq) [tsq='${tsquery}']`);
      if (filters.section?.length) debugParts.push(`COALESCE(d.section, id.section) = ANY(${JSON.stringify(filters.section)})`);
      if (filters.org) debugParts.push(`COALESCE(d.organization, id.organization) ILIKE '%${filters.org}%'`);
      if (filters.year) debugParts.push(`i.year = ${filters.year}`);
      if (filters.issue) debugParts.push(`i.issue = ${filters.issue}`);
      if (filters.from) debugParts.push(`d.date >= '${filters.from}'`);
      if (filters.to) debugParts.push(`d.date <= '${filters.to}'`);
      if (cursorParsed) debugParts.push(`cursor < (${cursorParsed.year}, ${cursorParsed.issue}, '${cursorParsed.number}')`);
      const debugWhere = debugParts.length > 0 ? `WHERE ${debugParts.join(" AND ")}` : "";
      console.log(`[dispositions.search] SQL: SELECT ... FROM issue__dispositions id JOIN issue i ... LEFT JOIN document d ... ${debugWhere} LIMIT ${limit + 1}`);
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

    // Consulta de total (sin cursor ni limit)
    const conditionsForCount = conditions.filter(
      (c) => !cursorParsed || c !== conditions[conditions.length - 1]
    );
    const whereForCount =
      conditionsForCount.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(conditionsForCount, " AND ")}`
        : Prisma.empty;

    const [{ count }] = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(DISTINCT (i.year, i.issue, id.disposition)) AS count
      ${FROM_WITH_JOIN}
      ${whereForCount}
    `;

    const hasMore = rows.length > limit;
    const results = rows.slice(0, limit).map(toDisposition);
    const last = results[results.length - 1];

    return {
      results,
      total: Number(count),
      nextCursor:
        hasMore && last ? formatCursor(last.year, last.issue, last.number) : null,
      prevCursor: cursor ?? null,
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
