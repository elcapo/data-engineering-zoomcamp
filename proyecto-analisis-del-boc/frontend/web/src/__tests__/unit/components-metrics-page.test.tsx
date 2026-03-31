import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MetricKPI } from "@/components/metrics/MetricKPI";

vi.mock("recharts", () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Sector: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe("MetricKPI", () => {
  it("renderiza el label y los conteos", () => {
    render(<MetricKPI label="Años" processed={40} total={45} />);
    expect(screen.getByText("Años")).toBeInTheDocument();
    expect(screen.getByText(/40/)).toBeInTheDocument();
    expect(screen.getByText(/45/)).toBeInTheDocument();
  });

  it("muestra 0 de 0 sin error", () => {
    render(<MetricKPI label="Test" processed={0} total={0} />);
    expect(screen.getByText("Test")).toBeInTheDocument();
  });

  it("muestra 100% cuando todo está procesado", () => {
    render(<MetricKPI label="Completo" processed={100} total={100} />);
    expect(screen.getByText(/100/)).toBeInTheDocument();
  });
});
