import { describe, it, expect } from "vitest";
import {
  readMarkdownPage,
  readSectionsConfig,
  listPageSlugs,
} from "@/lib/content/markdown";

describe("readMarkdownPage", () => {
  it("lee aviso-legal.md y devuelve título, descripción y HTML", async () => {
    const page = await readMarkdownPage("aviso-legal");
    expect(page).not.toBeNull();
    expect(page!.slug).toBe("aviso-legal");
    expect(page!.title).toBe("Aviso Legal");
    expect(page!.description).toContain("Términos legales");
    expect(page!.html).toContain("<h2>");
    expect(page!.html).toContain("Autoría y Derechos");
  });

  it("lee metodologia.md y convierte Markdown a HTML", async () => {
    const page = await readMarkdownPage("metodologia");
    expect(page).not.toBeNull();
    expect(page!.title).toBe("Metodología y Fuentes");
    expect(page!.html).toContain("<ol>");
    expect(page!.html).toContain("<strong>Descarga</strong>");
  });

  it("lee sobre-el-proyecto.md", async () => {
    const page = await readMarkdownPage("sobre-el-proyecto");
    expect(page).not.toBeNull();
    expect(page!.title).toBe("Sobre el Proyecto");
    expect(page!.html).toContain("BOC Canarias Web");
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
    expect(first.limit).toBe(5);
  });

  it("la segunda sección es editorial con source", () => {
    const config = readSectionsConfig();
    const second = config.sections[1];
    expect(second.type).toBe("editorial");
    expect(second.source).toBe("featured");
  });
});
