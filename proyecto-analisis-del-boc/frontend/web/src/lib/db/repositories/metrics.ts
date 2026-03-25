import { Prisma } from "../../../../app/generated/prisma/client";
import { prisma } from "../prisma";
import { DataQualityReport, IssueBreakdown, YearBreakdown } from "@/types/domain";

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
};
