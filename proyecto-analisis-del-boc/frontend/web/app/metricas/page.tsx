import type { Metadata } from "next";
import Link from "next/link";
import { MetricsRepository } from "@/lib/db/repositories/metrics";
import { MetricKPI } from "@/components/metrics/MetricKPI";
import { BarChart } from "@/components/metrics/BarChart";
import { ComparisonChart } from "@/components/metrics/ComparisonChart";
import { YearDetailTable } from "@/components/metrics/YearDetailTable";

export const metadata: Metadata = {
  title: "Métricas — BOC Canarias Web",
  description: "Métricas de cobertura del corpus histórico del Boletín Oficial de Canarias: descarga y extracción por año.",
};

export default async function MetricasPage() {
  const report = await MetricsRepository.getDataQualityReport();

  const downloadByYear = report.downloads.issues.map((r) => ({
    label: String(r.year),
    value: r.percentage,
  }));

  const comparisonData = report.downloads.issues.map((dl) => {
    const ext = report.extractions.issues.find((e) => e.year === dl.year);
    return {
      label: String(dl.year),
      downloaded: dl.percentage,
      extracted: ext?.percentage ?? 0,
    };
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-bold text-zinc-900 dark:text-zinc-100">
        Métricas de cobertura
      </h1>
      <p className="mb-8 text-zinc-600 dark:text-zinc-400">
        Porcentaje del corpus histórico del BOC disponible en la base de datos.
        Consulta la{" "}
        <Link href="/metodologia" className="font-medium text-blue-600 hover:underline dark:text-blue-400">
          metodología
        </Link>{" "}
        para más detalles sobre el proceso de obtención de datos.
      </p>

      {/* KPIs */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">Resumen general</h2>
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
            value={report.extractions.years.percentage}
            detail={`${report.extractions.years.extracted} de ${report.extractions.years.total}`}
          />
        </div>
      </section>

      {/* Progreso por año */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Progreso de descarga por año
        </h2>
        <BarChart
          data={downloadByYear}
          layout="vertical"
          height={Math.max(300, downloadByYear.length * 28)}
          colorByValue
        />
      </section>

      {/* Detalle expandible por año */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Detalle por año y boletín
        </h2>
        <p className="mb-3 text-sm text-zinc-500 dark:text-zinc-400">
          Haz clic en un año para ver el desglose por boletín.
        </p>
        <YearDetailTable
          years={report.downloads.issues}
          documents={report.downloads.documents}
        />
      </section>

      {/* Comparativa descarga vs extracción */}
      <section className="mb-10">
        <h2 className="mb-4 text-lg font-bold text-zinc-900 dark:text-zinc-100">
          Descarga vs extracción por año
        </h2>
        <ComparisonChart data={comparisonData} height={350} />
      </section>
    </div>
  );
}
