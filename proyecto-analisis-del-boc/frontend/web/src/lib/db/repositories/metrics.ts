import { Prisma } from "../../../../app/generated/prisma/client";
import { prisma } from "../prisma";
import {
  DataQualityReport, IssueBreakdown, YearBreakdown,
  ArchiveCompletion, ArchiveDetail,
  YearCompletion, YearDetail,
  IssueCompletion, IssueDetail,
  PaginatedResult,
} from "@/types/domain";

// Tipos de fila para cada vista de boc_log

type DownloadYearsRow = {
  total_years: bigint;
  downloaded_years: bigint;
  percentage: Prisma.Decimal;
};

type DownloadIssuesRow = {
  year: bigint;
  total_issues: bigint;
  downloaded_issues: bigint;
  percentage: Prisma.Decimal;
};

type DownloadDocumentsRow = {
  year: bigint;
  issue: bigint;
  total_documents: bigint;
  downloaded_documents: bigint;
  percentage: Prisma.Decimal;
};

type ExtractionYearsRow = {
  total_downloaded: bigint;
  extracted: bigint;
  percentage: Prisma.Decimal;
};

type ExtractionIssuesRow = {
  year: number;
  total_downloaded: bigint;
  extracted: bigint;
  percentage: Prisma.Decimal;
};

type ExtractionDocumentsRow = {
  year: number;
  issue: number;
  total_downloaded: bigint;
  extracted: bigint;
  percentage: Prisma.Decimal;
};

// Tipos para las nuevas consultas por entidad

type ArchiveCompletionRow = {
  total_years: bigint;
  downloaded_years: bigint;
  downloaded_at: Date | null;
  downloaded_percentage: Prisma.Decimal;
  extracted_years: bigint;
  extracted_percentage: Prisma.Decimal;
};

type ArchiveDetailRow = {
  year: bigint;
  absolute_link: string | null;
  object_key: string | null;
  downloaded_at: Date | null;
  extracted_at: Date | null;
};

type YearCompletionRow = {
  year: bigint;
  total_issues: bigint;
  downloaded_issues: bigint;
  download_percentage: Prisma.Decimal;
  extracted_issues: bigint;
  extracted_percentage: Prisma.Decimal;
  downloaded_at: Date | null;
};

type YearDetailRow = {
  year: bigint;
  issue: bigint;
  url: string | null;
  object_key: string | null;
  downloaded_at: Date | null;
  extracted_at: Date | null;
};

type IssueCompletionRow = {
  year: bigint;
  issue: bigint;
  downloaded_at: Date | null;
  total_documents: bigint;
  downloaded_documents: bigint;
  download_percentage: Prisma.Decimal;
  extracted_documents: bigint;
  extracted_percentage: Prisma.Decimal;
};

type IssueDetailRow = {
  year: bigint;
  issue: bigint;
  disposition: bigint;
  object_key: string | null;
  downloaded_at: Date | null;
  extracted_at: Date | null;
};

type CountRow = { count: bigint };

