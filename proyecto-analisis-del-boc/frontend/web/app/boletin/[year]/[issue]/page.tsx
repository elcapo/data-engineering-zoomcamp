import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BulletinRepository } from "@/lib/db/repositories/bulletins";
import { DispositionRepository } from "@/lib/db/repositories/dispositions";
import { PageHeader } from "@/components/layout/PageHeader";
import { DispositionCard } from "@/components/bulletin/DispositionCard";
import { Badge } from "@/components/ui/Badge";
import { SectionIcon } from "@/components/ui/SectionIcon";
import { formatNumber } from "@/lib/format";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ year: string; issue: string }>;
}

async function getData(params: PageProps["params"]) {
  const { year, issue } = await params;
  const y = parseInt(year, 10);
  const i = parseInt(issue, 10);
  if (isNaN(y) || isNaN(i)) return null;

  const [bulletin, dispositions] = await Promise.all([
    BulletinRepository.findByYearAndIssue(y, i),
    DispositionRepository.findByBulletin(y, i),
  ]);

  return bulletin ? { bulletin, dispositions } : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getData(params);
  if (!data) return {};

  const { bulletin } = data;
  return {
    title: `BOC N\u00ba ${bulletin.issue}/${bulletin.year} — BOC Canarias Web`,
    description: `Listado de las ${bulletin.dispositionCount} disposiciones del Bolet\u00edn Oficial de Canarias N\u00ba ${bulletin.issue} del a\u00f1o ${bulletin.year}.`,
  };
}

export default async function BoletinPage({ params }: PageProps) {
  const data = await getData(params);
  if (!data) notFound();

  const { bulletin, dispositions } = data;

  // Group dispositions by section
  const bySection = new Map<string, typeof dispositions>();
  for (const d of dispositions) {
    const key = d.section || "Sin secci\u00f3n";
    const list = bySection.get(key) ?? [];
    list.push(d);
    bySection.set(key, list);
  }

  // Count by organization
  const orgCounts = new Map<string, number>();
  for (const d of dispositions) {
    const key = d.organization || "Sin organismo";
    orgCounts.set(key, (orgCounts.get(key) ?? 0) + 1);
  }
  const orgEntries = Array.from(orgCounts.entries())
    .sort((a, b) => b[1] - a[1]);

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: String(bulletin.year), href: `/ano/${bulletin.year}` },
        ]}
        title={`Boletín ${bulletin.year}/${String(bulletin.issue).padStart(3, "0")}`}
      />

      <div className="px-4 py-8 sm:px-6 lg:px-8">
        {/* 1. Date + external links */}
        <header className="mb-8">
          {bulletin.date && (
            <p className="mb-3 text-zinc-600 dark:text-zinc-400">{bulletin.date}</p>
          )}

          <div className="flex flex-wrap gap-3">
            {bulletin.url && (
              <a
                href={bulletin.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-accent/90 dark:bg-accent-light dark:text-zinc-900 dark:hover:bg-accent-light/90"
              >
                Ver en BOC oficial
                <ExternalLinkIcon />
              </a>
            )}
            {bulletin.summaryPdfUrl && (
              <a
                href={bulletin.summaryPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 dark:border-zinc-600 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Sumario PDF
                <ExternalLinkIcon />
              </a>
            )}
          </div>
        </header>

        {/* 2. Dispositions grouped by section */}
        {dispositions.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400">
            No hay disposiciones registradas para este bolet\u00edn.
          </div>
        ) : (
          <div className="space-y-8">
            {Array.from(bySection.entries()).map(([section, items]) => (
              <section key={section} id={`seccion-${encodeURIComponent(section)}`}>
                <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  <SectionIcon className="size-5 text-zinc-400 dark:text-zinc-500" />
                  <Link
                    href={`/buscar?include_section=${encodeURIComponent(section)}`}
                    className="hover:text-accent hover:underline underline-offset-4 dark:hover:text-accent-light"
                  >
                    {section}
                  </Link>
                </h2>
                <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {items.map((d) => (
                    <li key={d.number}>
                      <DispositionCard disposition={d} />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}

        {/* Facet columns: Secciones + Organismos */}
        {dispositions.length > 0 && (
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div>
              <h3 className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">Secciones</h3>
              <div className="flex flex-col gap-2">
                {Array.from(bySection.entries()).map(([section, items]) => (
                  <a
                    key={section}
                    href={`#seccion-${encodeURIComponent(section)}`}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-left transition-colors hover:border-accent/30 hover:bg-accent-muted/30 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-accent/30 dark:hover:bg-accent-muted/10"
                  >
                    <span className="text-sm text-zinc-800 dark:text-zinc-200">{section}</span>
                    <span className="ml-3 shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {formatNumber(items.length)}
                    </span>
                  </a>
                ))}
              </div>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-medium text-zinc-600 dark:text-zinc-400">Organismos</h3>
              <div className="flex flex-col gap-2">
                {orgEntries.map(([org, count]) => (
                  <Link
                    key={org}
                    href={`/buscar?include_org=${encodeURIComponent(org)}`}
                    className="flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-2.5 text-left transition-colors hover:border-accent/30 hover:bg-accent-muted/30 dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-accent/30 dark:hover:bg-accent-muted/10"
                  >
                    <span className="text-sm text-zinc-800 dark:text-zinc-200">{org}</span>
                    <span className="ml-3 shrink-0 rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium tabular-nums text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400">
                      {formatNumber(count)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Back link */}
        <nav className="mt-8 border-t border-zinc-200 pt-6 dark:border-zinc-700">
          <Link
            href={`/ano/${bulletin.year}`}
            className="text-sm font-medium text-accent hover:underline underline-offset-4 dark:text-accent-light"
          >
            &larr; Todos los boletines de {bulletin.year}
          </Link>
        </nav>
      </div>
    </>
  );
}

function ExternalLinkIcon() {
  return (
    <svg
      className="h-3.5 w-3.5"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
      />
    </svg>
  );
}
