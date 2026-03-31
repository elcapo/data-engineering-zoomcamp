import { Prisma } from "../../../../app/generated/prisma/client";
import { prisma } from "../prisma";
import {
  DataQualityReport, IssueBreakdown, YearBreakdown,
  ArchiveCompletion, YearOverview,
  BulletinSummary, ProcessedBulletin,
  DispositionSummary, ProcessedDisposition,
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

type YearOverviewRow = {
  year: bigint;
  total_bulletins: bigint;
  processed_bulletins: bigint;
  bulletin_percentage: Prisma.Decimal;
  total_dispositions: bigint;
  processed_dispositions: bigint;
  disposition_percentage: Prisma.Decimal;
};

type BulletinSummaryRow = {
  total: bigint;
  processed: bigint;
  percentage: Prisma.Decimal;
};

type ProcessedBulletinRow = {
  year: bigint;
  issue: bigint;
  processed_at: Date;
};

type DispositionSummaryRow = {
  total: bigint;
  processed: bigint;
  percentage: Prisma.Decimal;
};

type ProcessedDispositionRow = {
  year: bigint;
  issue: bigint;
  disposition: bigint;
  processed_at: Date;
};

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

  async getYearOverviews(): Promise<YearOverview[]> {
    const rows = await prisma.$queryRaw(Prisma.sql`
      SELECT
        di.year,
        di.total_issues AS total_bulletins,
        di.downloaded_issues AS processed_bulletins,
        di.percentage AS bulletin_percentage,
        COALESCE(dd.total_documents, 0) AS total_dispositions,
        COALESCE(dd.downloaded_documents, 0) AS processed_dispositions,
        COALESCE(dd.doc_percentage, 0) AS disposition_percentage
      FROM boc_log.metric_download_issues AS di
      LEFT JOIN (
        SELECT year,
          SUM(total_documents) AS total_documents,
          SUM(downloaded_documents) AS downloaded_documents,
          CASE WHEN SUM(total_documents) > 0
            THEN SUM(downloaded_documents)::numeric / SUM(total_documents) * 100
            ELSE 0 END AS doc_percentage
        FROM boc_log.metric_download_documents
        GROUP BY year
      ) AS dd ON dd.year = di.year
      ORDER BY di.year DESC
    `) as YearOverviewRow[];
    return rows.map((r) => ({
      year: Number(r.year),
      totalBulletins: Number(r.total_bulletins),
      processedBulletins: Number(r.processed_bulletins),
      bulletinPercentage: Number(r.bulletin_percentage),
      totalDispositions: Number(r.total_dispositions),
      processedDispositions: Number(r.processed_dispositions),
      dispositionPercentage: Number(r.disposition_percentage),
    }));
  },

  async getBulletinSummary(): Promise<BulletinSummary> {
    const rows = await prisma.$queryRaw(Prisma.sql`
      SELECT
        di.total_issues AS total,
        di.downloaded_issues AS processed,
        di.percentage
      FROM boc_log.metric_download_issues AS di
    `) as BulletinSummaryRow[];
    const total = rows.reduce((s, r) => s + Number(r.total), 0);
    const processed = rows.reduce((s, r) => s + Number(r.processed), 0);
    return {
      total,
      processed,
      percentage: total > 0 ? (processed / total) * 100 : 0,
    };
  },

  async getRecentProcessedBulletins(limit = 5): Promise<ProcessedBulletin[]> {
    const rows = await prisma.$queryRaw(Prisma.sql`
      SELECT year, issue, downloaded_at AS processed_at
      FROM boc_log.download_log
      WHERE entity_type = 'issue' AND downloaded_at IS NOT NULL
      ORDER BY downloaded_at DESC
      LIMIT ${limit}
    `) as ProcessedBulletinRow[];
    return rows.map((r) => ({
      year: Number(r.year),
      issue: Number(r.issue),
      processedAt: r.processed_at.toISOString(),
    }));
  },

  async getOldestProcessedBulletins(limit = 5): Promise<ProcessedBulletin[]> {
    const rows = await prisma.$queryRaw(Prisma.sql`
      SELECT year, issue, downloaded_at AS processed_at
      FROM boc_log.download_log
      WHERE entity_type = 'issue' AND downloaded_at IS NOT NULL
      ORDER BY year ASC, issue ASC
      LIMIT ${limit}
    `) as ProcessedBulletinRow[];
    return rows.map((r) => ({
      year: Number(r.year),
      issue: Number(r.issue),
      processedAt: r.processed_at.toISOString(),
    }));
  },

  async getDispositionSummary(): Promise<DispositionSummary> {
    const rows = await prisma.$queryRaw(Prisma.sql`
      SELECT
        dd.total_documents AS total,
        dd.downloaded_documents AS processed,
        dd.percentage
      FROM boc_log.metric_download_documents AS dd
    `) as DispositionSummaryRow[];
    const total = rows.reduce((s, r) => s + Number(r.total), 0);
    const processed = rows.reduce((s, r) => s + Number(r.processed), 0);
    return {
      total,
      processed,
      percentage: total > 0 ? (processed / total) * 100 : 0,
    };
  },

  async getRecentProcessedDispositions(limit = 5): Promise<ProcessedDisposition[]> {
    const rows = await prisma.$queryRaw(Prisma.sql`
      SELECT year, issue, disposition, downloaded_at AS processed_at
      FROM boc_log.download_log
      WHERE entity_type = 'document' AND downloaded_at IS NOT NULL
      ORDER BY year DESC, issue DESC
      LIMIT ${limit}
    `) as ProcessedDispositionRow[];
    return rows.map((r) => ({
      year: Number(r.year),
      issue: Number(r.issue),
      disposition: Number(r.disposition),
      processedAt: r.processed_at.toISOString(),
    }));
  },

  async getOldestProcessedDispositions(limit = 5): Promise<ProcessedDisposition[]> {
    const rows = await prisma.$queryRaw(Prisma.sql`
      SELECT year, issue, disposition, downloaded_at AS processed_at
      FROM boc_log.download_log
      WHERE entity_type = 'document' AND downloaded_at IS NOT NULL
      ORDER BY year ASC, issue ASC, disposition ASC
      LIMIT ${limit}
    `) as ProcessedDispositionRow[];
    return rows.map((r) => ({
      year: Number(r.year),
      issue: Number(r.issue),
      disposition: Number(r.disposition),
      processedAt: r.processed_at.toISOString(),
    }));
  },
};