export const MetricsRepository = {
  async getDataQualityReport(): Promise<DataQualityReport> {
    const [
      downloadYears,
      downloadIssues,
      downloadDocuments,
      extractionYears,
      extractionIssues,
      extractionDocuments,
    ] = await Promise.all([
      prisma.$queryRaw(Prisma.sql`SELECT * FROM boc_log.metric_download_years`) as Promise<DownloadYearsRow[]>,
      prisma.$queryRaw(Prisma.sql`SELECT * FROM boc_log.metric_download_issues ORDER BY year`) as Promise<DownloadIssuesRow[]>,
      prisma.$queryRaw(Prisma.sql`SELECT * FROM boc_log.metric_download_documents ORDER BY year, issue`) as Promise<DownloadDocumentsRow[]>,
      prisma.$queryRaw(Prisma.sql`SELECT * FROM boc_log.metric_extraction_years`) as Promise<ExtractionYearsRow[]>,
      prisma.$queryRaw(Prisma.sql`SELECT * FROM boc_log.metric_extraction_issues ORDER BY year`) as Promise<ExtractionIssuesRow[]>,
      prisma.$queryRaw(Prisma.sql`SELECT * FROM boc_log.metric_extraction_documents ORDER BY year, issue`) as Promise<ExtractionDocumentsRow[]>,
    ]);

    const dy = downloadYears[0];
    const ey = extractionYears[0];

    return {
      downloads: {
        years: {
          total: Number(dy.total_years),
          downloaded: Number(dy.downloaded_years),
          percentage: Number(dy.percentage),
        },
        issues: downloadIssues.map((r): YearBreakdown => ({
          year: Number(r.year),
          total: Number(r.total_issues),
          done: Number(r.downloaded_issues),
          percentage: Number(r.percentage),
        })),
        documents: downloadDocuments.map((r): IssueBreakdown => ({
          year: Number(r.year),
          issue: Number(r.issue),
          total: Number(r.total_documents),
          done: Number(r.downloaded_documents),
          percentage: Number(r.percentage),
        })),
      },
      extractions: {
        years: {
          total: Number(ey.total_downloaded),
          extracted: Number(ey.extracted),
          percentage: Number(ey.percentage),
        },
        issues: extractionIssues.map((r): YearBreakdown => ({
          year: Number(r.year),
          total: Number(r.total_downloaded),
          done: Number(r.extracted),
          percentage: Number(r.percentage),
        })),
        documents: extractionDocuments.map((r): IssueBreakdown => ({
          year: Number(r.year),
          issue: Number(r.issue),
          total: Number(r.total_downloaded),
          done: Number(r.extracted),
          percentage: Number(r.percentage),
        })),
      },
    };
  },

  async getArchiveCompletion(): Promise<ArchiveCompletion> {
    const rows = await prisma.$queryRaw(Prisma.sql`
      SELECT
        dy.total_years,
        dy.downloaded_years,
        l.downloaded_at,
        dy.percentage AS downloaded_percentage,
        ey.extracted AS extracted_years,
        ey.percentage AS extracted_percentage
      FROM boc_log.metric_download_years AS dy
      LEFT JOIN boc_log.metric_extraction_years AS ey ON 1=1
      LEFT JOIN boc_log.download_log AS l ON l.entity_type = 'archive'
    `) as ArchiveCompletionRow[];
    const r = rows[0];
    return {
      totalYears: Number(r.total_years),
      downloadedYears: Number(r.downloaded_years),
      extractedYears: Number(r.extracted_years),
      downloadedPercentage: Number(r.downloaded_percentage),
      extractedPercentage: Number(r.extracted_percentage),
      downloadedAt: r.downloaded_at?.toISOString() ?? null,
    };
  },

  async getArchiveDetails(): Promise<ArchiveDetail[]> {
    const rows = await prisma.$queryRaw(Prisma.sql`
      SELECT
        a.year, a.absolute_link,
        dl.object_key, dl.downloaded_at, el.extracted_at
      FROM boc_dataset.archive AS a
      LEFT JOIN boc_log.download_log AS dl ON dl.entity_type = 'year' AND dl.year = a.year
      LEFT JOIN boc_log.extraction_log AS el ON el.entity_type = 'year' AND el.year = a.year
      ORDER BY a.year DESC
    `) as ArchiveDetailRow[];
    return rows.map((r) => ({
      year: Number(r.year),
      absoluteLink: r.absolute_link,
      objectKey: r.object_key,
      downloadedAt: r.downloaded_at?.toISOString() ?? null,
      extractedAt: r.extracted_at?.toISOString() ?? null,
    }));
  },

  async getYearCompletion(): Promise<YearCompletion[]> {
    const rows = await prisma.$queryRaw(Prisma.sql`
      SELECT
        di.year, di.total_issues, di.downloaded_issues,
        di.percentage AS download_percentage,
        COALESCE(ei.extracted, 0) AS extracted_issues,
        COALESCE(ei.percentage, 0.0) AS extracted_percentage,
        l.downloaded_at
      FROM boc_log.metric_download_issues AS di
      LEFT JOIN boc_log.metric_extraction_issues AS ei ON di.year = ei.year
      LEFT JOIN boc_log.download_log AS l ON l.entity_type = 'year' AND l.year = di.year
      ORDER BY di.year DESC
    `) as YearCompletionRow[];
    return rows.map((r) => ({
      year: Number(r.year),
      totalIssues: Number(r.total_issues),
      downloadedIssues: Number(r.downloaded_issues),
      downloadPercentage: Number(r.download_percentage),
      extractedIssues: Number(r.extracted_issues),
      extractedPercentage: Number(r.extracted_percentage),
      downloadedAt: r.downloaded_at?.toISOString() ?? null,
    }));
  },

  async getYearDetails(year: number): Promise<YearDetail[]> {
    const rows = await prisma.$queryRaw(Prisma.sql`
      SELECT
        y.year, y.issue, y.url,
        dl.object_key, dl.downloaded_at, el.extracted_at
      FROM boc_dataset.year AS y
      LEFT JOIN boc_log.download_log AS dl ON dl.entity_type = 'issue' AND dl.year = y.year AND dl.issue = y.issue
      LEFT JOIN boc_log.extraction_log AS el ON el.entity_type = 'issue' AND el.year = y.year AND el.issue = y.issue
      WHERE y.year = ${year}
      ORDER BY y.issue DESC
    `) as YearDetailRow[];
    return rows.map((r) => ({
      year: Number(r.year),
      issue: Number(r.issue),
      url: r.url,
      objectKey: r.object_key,
      downloadedAt: r.downloaded_at?.toISOString() ?? null,
      extractedAt: r.extracted_at?.toISOString() ?? null,
    }));
  },

  async getIssueCompletion(): Promise<IssueCompletion[]> {
    const rows = await prisma.$queryRaw(Prisma.sql`
      SELECT
        dd.year, dd.issue, l.downloaded_at,
        dd.total_documents, dd.downloaded_documents,
        dd.percentage AS download_percentage,
        COALESCE(ed.extracted, 0) AS extracted_documents,
        COALESCE(ed.percentage, 0.0) AS extracted_percentage
      FROM boc_log.metric_download_documents AS dd
      LEFT JOIN boc_log.metric_extraction_documents AS ed ON dd.year = ed.year AND dd.issue = ed.issue
      LEFT JOIN boc_log.download_log AS l ON l.year = dd.year AND l.issue = dd.issue AND l.entity_type = 'issue'
      ORDER BY dd.year DESC, dd.issue DESC
    `) as IssueCompletionRow[];
    return rows.map((r) => ({
      year: Number(r.year),
      issue: Number(r.issue),
      totalDocuments: Number(r.total_documents),
      downloadedDocuments: Number(r.downloaded_documents),
      downloadPercentage: Number(r.download_percentage),
      extractedDocuments: Number(r.extracted_documents),
      extractedPercentage: Number(r.extracted_percentage),
      downloadedAt: r.downloaded_at?.toISOString() ?? null,
    }));
  },

  async getIssueDetails(year: number, issue: number, page = 1, pageSize = 50): Promise<PaginatedResult<IssueDetail>> {
    const offset = (page - 1) * pageSize;
    const [countRows, rows] = await Promise.all([
      prisma.$queryRaw(Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM boc_dataset.issue__dispositions AS d
        JOIN boc_dataset.issue AS i ON i._dlt_id = d._dlt_parent_id
        WHERE i.year = ${BigInt(year)} AND i.issue = ${BigInt(issue)}
      `) as Promise<CountRow[]>,
      prisma.$queryRaw(Prisma.sql`
        SELECT
          i.year, i.issue, d.disposition,
          dl.object_key, dl.downloaded_at, el.extracted_at
        FROM boc_dataset.issue__dispositions AS d
        JOIN boc_dataset.issue AS i ON i._dlt_id = d._dlt_parent_id
        LEFT JOIN boc_log.download_log AS dl ON dl.entity_type = 'document' AND dl.year = i.year AND dl.issue = i.issue AND dl.disposition = d.disposition
        LEFT JOIN boc_log.extraction_log AS el ON el.entity_type = 'document' AND el.year = i.year AND el.issue = i.issue AND el.disposition = d.disposition
        WHERE i.year = ${BigInt(year)} AND i.issue = ${BigInt(issue)}
        ORDER BY d.disposition DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `) as Promise<IssueDetailRow[]>,
    ]);
    const total = Number(countRows[0].count);
    return {
      data: rows.map((r) => ({
        year: Number(r.year),
        issue: Number(r.issue),
        disposition: Number(r.disposition),
        objectKey: r.object_key,
        downloadedAt: r.downloaded_at?.toISOString() ?? null,
        extractedAt: r.extracted_at?.toISOString() ?? null,
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  },
};
