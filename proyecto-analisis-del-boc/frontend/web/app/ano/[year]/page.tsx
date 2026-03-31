import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { BulletinRepository } from "@/lib/db/repositories/bulletins";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ year: string }>;
}

async function getBulletins(params: PageProps["params"]) {
  const { year } = await params;
  const y = parseInt(year, 10);
  if (isNaN(y)) return null;

  const bulletins = await BulletinRepository.findByYear(y);
  return bulletins.length > 0 ? { year: y, bulletins } : null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getBulletins(params);
  if (!data) return {};

  return {
    title: `Boletines de ${data.year} — BOC Canarias Web`,
    description: `Listado de los ${data.bulletins.length} boletines del Bolet\u00edn Oficial de Canarias publicados en ${data.year}.`,
  };
}

export default async function YearPage({ params }: PageProps) {
  const data = await getBulletins(params);
  if (!data) notFound();

  const { year, bulletins } = data;
  const totalDispositions = bulletins.reduce((s, b) => s + b.dispositionCount, 0);

  return (
    <>
      <PageHeader
        breadcrumbs={[{ label: "Inicio", href: "/" }]}
        title={`Boletines de ${year}`}
      />

      <div className="px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-wrap items-center gap-3">
          <Badge variant="accent">{bulletins.length} boletines</Badge>
          <Badge>{totalDispositions.toLocaleString("es-ES")} disposiciones</Badge>
        </header>

        <ul className="space-y-3">
          {bulletins.map((b) => (
            <li key={b.issue}>
              <Link
                href={`/boletin/${b.year}/${b.issue}`}
                className="group block rounded-lg border border-zinc-200 p-4 transition-colors hover:border-accent/30 dark:border-zinc-700 dark:hover:border-accent/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-semibold text-zinc-900 group-hover:text-accent dark:text-zinc-100 dark:group-hover:text-accent-light">
                      BOC N&ordm; {b.issue}
                    </h2>
                    {b.date && (
                      <p className="mt-0.5 text-sm text-zinc-500 dark:text-zinc-400">{b.date}</p>
                    )}
                    {b.sectionCounts.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {b.sectionCounts.map((sc) => (
                          <Badge key={sc.section}>{sc.section} ({sc.count})</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <Badge variant="accent">{b.dispositionCount} disp.</Badge>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}
