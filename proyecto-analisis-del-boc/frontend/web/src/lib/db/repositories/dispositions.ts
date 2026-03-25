import { Prisma } from "../../../../app/generated/prisma/client";
import { prisma } from "../prisma";
import { Disposition, SearchFilters, SearchResult } from "@/types/domain";
import { buildTsqueryFromString } from "@/lib/search/query-builder";

const DEFAULT_LIMIT = 20;

export const DispositionRepository = {
  /**
   * Búsqueda full-text con filtros combinados y paginación por cursor.
   * El cursor tiene el formato "YYYY-NNN-number" (ej. "2024-045-3").
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
      conditions.push(
        Prisma.sql`d.body_tsv @@ to_tsquery('spanish', ${tsquery})`
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
      conditions.push(
        Prisma.sql`(d.year, d.issue, d.number) < (${cursorParsed.year}, ${cursorParsed.issue}, ${cursorParsed.number})`
      );
    }

    const where =
      conditions.length > 0
        ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}`
        : Prisma.empty;

    const headlineExpr = tsquery
      ? Prisma.sql`ts_headline('spanish', COALESCE(d.body, ''), to_tsquery('spanish', ${tsquery}), 'MaxWords=60, MinWords=20, StartSel=<mark>, StopSel=</mark>')`
      : Prisma.sql`NULL`;

    // Consulta principal
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
    };

    const rows = await prisma.$queryRaw<Row[]>`
      SELECT
        d.year, d.issue, d.number,
        d.section, d.subsection, d.organization,
        d.title, d.date, d.identifier, d.pdf, d.signature, d.body,
        ${headlineExpr} AS excerpt
      FROM boc_dataset.document d
      ${where}
      ORDER BY d.year DESC, d.issue DESC, d.number ASC
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
      SELECT COUNT(*) AS count
      FROM boc_dataset.document d
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
    const row = await prisma.document.findFirst({
      where: {
        year: BigInt(year),
        issue: BigInt(issue),
        number,
      },
    });

    return row ? toDisposition(row) : null;
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
  signature?: string | null;
  body?: string | null;
  excerpt?: string | null;
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
    htmlUrl: row.signature ?? undefined,
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
