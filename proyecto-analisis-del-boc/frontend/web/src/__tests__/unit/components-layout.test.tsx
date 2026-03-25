import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { MarkdownPage } from "@/components/MarkdownPage";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

describe("Nav", () => {
  it("renderiza los enlaces de navegación principales", () => {
    render(<Nav />);
    expect(screen.getByText("Inicio")).toHaveAttribute("href", "/");
    expect(screen.getByText("Buscar")).toHaveAttribute("href", "/buscar");
    expect(screen.getByText("Métricas")).toHaveAttribute("href", "/metricas");
    expect(screen.getByText("Metodología")).toHaveAttribute("href", "/metodologia");
  });
});

describe("Footer", () => {
  it("incluye enlaces legales", () => {
    render(<Footer />);
    expect(screen.getByText("Aviso legal")).toHaveAttribute("href", "/aviso-legal");
    expect(screen.getByText("Sobre el proyecto")).toHaveAttribute("href", "/sobre-el-proyecto");
  });

  it("menciona al Gobierno de Canarias", () => {
    render(<Footer />);
    expect(screen.getByText(/Gobierno de Canarias/)).toBeInTheDocument();
  });
});

describe("MarkdownPage", () => {
  it("renderiza título y contenido HTML", () => {
    render(<MarkdownPage title="Test" html="<p>Párrafo de prueba</p>" />);
    expect(screen.getByText("Test")).toBeInTheDocument();
    expect(screen.getByText("Párrafo de prueba")).toBeInTheDocument();
  });

  it("renderiza HTML real, no texto escapado", () => {
    const { container } = render(<MarkdownPage title="T" html="<strong>Negrita</strong>" />);
    expect(container.querySelector("strong")).toBeInTheDocument();
  });
});
