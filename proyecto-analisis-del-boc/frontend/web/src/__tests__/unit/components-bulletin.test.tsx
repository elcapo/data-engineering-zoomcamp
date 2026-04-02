import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BulletinCard } from "@/components/bulletin/BulletinCard";
import { DispositionCard } from "@/components/bulletin/DispositionCard";
import { EditorialCard } from "@/components/bulletin/EditorialCard";
import { SectionBreadcrumb } from "@/components/bulletin/SectionBreadcrumb";
import type { Bulletin, Disposition } from "@/types/domain";

// Mock next/link para tests
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const bulletin: Bulletin = {
  year: 2024,
  issue: 100,
  title: "BOC Nº 100 - Lunes 1 de enero de 2024",
  date: "1 de enero de 2024",
  url: "https://boc.example.com/100",
  summaryPdfUrl: "",
  dispositionCount: 15,
  sectionCounts: [
    { section: "I", count: 5 },
    { section: "II", count: 10 },
  ],
};

const disposition: Disposition = {
  year: 2024,
  issue: 100,
  disposition: "3",
  section: "I",
  subsection: "Disposiciones generales",
  organization: "Consejería de Educación",
  title: "Convocatoria de becas",
  date: "2024-01-15",
  pdfUrl: "https://boc.example.com/pdf/3",
  htmlUrl: "https://sede.gobiernodecanarias.org/boc/boc-a-2024-100-3.xsign",
  excerpt: "Se convoca <mark>beca</mark> para estudiantes",
};

describe("SectionBreadcrumb", () => {
  it("muestra sección, subsección y organización separados", () => {
    render(<SectionBreadcrumb section="I" subsection="General" organization="Consejería" />);
    expect(screen.getByText("I")).toBeInTheDocument();
    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Consejería")).toBeInTheDocument();
  });

  it("omite partes vacías", () => {
    const { container } = render(<SectionBreadcrumb section="I" />);
    expect(container.textContent).toBe("I");
  });
});

describe("BulletinCard", () => {
  it("muestra título del boletín y fecha", () => {
    render(<BulletinCard bulletin={bulletin} />);
    expect(screen.getByText(/Boletín 2024\/100/)).toBeInTheDocument();
    expect(screen.getByText("1 de enero de 2024")).toBeInTheDocument();
  });

  it("muestra conteo de disposiciones", () => {
    render(<BulletinCard bulletin={bulletin} />);
    expect(screen.getByText("15 disposiciones")).toBeInTheDocument();
  });

  it("el bloque superior enlaza a la página de detalle del boletín", () => {
    render(<BulletinCard bulletin={bulletin} />);
    const link = screen.getByText(/Boletín 2024\/100/).closest("a");
    expect(link).toHaveAttribute("href", "/boletin/2024/100");
  });

  it("incluye enlace al BOC oficial en el pie", () => {
    render(<BulletinCard bulletin={bulletin} />);
    const link = screen.getByText("BOC oficial");
    expect(link).toHaveAttribute("href", "https://boc.example.com/100");
    expect(link).toHaveAttribute("target", "_blank");
  });
});

describe("DispositionCard", () => {
  it("muestra título, identificador y organización", () => {
    render(<DispositionCard disposition={disposition} />);
    expect(screen.getByText("Convocatoria de becas")).toBeInTheDocument();
    expect(screen.getByText("BOC 2024/100/3")).toBeInTheDocument();
    expect(screen.getByText("Consejería de Educación")).toBeInTheDocument();
  });

  it("el bloque superior enlaza a la página de detalle", () => {
    render(<DispositionCard disposition={disposition} />);
    const link = screen.getByText("Convocatoria de becas").closest("a");
    expect(link).toHaveAttribute("href", "/disposicion/2024/100/3");
  });

  it("incluye enlace al BOC oficial en el pie", () => {
    render(<DispositionCard disposition={disposition} />);
    const link = screen.getByText("BOC oficial");
    expect(link).toHaveAttribute("href", "https://sede.gobiernodecanarias.org/boc/boc-a-2024-100-3.xsign");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("incluye enlace al PDF en el pie", () => {
    render(<DispositionCard disposition={disposition} />);
    const link = screen.getByText("PDF oficial");
    expect(link).toHaveAttribute("href", "https://boc.example.com/pdf/3");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("no muestra pie si no hay enlaces externos", () => {
    const withoutLinks = { ...disposition, htmlUrl: undefined, pdfUrl: "" };
    render(<DispositionCard disposition={withoutLinks} />);
    expect(screen.queryByText("BOC oficial")).not.toBeInTheDocument();
    expect(screen.queryByText("PDF oficial")).not.toBeInTheDocument();
  });
});

describe("EditorialCard", () => {
  it("muestra título, extracto y enlace", () => {
    render(<EditorialCard title="Artículo" excerpt="Resumen del artículo" link="/art" />);
    expect(screen.getByText("Artículo")).toBeInTheDocument();
    expect(screen.getByText("Resumen del artículo")).toBeInTheDocument();
    expect(screen.getByText("Leer más")).toHaveAttribute("href", "/art");
  });
});
