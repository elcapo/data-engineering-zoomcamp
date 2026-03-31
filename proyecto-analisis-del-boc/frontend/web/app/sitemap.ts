import type { MetadataRoute } from "next";
import { SitemapRepository } from "@/lib/db/repositories/sitemap";

const BASE_URL = process.env.SITE_URL ?? "https://bocana.org";

/**
 * Genera un sitemap index: id=0 para páginas estáticas + boletines,
 * y un sitemap por cada año para las disposiciones.
 */
export async function generateSitemaps() {
  const years = await SitemapRepository.getYears();

  // id 0 = estáticas + años + boletines
  // id N = disposiciones del año N
  return [
    { id: 0 },
    ...years.map((y) => ({ id: y.year })),
  ];
}

export default async function sitemap({
  id,
}: {
  id: number;
}): Promise<MetadataRoute.Sitemap> {
  if (id === 0) {
    return await buildStaticAndBulletinsSitemap();
  }
  return await buildDispositionsSitemap(id);
}

async function buildStaticAndBulletinsSitemap(): Promise<MetadataRoute.Sitemap> {
  const [years, bulletins] = await Promise.all([
    SitemapRepository.getYears(),
    SitemapRepository.getBulletins(),
  ]);

  const entries: MetadataRoute.Sitemap = [
    // Páginas estáticas
    { url: BASE_URL, changeFrequency: "daily", priority: 1.0 },
    { url: `${BASE_URL}/metricas`, changeFrequency: "weekly", priority: 0.6 },
    { url: `${BASE_URL}/metodologia`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE_URL}/sobre-el-proyecto`, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE_URL}/aviso-legal`, changeFrequency: "yearly", priority: 0.2 },
    // Años
    ...years.map((y) => ({
      url: `${BASE_URL}/ano/${y.year}`,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
    // Boletines
    ...bulletins.map((b) => ({
      url: `${BASE_URL}/boletin/${b.year}/${b.issue}`,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
  ];

  return entries;
}

async function buildDispositionsSitemap(
  year: number
): Promise<MetadataRoute.Sitemap> {
  const dispositions = await SitemapRepository.getDispositionsByYear(year);

  return dispositions.map((d) => ({
    url: `${BASE_URL}/disposicion/${d.year}/${d.issue}/${d.number}`,
    changeFrequency: "yearly" as const,
    priority: 0.5,
  }));
}
