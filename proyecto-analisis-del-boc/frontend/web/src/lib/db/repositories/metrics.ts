import { Prisma } from "../../../../app/generated/prisma/client";
import { prisma } from "../prisma";
import {
  ArchiveCompletion, YearOverview,
  ProcessedBulletin, ProcessedDisposition,
} from "@/types/domain";

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

type ProcessedBulletinRow = {
  year: bigint;
  issue: bigint;
  processed_at: Date;
};

type ProcessedDispositionRow = {
  year: bigint;
  issue: bigint;
  disposition: bigint;
  processed_at: Date;
};

export const MetricsRepository = {
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
        ei.year,
        ei.total_downloaded AS total_bulletins,
        ei.extracted AS processed_bulletins,
        ei.percentage AS bulletin_percentage,
        COALESCE(ed.total_documents, 0) AS total_dispositions,
        COALESCE(ed.extracted_documents, 0) AS processed_dispositions,
        COALESCE(ed.doc_percentage, 0) AS disposition_percentage
      FROM boc_log.metric_extraction_issues AS ei
      LEFT JOIN (
        SELECT year,
          SUM(total_downloaded) AS total_documents,
          SUM(extracted) AS extracted_documents,
          CASE WHEN SUM(total_downloaded) > 0
            THEN SUM(extracted)::numeric / SUM(total_downloaded) * 100
            ELSE 0 END AS doc_percentage
        FROM boc_log.metric_extraction_documents
        GROUP BY year
      ) AS ed ON ed.year = ei.year
      ORDER BY ei.year DESC
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

  async getProcessedBulletins(limit = 5): Promise<{ recentBulletins: ProcessedBulletin[]; oldestBulletins: ProcessedBulletin[] }> {
    const rows = await prisma.$queryRaw(Prisma.sql`
      (SELECT year, issue, extracted_at AS processed_at, 'recent' AS _group
       FROM boc_log.extraction_log
       WHERE entity_type = 'issue' AND extracted_at IS NOT NULL
       ORDER BY year DESC, issue DESC
       LIMIT ${limit})
      UNION ALL
      (SELECT year, issue, extracted_at AS processed_at, 'oldest' AS _group
       FROM boc_log.extraction_log
       WHERE entity_type = 'issue' AND extracted_at IS NOT NULL
       ORDER BY year ASC, issue ASC
       LIMIT ${limit})
    `) as (ProcessedBulletinRow & { _group: string })[];
    const toItem = (r: ProcessedBulletinRow) => ({
      year: Number(r.year),
      issue: Number(r.issue),
      processedAt: r.processed_at.toISOString(),
    });
    return {
      recentBulletins: rows.filter((r) => r._group === "recent").map(toItem),
      oldestBulletins: rows.filter((r) => r._group === "oldest").map(toItem),
    };
  },

  async getProcessedDispositions(limit = 5): Promise<{ recentDispositions: ProcessedDisposition[]; oldestDispositions: ProcessedDisposition[] }> {
    const rows = await prisma.$queryRaw(Prisma.sql`
      (SELECT year, issue, disposition, extracted_at AS processed_at, 'recent' AS _group
       FROM boc_log.extraction_log
       WHERE entity_type = 'document' AND extracted_at IS NOT NULL
       ORDER BY year DESC, issue DESC, disposition DESC
       LIMIT ${limit})
      UNION ALL
      (SELECT year, issue, disposition, extracted_at AS processed_at, 'oldest' AS _group
       FROM boc_log.extraction_log
       WHERE entity_type = 'document' AND extracted_at IS NOT NULL
       ORDER BY year ASC, issue ASC, disposition ASC
       LIMIT ${limit})
    `) as (ProcessedDispositionRow & { _group: string })[];
    const toItem = (r: ProcessedDispositionRow) => ({
      year: Number(r.year),
      issue: Number(r.issue),
      disposition: Number(r.disposition),
      processedAt: r.processed_at.toISOString(),
    });
    return {
      recentDispositions: rows.filter((r) => r._group === "recent").map(toItem),
      oldestDispositions: rows.filter((r) => r._group === "oldest").map(toItem),
    };
  },
};
