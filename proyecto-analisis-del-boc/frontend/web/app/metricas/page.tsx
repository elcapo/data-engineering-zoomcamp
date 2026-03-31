import type { Metadata } from "next";
import Link from "next/link";
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
  const [report, archiveSummary, archiveDetails, yearCompletion, issueCompletion] = await Promise.all([
    MetricsRepository.getDataQualityReport(),
    MetricsRepository.getArchiveCompletion(),
    MetricsRepository.getArchiveDetails(),
    MetricsRepository.getYearCompletion(),
    MetricsRepository.getIssueCompletion(),
  ]);

  const totalDispositions = issueCompletion.reduce((s, i) => s + i.totalDocuments, 0);
  const extractedDispositions = issueCompletion.reduce((s, i) => s + i.extractedDocuments, 0);
  const extractedPct = totalDispositions > 0 ? (extractedDispositions / totalDispositions) * 100 : 0;

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
              value={report.downloads.years.percentage}
              detail={`${report.downloads.years.downloaded} de ${report.downloads.years.total}`}
            />
            <MetricKPI
              label="Boletines"
              value={
                report.downloads.issues.length > 0
                  ? report.downloads.issues.reduce((s, r) => s + r.done, 0) /
                      report.downloads.issues.reduce((s, r) => s + r.total, 0) *
                      100
                  : 0
              }
              detail={`${report.downloads.issues.reduce((s, r) => s + r.done, 0)} de ${report.downloads.issues.reduce((s, r) => s + r.total, 0)}`}
            />
            <MetricKPI
              label="Disposiciones"
              value={extractedPct}
              detail={`${extractedDispositions.toLocaleString("es-ES")} de ${totalDispositions.toLocaleString("es-ES")} disposiciones`}
            />
          </div>
        </section>

        {/* Archivo */}
        <ArchiveSection summary={archiveSummary} details={archiveDetails} />

        {/* Boletines */}
        <BulletinSection years={yearCompletion} />

        {/* Disposiciones */}
        <DispositionSection issues={issueCompletion} />
      </div>
    </>
  );
}
