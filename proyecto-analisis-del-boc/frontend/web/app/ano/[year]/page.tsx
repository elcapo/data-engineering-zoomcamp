import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { BulletinRepository } from "@/lib/db/repositories/bulletins";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/Badge";
import { BulletinCard } from "@/components/bulletin/BulletinCard";

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
        </header>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {bulletins.map((b) => (
            <BulletinCard key={b.issue} bulletin={b} />
          ))}
        </div>
      </div>
    </>
  );
}
