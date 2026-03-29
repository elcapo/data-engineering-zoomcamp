import type { Metadata } from "next";
import Link from "next/link";
import { MetricsRepository } from "@/lib/db/repositories/metrics";
import { MetricKPI } from "@/components/metrics/MetricKPI";
import { ArchiveSection } from "@/components/metrics/ArchiveSection";
import { BulletinSection } from "@/components/metrics/BulletinSection";
import { DispositionSection } from "@/components/metrics/DispositionSection";
import { PageHeader } from "@/components/layout/PageHeader";

export const metadata: Metadata = {
  title: "Métricas — BOC Canarias Web",
  description: "Métricas de cobertura del corpus histórico del Boletín Oficial de Canarias: descarga y extracción por año.",
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
        title="Métricas de cobertura"
      />

      <div className="mx-auto max-w-7xl px-6 py-8">
        <p className="mb-8 text-zinc-600 dark:text-zinc-400">
          Porcentaje del corpus histórico del BOC disponible en la base de datos.
          Consulta la{" "}
          <Link href="/metodologia" className="font-medium text-accent underline-offset-4 hover:underline dark:text-accent-light">
            metodología
          </Link>{" "}
          para más detalles sobre el proceso de obtención de datos.
        </p>

        {/* KPIs */}
        <section className="mb-10">
          <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">Resumen general</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <MetricKPI
              label="Años descargados"
              value={report.downloads.years.percentage}
              detail={`${report.downloads.years.downloaded} de ${report.downloads.years.total}`}
            />
            <MetricKPI
              label="Boletines descargados"
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
              label="Texto completo extraído"
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
