import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { readMarkdownPage } from "@/lib/content/markdown";
import { MarkdownPage } from "@/components/MarkdownPage";

const slugs = ["aviso-legal", "metodologia", "sobre-el-proyecto"] as const;

describe("Páginas estáticas — contenido Markdown", () => {
  it.each(slugs)("el slug '%s' existe y tiene título y descripción", async (slug) => {
    const page = await readMarkdownPage(slug);
    expect(page).not.toBeNull();
    expect(page!.title.length).toBeGreaterThan(0);
    expect(page!.description.length).toBeGreaterThan(0);
  });

  it.each(slugs)("el slug '%s' genera HTML con encabezados h2", async (slug) => {
    const page = await readMarkdownPage(slug);
    expect(page!.html).toContain("<h2>");
  });
});

describe("Páginas estáticas — renderizado con MarkdownPage", () => {
  it("renderiza aviso-legal con contenido clave", async () => {
    const page = await readMarkdownPage("aviso-legal");
    render(<MarkdownPage html={page!.html} />);

    expect(screen.getByText(/iniciativa independiente/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Gobierno de Canarias/).length).toBeGreaterThan(0);
  });

  it("renderiza metodologia con secciones clave", async () => {
    const page = await readMarkdownPage("metodologia");
    render(<MarkdownPage html={page!.html} />);

    expect(screen.getByText(/Descarga de índices/)).toBeInTheDocument();
    expect(screen.getAllByText(/PostgreSQL/).length).toBeGreaterThan(0);
  });

  it("renderiza sobre-el-proyecto con audiencia y principios", async () => {
    const page = await readMarkdownPage("sobre-el-proyecto");
    render(<MarkdownPage html={page!.html} />);

    expect(screen.getByText(/abogado/i)).toBeInTheDocument();
    expect(screen.getByText(/Acceso abierto/)).toBeInTheDocument();
  });

  it("aviso-legal contiene enlace a la web oficial del BOC", async () => {
    const page = await readMarkdownPage("aviso-legal");
    render(<MarkdownPage html={page!.html} />);

    const link = screen.getByRole("link", { name: /Boletín Oficial de Canarias/i });
    expect(link).toHaveAttribute("href", "https://www.gobiernodecanarias.org/boc");
  });

  it("metodologia contiene enlace interno a /metricas", async () => {
    const page = await readMarkdownPage("metodologia");
    render(<MarkdownPage html={page!.html} />);

    const link = screen.getByRole("link", { name: /cobertura/i });
    expect(link).toHaveAttribute("href", "/metricas");
  });

  it("sobre-el-proyecto contiene enlace interno a /metodologia", async () => {
    const page = await readMarkdownPage("sobre-el-proyecto");
    render(<MarkdownPage html={page!.html} />);

    const link = screen.getByRole("link", { name: /metodología/i });
    expect(link).toHaveAttribute("href", "/metodologia");
  });
});
