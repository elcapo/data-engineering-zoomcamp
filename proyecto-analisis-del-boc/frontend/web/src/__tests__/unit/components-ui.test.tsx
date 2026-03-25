import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { MetricBar } from "@/components/ui/MetricBar";

describe("Card", () => {
  it("renderiza hijos dentro de un div por defecto", () => {
    render(<Card>Contenido</Card>);
    expect(screen.getByText("Contenido")).toBeInTheDocument();
  });

  it("puede renderizarse como article", () => {
    const { container } = render(<Card as="article">Test</Card>);
    expect(container.querySelector("article")).toBeInTheDocument();
  });
});

describe("Badge", () => {
  it("muestra el texto del badge", () => {
    render(<Badge>Sección I</Badge>);
    expect(screen.getByText("Sección I")).toBeInTheDocument();
  });

  it("aplica la variante green", () => {
    render(<Badge variant="green">OK</Badge>);
    const el = screen.getByText("OK");
    expect(el.className).toContain("emerald");
  });
});

describe("Button", () => {
  it("renderiza como botón con texto", () => {
    render(<Button>Enviar</Button>);
    const btn = screen.getByRole("button", { name: "Enviar" });
    expect(btn).toBeInTheDocument();
  });

  it("puede estar deshabilitado", () => {
    render(<Button disabled>No</Button>);
    expect(screen.getByRole("button")).toBeDisabled();
  });
});

describe("Spinner", () => {
  it("tiene role status y aria-label", () => {
    render(<Spinner />);
    const el = screen.getByRole("status");
    expect(el).toHaveAttribute("aria-label", "Cargando");
  });
});

describe("MetricBar", () => {
  it("muestra label y porcentaje", () => {
    render(<MetricBar percentage={75.3} label="Descarga" />);
    expect(screen.getByText("Descarga")).toBeInTheDocument();
    expect(screen.getByText("75.3%")).toBeInTheDocument();
  });

  it("tiene role progressbar con aria-valuenow", () => {
    render(<MetricBar percentage={50} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "50");
  });

  it("clampea el porcentaje entre 0 y 100", () => {
    render(<MetricBar percentage={150} />);
    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow", "100");
  });
});
