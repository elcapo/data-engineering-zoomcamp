import type { Metadata } from "next";
import Link from "next/link";
import { MetricsRepository } from "@/lib/db/repositories/metrics";
import { MetricKPI } from "@/components/metrics/MetricKPI";
import { ArchiveSection } from "@/components/metrics/ArchiveSection";
import { BulletinSection } from "@/components/metrics/BulletinSection";
import { DispositionSection } from "@/components/metrics/DispositionSection";

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
    <div className="mx-auto max-w-7xl px-4 py-10">
      <p className="mb-1 text-sm text-zinc-500 dark:text-zinc-400">Inicio &gt; Métricas</p>
      <h1 className="mb-2 text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
        Métricas de cobertura
      </h1>
      <p className="mb-8 text-zinc-600 dark:text-zinc-400">
        Porcentaje del corpus histórico del BOC disponible en la base de datos.
        Consulta la{" "}
        <Link href="/metodologia" className="font-medium text-accent hover:underline underline-offset-4 dark:text-accent-light">
          metodología
        </Link>{" "}
        para más detalles sobre el proceso de obtención de datos.
      </p>

      {/* KPIs */}
      <section className="mb-12">
        <h2 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-zinc-100">Resumen general</h2>
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
  );
}
