import { readSectionsConfig, readFeaturedArticles } from "@/lib/content/markdown";
import { BulletinRepository } from "@/lib/db/repositories/bulletins";
import { FiltersRepository } from "@/lib/db/repositories/filters";
import { SearchBar } from "@/components/search/SearchBar";
import { BulletinCard } from "@/components/bulletin/BulletinCard";
import { EditorialCard } from "@/components/bulletin/EditorialCard";
import { DistributionCharts } from "@/components/home/DistributionCharts";
import { PageHeader } from "@/components/layout/PageHeader";

export const dynamic = "force-dynamic";

const TOP_LIMIT = 8;

export default async function Home() {
  const config = readSectionsConfig();
  const [sectionData, orgData] = await Promise.all([
    FiltersRepository.getTopSections(TOP_LIMIT),
    FiltersRepository.getTopOrganizations(TOP_LIMIT),
  ]);

  return (
    <>
      <PageHeader breadcrumbs={[{ label: "Inicio" }]} title="Bocana" />

      <div className="px-4 py-8 sm:px-6 lg:px-8">
        {/* Distribution charts */}
        <DistributionCharts
          sections={sectionData.top}
          sectionTotal={sectionData.total}
          organizations={orgData.top}
          orgTotal={orgData.total}
        />

        {/* Secciones dinámicas desde sections.yaml */}
        {config.sections.map((section, i) => (
          <Section key={i} type={section.type} title={section.title} limit={section.limit} source={section.source} />
        ))}

        {/* Barra de búsqueda */}
        <section className="mt-10 rounded-lg bg-white p-6 shadow-sm dark:bg-zinc-800 sm:p-8">
          <h2 className="mb-2 text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Buscar disposiciones
          </h2>
          <p className="mb-5 text-zinc-600 dark:text-zinc-400">
            Consulta el Boletín Oficial de Canarias con búsqueda avanzada
          </p>
          <SearchBar className="max-w-lg" />
        </section>
      </div>
    </>
  );
}

async function Section({ type, title, limit, source }: { type: string; title: string; limit?: number; source?: string }) {
  switch (type) {
    case "latest-bulletins":
      return <LatestBulletins title={title} limit={limit ?? 5} />;
    case "editorial":
      return <Editorial title={title} source={source ?? "featured"} />;
    default:
      return null;
  }
}

async function LatestBulletins({ title, limit }: { title: string; limit: number }) {
  const bulletins = await BulletinRepository.findRecent(limit);

  if (bulletins.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {bulletins.map((b) => (
          <BulletinCard key={`${b.year}-${b.issue}`} bulletin={b} />
        ))}
      </div>
    </section>
  );
}

function Editorial({ title, source }: { title: string; source: string }) {
  const articles = readFeaturedArticles(source);

  if (articles.length === 0) return null;

  return (
    <section className="mb-8">
      <h2 className="mb-4 text-lg font-semibold text-zinc-900 dark:text-zinc-100">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <EditorialCard key={a.slug} title={a.title} excerpt={a.excerpt} link={a.link} />
        ))}
      </div>
    </section>
  );
}
