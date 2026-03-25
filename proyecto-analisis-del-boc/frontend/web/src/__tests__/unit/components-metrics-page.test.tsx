import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MetricKPI } from "@/components/metrics/MetricKPI";
import { YearDetailTable } from "@/components/metrics/YearDetailTable";
import type { YearBreakdown, IssueBreakdown } from "@/types/domain";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

const years: YearBreakdown[] = [
  { year: 2024, total: 255, done: 250, percentage: 98.0 },
  { year: 2023, total: 260, done: 130, percentage: 50.0 },
];

const documents: IssueBreakdown[] = [
  { year: 2024, issue: 1, total: 20, done: 20, percentage: 100 },
  { year: 2024, issue: 2, total: 18, done: 15, percentage: 83.3 },
  { year: 2023, issue: 1, total: 22, done: 10, percentage: 45.5 },
];

describe("YearDetailTable", () => {
  it("renderiza todos los años", () => {
    render(<YearDetailTable years={years} documents={documents} />);
    expect(screen.getByText("2024")).toBeInTheDocument();
    expect(screen.getByText("2023")).toBeInTheDocument();
  });

  it("muestra done/total para cada año", () => {
    render(<YearDetailTable years={years} documents={documents} />);
    expect(screen.getByText("250/255")).toBeInTheDocument();
    expect(screen.getByText("130/260")).toBeInTheDocument();
  });

  it("expande detalle por boletín al hacer clic en un año", async () => {
    const user = userEvent.setup();
    render(<YearDetailTable years={years} documents={documents} />);

    // Inicialmente no se ven los boletines
    expect(screen.queryByText(/N.º 1/)).not.toBeInTheDocument();

    // Clic en 2024
    await user.click(screen.getByText("2024"));

    // Ahora se ven los boletines de 2024
    expect(screen.getByText("20/20")).toBeInTheDocument();
    expect(screen.getByText("15/18")).toBeInTheDocument();
  });

  it("colapsa al hacer clic de nuevo", async () => {
    const user = userEvent.setup();
    render(<YearDetailTable years={years} documents={documents} />);

    await user.click(screen.getByText("2024"));
    expect(screen.getByText("20/20")).toBeInTheDocument();

    await user.click(screen.getByText("2024"));
    expect(screen.queryByText("20/20")).not.toBeInTheDocument();
  });

  it("solo expande un año a la vez", async () => {
    const user = userEvent.setup();
    render(<YearDetailTable years={years} documents={documents} />);

    await user.click(screen.getByText("2024"));
    expect(screen.getByText("20/20")).toBeInTheDocument();

    await user.click(screen.getByText("2023"));
    // 2023 expandido, 2024 colapsado
    expect(screen.getByText("10/22")).toBeInTheDocument();
    expect(screen.queryByText("20/20")).not.toBeInTheDocument();
  });
});
