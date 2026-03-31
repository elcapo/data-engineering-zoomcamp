import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArchiveSection } from "@/components/metrics/ArchiveSection";
import { BulletinSection } from "@/components/metrics/BulletinSection";
import { DispositionSection } from "@/components/metrics/DispositionSection";
import type {
  ArchiveCompletion, YearOverview,
  BulletinSummary, ProcessedBulletin,
  DispositionSummary, ProcessedDisposition,
} from "@/types/domain";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// Mock recharts to avoid SVG rendering issues in JSDOM
vi.mock("recharts", () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Sector: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// ── Fixtures ────────────────────────────────────────────────────────────

const archiveSummary: ArchiveCompletion = {
  totalYears: 45,
  downloadedYears: 40,
  extractedYears: 35,
  downloadedPercentage: 88.9,
  extractedPercentage: 77.8,
  downloadedAt: "2025-03-15T10:00:00.000Z",
};

const yearOverviews: YearOverview[] = [
  { year: 2024, totalBulletins: 255, processedBulletins: 250, bulletinPercentage: 98.0, totalDispositions: 5000, processedDispositions: 4500, dispositionPercentage: 90.0 },
  { year: 2023, totalBulletins: 260, processedBulletins: 130, bulletinPercentage: 50.0, totalDispositions: 5200, processedDispositions: 2600, dispositionPercentage: 50.0 },
];

const bulletinSummary: BulletinSummary = {
  total: 6500,
  processed: 5200,
  percentage: 80.0,
};

const recentBulletins: ProcessedBulletin[] = [
  { year: 2024, issue: 255, processedAt: "2025-03-15T10:00:00.000Z" },
  { year: 2024, issue: 254, processedAt: "2025-03-14T10:00:00.000Z" },
];

const oldestBulletins: ProcessedBulletin[] = [
  { year: 2001, issue: 1, processedAt: "2024-01-10T10:00:00.000Z" },
  { year: 2001, issue: 2, processedAt: "2024-01-10T12:00:00.000Z" },
];

const dispositionSummary: DispositionSummary = {
  total: 225000,
  processed: 180000,
  percentage: 80.0,
};

const recentDispositions: ProcessedDisposition[] = [
  { year: 2024, issue: 255, disposition: 3, processedAt: "2025-03-15T10:00:00.000Z" },
  { year: 2024, issue: 254, disposition: 1, processedAt: "2025-03-14T10:00:00.000Z" },
];

const oldestDispositions: ProcessedDisposition[] = [
  { year: 2001, issue: 1, disposition: 1, processedAt: "2024-01-10T10:00:00.000Z" },
  { year: 2001, issue: 2, disposition: 1, processedAt: "2024-01-10T12:00:00.000Z" },
];

// ── ArchiveSection ──────────────────────────────────────────────────────

describe("ArchiveSection", () => {
  it("muestra el resumen con porcentaje y totales", () => {
    render(<ArchiveSection summary={archiveSummary} years={yearOverviews} />);
    expect(screen.getByText("88.9%")).toBeInTheDocument();
    expect(screen.getByText(/40/)).toBeInTheDocument();
    expect(screen.getByText(/45/)).toBeInTheDocument();
  });

  it("renderiza el pie chart", () => {
    render(<ArchiveSection summary={archiveSummary} years={yearOverviews} />);
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
  });

  it("muestra la tabla con todos los años", () => {
    render(<ArchiveSection summary={archiveSummary} years={yearOverviews} />);
    expect(screen.getByText("2024")).toBeInTheDocument();
    expect(screen.getByText("2023")).toBeInTheDocument();
  });

  it("muestra conteos de boletines y disposiciones por año", () => {
    render(<ArchiveSection summary={archiveSummary} years={yearOverviews} />);
    // 2024: 250 processed bulletins, 4.500 processed dispositions
    expect(screen.getByText("250")).toBeInTheDocument();
    expect(screen.getByText("4.500")).toBeInTheDocument();
  });

  it("enlaza cada año a su página", () => {
    render(<ArchiveSection summary={archiveSummary} years={yearOverviews} />);
    const link = screen.getByText("2024");
    expect(link.closest("a")).toHaveAttribute("href", "/ano/2024");
  });
});

// ── BulletinSection ─────────────────────────────────────────────────────

describe("BulletinSection", () => {
  it("muestra el resumen con porcentaje y totales", () => {
    render(<BulletinSection summary={bulletinSummary} recent={recentBulletins} oldest={oldestBulletins} />);
    expect(screen.getByText("80.0%")).toBeInTheDocument();
    expect(screen.getByText(/5\.200/)).toBeInTheDocument();
    expect(screen.getByText(/6\.500/)).toBeInTheDocument();
  });

  it("renderiza el pie chart", () => {
    render(<BulletinSection summary={bulletinSummary} recent={recentBulletins} oldest={oldestBulletins} />);
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
  });

  it("muestra las tablas de boletines recientes y antiguos", () => {
    render(<BulletinSection summary={bulletinSummary} recent={recentBulletins} oldest={oldestBulletins} />);
    expect(screen.getByText("Últimos procesados")).toBeInTheDocument();
    expect(screen.getByText("Primeros procesados")).toBeInTheDocument();
  });

  it("muestra el código de boletín con enlace", () => {
    render(<BulletinSection summary={bulletinSummary} recent={recentBulletins} oldest={oldestBulletins} />);
    const link = screen.getByText("2024/255");
    expect(link.closest("a")).toHaveAttribute("href", "/boletin/2024/255");
  });
});

// ── DispositionSection ──────────────────────────────────────────────────

describe("DispositionSection", () => {
  it("muestra el resumen con porcentaje y totales", () => {
    render(<DispositionSection summary={dispositionSummary} recent={recentDispositions} oldest={oldestDispositions} />);
    expect(screen.getByText("80.0%")).toBeInTheDocument();
    expect(screen.getByText(/180\.000/)).toBeInTheDocument();
    expect(screen.getByText(/225\.000/)).toBeInTheDocument();
  });

  it("renderiza el pie chart", () => {
    render(<DispositionSection summary={dispositionSummary} recent={recentDispositions} oldest={oldestDispositions} />);
    expect(screen.getByTestId("pie-chart")).toBeInTheDocument();
  });

  it("muestra las tablas de disposiciones recientes y antiguas", () => {
    render(<DispositionSection summary={dispositionSummary} recent={recentDispositions} oldest={oldestDispositions} />);
    expect(screen.getByText("Últimas procesadas")).toBeInTheDocument();
    expect(screen.getByText("Primeras procesadas")).toBeInTheDocument();
  });

  it("muestra el código de disposición con enlace", () => {
    render(<DispositionSection summary={dispositionSummary} recent={recentDispositions} oldest={oldestDispositions} />);
    const link = screen.getByText("2024/255/3");
    expect(link.closest("a")).toHaveAttribute("href", "/disposicion/2024/255/3");
  });

  it("muestra enlaces a boletines", () => {
    render(<DispositionSection summary={dispositionSummary} recent={recentDispositions} oldest={oldestDispositions} />);
    const bulletinLinks = screen.getAllByText("2024/255");
    expect(bulletinLinks[0].closest("a")).toHaveAttribute("href", "/boletin/2024/255");
  });
});
