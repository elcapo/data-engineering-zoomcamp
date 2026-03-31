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
  it("muestra label y conteos", () => {
    render(<MetricKPI label="Años" processed={40} total={45} />);
    expect(screen.getByText("Años")).toBeInTheDocument();
    expect(screen.getByText(/40/)).toBeInTheDocument();
    expect(screen.getByText(/45/)).toBeInTheDocument();
  });

  it("renderiza el pie chart", () => {
    render(<MetricKPI label="Boletines" processed={5200} total={6500} />);
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
  });

  it("usa processedLabel personalizado", () => {
    render(<MetricKPI label="Disposiciones" processed={180000} total={225000} processedLabel="procesadas" />);
    expect(screen.getByText(/procesadas/)).toBeInTheDocument();
  });
});
