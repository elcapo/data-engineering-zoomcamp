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
    archiveSummary,
    archiveDetails,
    bulletinSummary,
    recentBulletins,
    oldestBulletins,
    dispositionSummary,
    recentDispositions,
    oldestDispositions,
  ] = await Promise.all([
    MetricsRepository.getArchiveCompletion(),
    MetricsRepository.getArchiveDetails(),
    MetricsRepository.getBulletinSummary(),
    MetricsRepository.getRecentProcessedBulletins(),
    MetricsRepository.getOldestProcessedBulletins(),
    MetricsRepository.getDispositionSummary(),
    MetricsRepository.getRecentProcessedDispositions(),
    MetricsRepository.getOldestProcessedDispositions(),
  ]);

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
              value={archiveSummary.downloadedPercentage}
            />
            <MetricKPI
              label="Boletines"
              value={bulletinSummary.percentage}
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
        <BulletinSection
          summary={bulletinSummary}
          recent={recentBulletins}
          oldest={oldestBulletins}
        />

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
