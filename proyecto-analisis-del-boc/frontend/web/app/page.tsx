import { readSectionsConfig, readFeaturedArticles } from "@/lib/content/markdown";
import { BulletinRepository } from "@/lib/db/repositories/bulletins";
import { SearchBar } from "@/components/search/SearchBar";
import { BulletinCard } from "@/components/bulletin/BulletinCard";
import { EditorialCard } from "@/components/bulletin/EditorialCard";

export default async function Home() {
  const config = readSectionsConfig();

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      {/* Hero con barra de búsqueda */}
      <section className="mb-12 text-center">
        <h1 className="mb-2 text-3xl font-bold text-zinc-900 dark:text-zinc-100">
          BOC Canarias Web
        </h1>
        <p className="mb-6 text-zinc-600 dark:text-zinc-400">
          Consulta el Boletín Oficial de Canarias con búsqueda avanzada
        </p>
        <SearchBar className="mx-auto max-w-lg" />
      </section>

      {/* Secciones dinámicas desde sections.yaml */}
      {config.sections.map((section, i) => (
        <Section key={i} type={section.type} title={section.title} limit={section.limit} source={section.source} />
      ))}
    </div>
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
    <section className="mb-10">
      <h2 className="mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-100">{title}</h2>
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
    <section className="mb-10">
      <h2 className="mb-4 text-xl font-bold text-zinc-900 dark:text-zinc-100">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {articles.map((a) => (
          <EditorialCard key={a.slug} title={a.title} excerpt={a.excerpt} link={a.link} />
        ))}
      </div>
    </section>
  );
}
