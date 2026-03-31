import { describe, it, expect } from "vitest";
import {
  readMarkdownPage,
  readSectionsConfig,
  readFeaturedArticles,
  listPageSlugs,
} from "@/lib/content/markdown";

describe("readMarkdownPage", () => {
  it("lee aviso-legal.md y devuelve título, descripción y HTML", async () => {
    const page = await readMarkdownPage("aviso-legal");
    expect(page).not.toBeNull();
    expect(page!.slug).toBe("aviso-legal");
    expect(page!.title).toBe("Aviso Legal");
    expect(page!.description).toContain("autoría");
    expect(page!.html).toContain("<h2>");
    expect(page!.html).toContain("Autoría de los contenidos");
  });

  it("lee metodologia.md y convierte Markdown a HTML", async () => {
    const page = await readMarkdownPage("metodologia");
    expect(page).not.toBeNull();
    expect(page!.title).toBe("Metodología y Fuentes");
    expect(page!.html).toContain("<ol>");
    expect(page!.html).toContain("<strong>Descarga de índices</strong>");
  });

  it("lee sobre-el-proyecto.md", async () => {
    const page = await readMarkdownPage("sobre-el-proyecto");
    expect(page).not.toBeNull();
    expect(page!.title).toBe("Sobre el proyecto");
    expect(page!.html).toContain("bocana");
  });

  it("devuelve null para un slug inexistente", async () => {
    const page = await readMarkdownPage("no-existe");
    expect(page).toBeNull();
  });
});

describe("listPageSlugs", () => {
  it("devuelve los tres slugs de páginas creadas", () => {
    const slugs = listPageSlugs();
    expect(slugs).toContain("aviso-legal");
    expect(slugs).toContain("metodologia");
    expect(slugs).toContain("sobre-el-proyecto");
  });

  it("los slugs no incluyen la extensión .md", () => {
    const slugs = listPageSlugs();
    for (const slug of slugs) {
      expect(slug).not.toContain(".md");
    }
  });
});

describe("readSectionsConfig", () => {
  it("lee sections.yaml y devuelve el array de secciones", () => {
    const config = readSectionsConfig();
    expect(config.sections).toBeDefined();
    expect(config.sections.length).toBeGreaterThan(0);
  });

  it("la primera sección es latest-bulletins con limit", () => {
    const config = readSectionsConfig();
    const first = config.sections[0];
    expect(first.type).toBe("latest-bulletins");
    expect(first.title).toBe("Últimos boletines");
    expect(first.limit).toBe(12);
  });

  it("solo hay una sección configurada", () => {
    const config = readSectionsConfig();
    expect(config.sections.length).toBe(1);
  });
});

describe("readFeaturedArticles", () => {
  it("lee los artículos de content/home/featured/", () => {
    const articles = readFeaturedArticles("featured");
    expect(articles.length).toBeGreaterThan(0);
  });

  it("cada artículo tiene título, excerpt y link", () => {
    const [article] = readFeaturedArticles("featured");
    expect(article.title).toBeTruthy();
    expect(article.excerpt).toBeTruthy();
    expect(article.link).toBeTruthy();
  });

  it("los artículos están ordenados por order", () => {
    const articles = readFeaturedArticles("featured");
    for (let i = 1; i < articles.length; i++) {
      expect(articles[i].order).toBeGreaterThanOrEqual(articles[i - 1].order);
    }
  });

  it("devuelve array vacío para un source inexistente", () => {
    const articles = readFeaturedArticles("no-existe");
    expect(articles).toEqual([]);
  });
});
