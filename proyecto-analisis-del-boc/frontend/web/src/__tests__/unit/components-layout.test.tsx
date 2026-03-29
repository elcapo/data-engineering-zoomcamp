import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "@/components/layout/Sidebar";
import { PageHeader } from "@/components/layout/PageHeader";
import { MarkdownPage } from "@/components/MarkdownPage";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock next/image
vi.mock("next/image", () => ({
  default: ({ alt, ...props }: { alt: string; [key: string]: unknown }) => (
    <img alt={alt} {...props} />
  ),
}));

// Mock next/navigation
vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("Sidebar", () => {
  const noop = () => {};

  it("renderiza los enlaces de navegación principales (expandido)", () => {
    render(<Sidebar collapsed={false} onToggleCollapse={noop} />);
    expect(screen.getByText("Inicio").closest("a")).toHaveAttribute("href", "/");
    expect(screen.getByText("Buscar").closest("a")).toHaveAttribute("href", "/buscar");
    expect(screen.getByText("Métricas").closest("a")).toHaveAttribute("href", "/metricas");
  });

  it("renderiza los enlaces informativos", () => {
    render(<Sidebar collapsed={false} onToggleCollapse={noop} />);
    expect(screen.getByText("Metodología").closest("a")).toHaveAttribute("href", "/metodologia");
    expect(screen.getByText("Sobre el proyecto").closest("a")).toHaveAttribute("href", "/sobre-el-proyecto");
    expect(screen.getByText("Aviso legal").closest("a")).toHaveAttribute("href", "/aviso-legal");
  });

  it("oculta los labels cuando está colapsado", () => {
    render(<Sidebar collapsed={true} onToggleCollapse={noop} />);
    expect(screen.queryByText("Inicio")).not.toBeInTheDocument();
    expect(screen.queryByText("Buscar")).not.toBeInTheDocument();
  });

  it("muestra el logo bocana con wording cuando está expandido", () => {
    render(<Sidebar collapsed={false} onToggleCollapse={noop} />);
    const img = screen.getByAltText("bocana");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/bocana-logo-wording.svg");
  });

  it("muestra solo el icono cuando está colapsado", () => {
    render(<Sidebar collapsed={true} onToggleCollapse={noop} />);
    const img = screen.getByAltText("bocana");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "/bocana-logo.svg");
  });
});

describe("PageHeader", () => {
  it("renderiza el título", () => {
    render(<PageHeader title="Métricas" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Métricas");
  });

  it("renderiza migas de pan con enlaces", () => {
    render(
      <PageHeader
        breadcrumbs={[
          { label: "Inicio", href: "/" },
          { label: "Métricas" },
        ]}
        title="Métricas de cobertura"
      />
    );
    expect(screen.getByText("Inicio")).toHaveAttribute("href", "/");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Métricas de cobertura");
  });

  it("renderiza acciones opcionales", () => {
    render(
      <PageHeader title="Test" actions={<button>Acción</button>} />
    );
    expect(screen.getByText("Acción")).toBeInTheDocument();
  });

  it("no renderiza migas si no se proporcionan", () => {
    render(<PageHeader title="Inicio" />);
    expect(screen.queryByLabelText("Migas")).not.toBeInTheDocument();
  });
});

describe("MarkdownPage", () => {
  it("renderiza contenido HTML", () => {
    render(<MarkdownPage html="<p>Párrafo de prueba</p>" />);
    expect(screen.getByText("Párrafo de prueba")).toBeInTheDocument();
  });

  it("renderiza título cuando se proporciona", () => {
    render(<MarkdownPage title="Test" html="<p>Contenido</p>" />);
    expect(screen.getByText("Test")).toBeInTheDocument();
    expect(screen.getByText("Contenido")).toBeInTheDocument();
  });

  it("no renderiza h1 cuando no hay título", () => {
    const { container } = render(<MarkdownPage html="<p>Solo contenido</p>" />);
    expect(container.querySelector("h1")).not.toBeInTheDocument();
  });

  it("renderiza HTML real, no texto escapado", () => {
    const { container } = render(<MarkdownPage html="<strong>Negrita</strong>" />);
    expect(container.querySelector("strong")).toBeInTheDocument();
  });

  it("envuelve el contenido en una tarjeta", () => {
    const { container } = render(<MarkdownPage html="<p>Contenido</p>" />);
    expect(container.querySelector(".rounded-lg.bg-white")).toBeInTheDocument();
  });
});
