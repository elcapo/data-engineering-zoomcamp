import type { Metadata } from "next";
import { MetricsRepository } from "@/lib/db/repositories/metrics";
import { MetricKPI } from "@/components/metrics/MetricKPI";
import { ArchiveSection } from "@/components/metrics/ArchiveSection";
import { BulletinSection } from "@/components/metrics/BulletinSection";
import { DispositionSection } from "@/components/metrics/DispositionSection";
import { PageHeader } from "@/components/layout/PageHeader";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cobertura — Bocana",
  description: "Cobertura del corpus histórico del Boletín Oficial de Canarias: descarga y extracción por año.",
};

export default async function MetricasPage() {
  const [
    archiveSummary,
    yearOverviews,
    { recentBulletins, oldestBulletins },
    { recentDispositions, oldestDispositions },
  ] = await Promise.all([
    MetricsRepository.getArchiveCompletion(),
    MetricsRepository.getYearOverviews(),
    MetricsRepository.getProcessedBulletins(),
    MetricsRepository.getProcessedDispositions(),
  ]);

  const bulletinSummary = yearOverviews.reduce(
    (acc, y) => ({
      total: acc.total + y.totalBulletins,
      processed: acc.processed + y.processedBulletins,
    }),
    { total: 0, processed: 0 },
  );

  const dispositionSummary = yearOverviews.reduce(
    (acc, y) => ({
      total: acc.total + y.totalDispositions,
      processed: acc.processed + y.processedDispositions,
    }),
    { total: 0, processed: 0 },
  );

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
              processed={archiveSummary.extractedYears}
              total={archiveSummary.totalYears}
            />
            <MetricKPI
              label="Boletines"
              processed={bulletinSummary.processed}
              total={bulletinSummary.total}
            />
            <MetricKPI
              label="Disposiciones"
              processed={dispositionSummary.processed}
              total={dispositionSummary.total}
              processedLabel="procesadas"
            />
          </div>
        </section>

        {/* Archivo */}
        <ArchiveSection years={yearOverviews} />

        {/* Boletines */}
        <BulletinSection
          recent={recentBulletins}
          oldest={oldestBulletins}
        />

        {/* Disposiciones */}
        <DispositionSection
          recent={recentDispositions}
          oldest={oldestDispositions}
        />
      </div>
    </>
  );
}
