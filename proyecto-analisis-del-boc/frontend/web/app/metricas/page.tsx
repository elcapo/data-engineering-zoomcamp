import type { Metadata } from "next";
import { MetricsRepository } from "@/lib/db/repositories/metrics";
import { MetricKPI } from "@/components/metrics/MetricKPI";
import { ArchiveSection } from "@/components/metrics/ArchiveSection";
import { BulletinSection } from "@/components/metrics/BulletinSection";
import { DispositionSection } from "@/components/metrics/DispositionSection";
import { PageHeader } from "@/components/layout/PageHeader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cobertura — BOC Canarias Web",
  description: "Cobertura del corpus histórico del Boletín Oficial de Canarias: descarga y extracción por año.",
};

export default async function MetricasPage() {
  const [
    report,
    archiveSummary,
    archiveDetails,
    yearCompletion,
    dispositionSummary,
    recentDispositions,
    oldestDispositions,
  ] = await Promise.all([
    MetricsRepository.getDataQualityReport(),
    MetricsRepository.getArchiveCompletion(),
    MetricsRepository.getArchiveDetails(),
    MetricsRepository.getYearCompletion(),
    MetricsRepository.getDispositionSummary(),
    MetricsRepository.getRecentProcessedDispositions(),
    MetricsRepository.getOldestProcessedDispositions(),
  ]);

  const extractedYearsPercentage = report.downloads.years.percentage;

  const totalIssues = report.downloads.issues.reduce((s, r) => s + r.total, 0);
  const extractedIssues = report.downloads.issues.reduce((s, r) => s + r.done, 0);
  const extractedIssuePercentage = report.downloads.issues.length > 0 ? extractedIssues / totalIssues * 100 : 0;

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inicio", href: "/" }]}
        title="Cobertura"
      />

      <div className="px-4 py-8 sm:px-6 lg:px-8">
        {/* KPIs */}
        <section className="mb-10">
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricKPI
              label="Años"
              value={extractedYearsPercentage}
            />
            <MetricKPI
              label="Boletines"
              value={extractedIssuePercentage}
            />
            <MetricKPI
              label="Disposiciones"
              value={dispositionSummary.percentage}
            />
          </div>
        </section>

        {/* Archivo */}
        <ArchiveSection summary={archiveSummary} details={archiveDetails} />

        {/* Boletines */}
        <BulletinSection years={yearCompletion} />

        {/* Disposiciones */}
        <DispositionSection
          summary={dispositionSummary}
          recent={recentDispositions}
          oldest={oldestDispositions}
        />
      </div>
    </>
  );
}
