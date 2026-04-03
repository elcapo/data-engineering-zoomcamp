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
        total_years,
        downloaded_years,
        downloaded_at,
        downloaded_percentage,
        extracted_years,
        extracted_percentage
      FROM boc_metrics.archive_completion
      LIMIT 1
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
        year,
        total_bulletins,
        processed_bulletins,
        bulletin_percentage,
        total_dispositions,
        processed_dispositions,
        disposition_percentage
      FROM boc_metrics.year_overview
      ORDER BY year DESC
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
      SELECT year, issue, processed_at, group_type AS _group
      FROM boc_metrics.processed_bulletins
      ORDER BY
        CASE group_type WHEN 'recent' THEN 0 ELSE 1 END,
        year DESC, issue DESC
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
      SELECT year, issue, disposition, processed_at, group_type AS _group
      FROM boc_metrics.processed_dispositions
      ORDER BY
        CASE group_type WHEN 'recent' THEN 0 ELSE 1 END,
        year DESC, issue DESC, disposition DESC
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
