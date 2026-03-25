import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetricKPI } from "@/components/metrics/MetricKPI";

describe("MetricKPI", () => {
  it("muestra label y valor numérico formateado como porcentaje", () => {
    render(<MetricKPI label="Años descargados" value={88.9} />);
    expect(screen.getByText("88.9%")).toBeInTheDocument();
    expect(screen.getByText("Años descargados")).toBeInTheDocument();
  });

  it("muestra valor string tal cual", () => {
    render(<MetricKPI label="Total" value="1.234" />);
    expect(screen.getByText("1.234")).toBeInTheDocument();
  });

  it("muestra detalle cuando se proporciona", () => {
    render(<MetricKPI label="Test" value={50} detail="40 de 80" />);
    expect(screen.getByText("40 de 80")).toBeInTheDocument();
  });
});
