import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { remark } from "remark";
import remarkHtml from "remark-html";
import yaml from "js-yaml";

// Raíz del directorio content/ (relativa a la raíz del proyecto)
const CONTENT_DIR = path.join(process.cwd(), "content");

// ── Páginas Markdown ──────────────────────────────────────────────────────

export interface MarkdownPage {
  slug: string;
  title: string;
  description: string;
  html: string;
}

/**
 * Lee content/pages/<slug>.md, parsea frontmatter y convierte el cuerpo a HTML.
 * Devuelve null si el fichero no existe.
 */
export async function readMarkdownPage(slug: string): Promise<MarkdownPage | null> {
  const filePath = path.join(CONTENT_DIR, "pages", `${slug}.md`);

  if (!fs.existsSync(filePath)) return null;

  const raw = fs.readFileSync(filePath, "utf-8");
  const { data, content } = matter(raw);

  const result = await remark().use(remarkHtml).process(content);

  return {
    slug,
    title: (data.title as string) ?? slug,
    description: (data.description as string) ?? "",
    html: result.toString(),
  };
}

/**
 * Lista los slugs disponibles en content/pages/.
 */
export function listPageSlugs(): string[] {
  const pagesDir = path.join(CONTENT_DIR, "pages");
  if (!fs.existsSync(pagesDir)) return [];

  return fs
    .readdirSync(pagesDir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => f.replace(/\.md$/, ""));
}

// ── Artículos destacados (editorial) ──────────────────────────────────────

export interface FeaturedArticle {
  slug: string;
  title: string;
  excerpt: string;
  link: string;
  order: number;
}

/**
 * Lee los ficheros Markdown de content/home/<source>/ y devuelve los artículos
 * ordenados por el campo `order` del frontmatter.
 */
export function readFeaturedArticles(source: string): FeaturedArticle[] {
  const dir = path.join(CONTENT_DIR, "home", source);
  if (!fs.existsSync(dir)) return [];

  return fs
    .readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .map((f) => {
      const raw = fs.readFileSync(path.join(dir, f), "utf-8");
      const { data } = matter(raw);
      return {
        slug: f.replace(/\.md$/, ""),
        title: (data.title as string) ?? "",
        excerpt: (data.excerpt as string) ?? "",
        link: (data.link as string) ?? "",
        order: (data.order as number) ?? 0,
      };
    })
    .sort((a, b) => a.order - b.order);
}

// ── Configuración de la Home ──────────────────────────────────────────────

export interface HomeSection {
  type: string;
  title: string;
  limit?: number;
  source?: string;
}

export interface HomeSectionsConfig {
  sections: HomeSection[];
}

/**
 * Lee y parsea content/home/sections.yaml.
 * Devuelve un objeto con el array de secciones configuradas.
 */
export function readSectionsConfig(): HomeSectionsConfig {
  const filePath = path.join(CONTENT_DIR, "home", "sections.yaml");
  const raw = fs.readFileSync(filePath, "utf-8");
  return yaml.load(raw) as HomeSectionsConfig;
}
