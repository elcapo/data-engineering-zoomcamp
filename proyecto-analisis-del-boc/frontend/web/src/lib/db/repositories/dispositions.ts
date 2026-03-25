import { Prisma } from "../../../../app/generated/prisma/client";
import { prisma } from "../prisma";
import { Disposition, SearchFilters, SearchResult } from "@/types/domain";
import { buildTsqueryFromString } from "@/lib/search/query-builder";

const DEFAULT_LIMIT = 20;

// JOINs comunes: document → issue → issue__dispositions
const FROM_WITH_JOIN = Prisma.sql`
  FROM boc_dataset.document d
  JOIN boc_dataset.issue i ON i.year = d.year AND i.issue = d.issue
  LEFT JOIN boc_dataset.issue__dispositions id
    ON id._dlt_root_id = i._dlt_id
    AND id.disposition = CAST(d.number AS bigint)`;

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
      conditions.push(Prisma.sql`d.section = ANY(${filters.section})`);
    }
    if (filters.subsection?.length) {
      conditions.push(Prisma.sql`d.subsection = ANY(${filters.subsection})`);
    }
    if (filters.org) {
      conditions.push(
        Prisma.sql`d.organization ILIKE ${"%" + filters.org + "%"}`
      );
    }
    if (filters.from) {
      conditions.push(Prisma.sql`d.date >= ${filters.from}`);
    }
    if (filters.to) {
      conditions.push(Prisma.sql`d.date <= ${filters.to}`);
    }
    if (filters.year) {
      conditions.push(Prisma.sql`d.year = ${filters.year}`);
    }
    if (filters.issue) {
      conditions.push(Prisma.sql`d.issue = ${filters.issue}`);
    }
    if (cursorParsed) {
      // El ORDER BY es todo DESC, así que "siguiente página" = tupla menor
      conditions.push(
        Prisma.sql`(d.year, d.issue, CAST(d.number AS integer)) < (${cursorParsed.year}, ${cursorParsed.issue}, ${parseInt(cursorParsed.number, 10)})`
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
      if (filters.section?.length) debugParts.push(`d.section = ANY(${JSON.stringify(filters.section)})`);
      if (filters.org) debugParts.push(`d.organization ILIKE '%${filters.org}%'`);
      if (filters.year) debugParts.push(`d.year = ${filters.year}`);
      if (filters.issue) debugParts.push(`d.issue = ${filters.issue}`);
      if (filters.from) debugParts.push(`d.date >= '${filters.from}'`);
      if (filters.to) debugParts.push(`d.date <= '${filters.to}'`);
      if (cursorParsed) debugParts.push(`cursor < (${cursorParsed.year}, ${cursorParsed.issue}, '${cursorParsed.number}')`);
      const debugWhere = debugParts.length > 0 ? `WHERE ${debugParts.join(" AND ")}` : "";
      console.log(`[dispositions.search] SQL: SELECT ... FROM document d JOIN issue i ... LEFT JOIN issue__dispositions id ... ${debugWhere} LIMIT ${limit + 1}`);
    }

    type Row = {
      year: bigint;
      issue: bigint;
      number: string;
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
      SELECT DISTINCT ON (d.year, d.issue, CAST(d.number AS integer))
        d.year, d.issue, d.number,
        d.section, d.subsection, d.organization,
        d.title, d.date, d.identifier, d.pdf, d.signature, d.body,
        id.html AS html_url,
        ${headlineExpr} AS excerpt
      ${FROM_WITH_JOIN}
      ${where}
      ORDER BY d.year DESC, d.issue DESC, CAST(d.number AS integer) DESC
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
      SELECT COUNT(DISTINCT (d.year, d.issue, d.number)) AS count
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
        d.year, d.issue, d.number,
        d.section, d.subsection, d.organization,
        d.title, d.date, d.identifier, d.pdf, d.body,
        id.html AS html_url
      ${FROM_WITH_JOIN}
      WHERE d.year = ${BigInt(year)} AND d.issue = ${BigInt(issue)} AND d.number = ${number}
      LIMIT 1
    `;

    return rows.length > 0 ? toDisposition(rows[0]) : null;
  },
};

// ── mappers ───────────────────────────────────────────────────────────────

type DocumentRow = {
  year: bigint;
  issue: bigint;
  number: string;
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
    number: row.number,
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
