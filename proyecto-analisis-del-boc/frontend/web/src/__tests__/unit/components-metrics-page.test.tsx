import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetricKPI } from "@/components/metrics/MetricKPI";

describe("MetricKPI", () => {
  it("renderiza el label y el porcentaje formateado", () => {
    render(<MetricKPI label="Años" value={88.9} />);
    expect(screen.getByText("Años")).toBeInTheDocument();
    expect(screen.getByText("88.9%")).toBeInTheDocument();
  });

  it("muestra 0.0% para valor cero", () => {
    render(<MetricKPI label="Test" value={0} />);
    expect(screen.getByText("0.0%")).toBeInTheDocument();
  });

  it("muestra 100.0% para valor completo", () => {
    render(<MetricKPI label="Completo" value={100} />);
    expect(screen.getByText("100.0%")).toBeInTheDocument();
  });
});
