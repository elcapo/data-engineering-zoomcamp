import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BulletinRepository } from "@/lib/db/repositories/bulletins";
import { DispositionRepository } from "@/lib/db/repositories/dispositions";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { SectionBreadcrumb } from "@/components/bulletin/SectionBreadcrumb";

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

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: String(bulletin.year), href: `/ano/${bulletin.year}` },
        ]}
        title={`BOC N\u00ba ${bulletin.issue}/${bulletin.year}`}
      />

      <div className="px-4 py-8 sm:px-6 lg:px-8">
        {/* Bulletin header */}
        <header className="mb-8">
          {bulletin.date && (
            <p className="text-sm text-zinc-500 dark:text-zinc-400">{bulletin.date}</p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Badge variant="accent">{bulletin.dispositionCount} disposiciones</Badge>
            {bulletin.sectionCounts.map((sc) => (
              <Badge key={sc.section}>{sc.section} ({sc.count})</Badge>
            ))}
          </div>

          <div className="mt-4 flex flex-wrap gap-3">
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

        {/* Dispositions grouped by section */}
        {dispositions.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-800/50 dark:text-zinc-400">
            No hay disposiciones registradas para este bolet\u00edn.
          </div>
        ) : (
          <div className="space-y-8">
            {Array.from(bySection.entries()).map(([section, items]) => (
              <section key={section}>
                <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                  {section}
                  <span className="ml-2 text-sm font-normal text-zinc-400">({items.length})</span>
                </h2>
                <ul className="space-y-3">
                  {items.map((d) => (
                    <li key={d.number}>
                      <Link
                        href={`/disposicion/${d.year}/${d.issue}/${d.number}`}
                        className="group block rounded-lg border border-zinc-200 p-4 transition-colors hover:border-accent/30 dark:border-zinc-700 dark:hover:border-accent/30"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <SectionBreadcrumb
                              section={d.section}
                              subsection={d.subsection}
                              organization={d.organization}
                            />
                            <h3 className="mt-1 font-medium text-zinc-900 group-hover:text-accent dark:text-zinc-100 dark:group-hover:text-accent-light">
                              {d.title || "Sin t\u00edtulo"}
                            </h3>
                            <div className="mt-1 flex flex-wrap gap-x-4 text-sm text-zinc-500 dark:text-zinc-400">
                              {d.date && <span>{d.date}</span>}
                              {d.identifier && <span>{d.identifier}</span>}
                            </div>
                          </div>
                          <span className="shrink-0 text-sm text-zinc-400 dark:text-zinc-500">
                            #{d.number}
                          </span>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
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
