import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArchiveSection } from "@/components/metrics/ArchiveSection";
import { BulletinSection } from "@/components/metrics/BulletinSection";
import { DispositionSection } from "@/components/metrics/DispositionSection";
import type { ArchiveCompletion, ArchiveDetail, YearCompletion, DispositionSummary, ProcessedDisposition } from "@/types/domain";

// ── Fixtures ────────────────────────────────────────────────────────────

const archiveSummary: ArchiveCompletion = {
  totalYears: 45,
  downloadedYears: 40,
  extractedYears: 35,
  downloadedPercentage: 88.9,
  extractedPercentage: 77.8,
  downloadedAt: "2025-03-15T10:00:00.000Z",
};

const archiveDetails: ArchiveDetail[] = [
  { year: 2024, absoluteLink: "/2024", objectKey: "k1", downloadedAt: "2025-03-15T10:00:00.000Z", extractedAt: "2025-03-16T10:00:00.000Z" },
  { year: 2023, absoluteLink: "/2023", objectKey: null, downloadedAt: null, extractedAt: null },
];

const yearCompletion: YearCompletion[] = [
  { year: 2024, totalIssues: 255, downloadedIssues: 250, downloadPercentage: 98.0, extractedIssues: 240, extractedPercentage: 94.1, downloadedAt: "2025-03-15T10:00:00.000Z" },
  { year: 2023, totalIssues: 260, downloadedIssues: 130, downloadPercentage: 50.0, extractedIssues: 100, extractedPercentage: 38.5, downloadedAt: "2025-03-10T10:00:00.000Z" },
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
  it("muestra los conteos del resumen", () => {
    render(<ArchiveSection summary={archiveSummary} details={archiveDetails} />);
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("40")).toBeInTheDocument();
    expect(screen.getByText("35")).toBeInTheDocument();
  });

  it("muestra las etiquetas descriptivas", () => {
    render(<ArchiveSection summary={archiveSummary} details={archiveDetails} />);
    expect(screen.getByText("años publicados")).toBeInTheDocument();
    expect(screen.getByText("años descargados")).toBeInTheDocument();
    expect(screen.getByText("años extraídos")).toBeInTheDocument();
  });

  it("muestra la fecha de última descarga", () => {
    render(<ArchiveSection summary={archiveSummary} details={archiveDetails} />);
    expect(screen.getByText(/15 de marzo de 2025/)).toBeInTheDocument();
  });

  it("el detalle está oculto inicialmente", () => {
    render(<ArchiveSection summary={archiveSummary} details={archiveDetails} />);
    expect(screen.queryByText("2024")).not.toBeInTheDocument();
  });

  it("muestra el detalle al hacer clic", async () => {
    const user = userEvent.setup();
    render(<ArchiveSection summary={archiveSummary} details={archiveDetails} />);

    await user.click(screen.getByText(/Ver detalle por año/));

    expect(screen.getByText("2024")).toBeInTheDocument();
    expect(screen.getByText("2023")).toBeInTheDocument();
  });

  it("oculta el detalle al hacer clic de nuevo", async () => {
    const user = userEvent.setup();
    render(<ArchiveSection summary={archiveSummary} details={archiveDetails} />);

    await user.click(screen.getByText(/Ver detalle por año/));
    expect(screen.getByText("2024")).toBeInTheDocument();

    await user.click(screen.getByText(/Ocultar detalle/));
    expect(screen.queryByText("2024")).not.toBeInTheDocument();
  });
});

// ── BulletinSection ─────────────────────────────────────────────────────

describe("BulletinSection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("renderiza todos los años con sus totales", () => {
    render(<BulletinSection years={yearCompletion} />);
    expect(screen.getByText("2024")).toBeInTheDocument();
    expect(screen.getByText("2023")).toBeInTheDocument();
    expect(screen.getByText("255")).toBeInTheDocument();
    expect(screen.getByText("250")).toBeInTheDocument();
    expect(screen.getByText("240")).toBeInTheDocument();
  });

  it("carga detalles por API al expandir un año", async () => {
    const user = userEvent.setup();
    const fakeDetails = [
      { year: 2024, issue: 1, url: "/1", objectKey: null, downloadedAt: "2025-01-01T00:00:00.000Z", extractedAt: null },
    ];
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(fakeDetails)));

    render(<BulletinSection years={yearCompletion} />);
    await user.click(screen.getByText("2024"));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/metrics/year-details?year=2024");
    });
  });

  it("colapsa al hacer clic de nuevo", async () => {
    const user = userEvent.setup();
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify([])));

    render(<BulletinSection years={yearCompletion} />);
    await user.click(screen.getByText("2024"));

    await waitFor(() => {
      expect(screen.getByText("Sin detalle")).toBeInTheDocument();
    });

    await user.click(screen.getByText("2024"));
    expect(screen.queryByText("Sin detalle")).not.toBeInTheDocument();
  });
});

// ── DispositionSection ──────────────────────────────────────────────────

// Mock recharts to avoid SVG rendering issues in JSDOM
vi.mock("recharts", () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Sector: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

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
