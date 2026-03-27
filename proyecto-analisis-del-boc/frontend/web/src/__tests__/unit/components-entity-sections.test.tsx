import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ArchiveSection } from "@/components/metrics/ArchiveSection";
import { BulletinSection } from "@/components/metrics/BulletinSection";
import { DispositionSection } from "@/components/metrics/DispositionSection";
import type { ArchiveCompletion, ArchiveDetail, YearCompletion, IssueCompletion } from "@/types/domain";

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

const issueCompletion: IssueCompletion[] = [
  { year: 2024, issue: 1, totalDocuments: 20, downloadedDocuments: 18, downloadPercentage: 90, extractedDocuments: 15, extractedPercentage: 75, downloadedAt: "2025-03-15T10:00:00.000Z" },
  { year: 2024, issue: 2, totalDocuments: 15, downloadedDocuments: 15, downloadPercentage: 100, extractedDocuments: 15, extractedPercentage: 100, downloadedAt: "2025-03-14T10:00:00.000Z" },
  { year: 2023, issue: 1, totalDocuments: 22, downloadedDocuments: 10, downloadPercentage: 45.5, extractedDocuments: 5, extractedPercentage: 22.7, downloadedAt: "2025-03-10T10:00:00.000Z" },
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
    expect(screen.getByText(/15 mar 2025/)).toBeInTheDocument();
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

describe("DispositionSection", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("agrupa por año y muestra totales acumulados", () => {
    render(<DispositionSection issues={issueCompletion} />);
    // Year 2024: 20+15 = 35 total documents
    expect(screen.getByText("35")).toBeInTheDocument();
    // Year 2023: 22 total documents
    expect(screen.getByText("22")).toBeInTheDocument();
  });

  it("muestra ambos años", () => {
    render(<DispositionSection issues={issueCompletion} />);
    expect(screen.getByText("2024")).toBeInTheDocument();
    expect(screen.getByText("2023")).toBeInTheDocument();
  });

  it("expande un año para ver sus boletines", async () => {
    const user = userEvent.setup();
    render(<DispositionSection issues={issueCompletion} />);

    // Inicialmente no se ven los boletines individuales
    expect(screen.queryByText(/N.º 1/)).not.toBeInTheDocument();

    await user.click(screen.getByText("2024"));
    expect(screen.getByText(/N.º 1/)).toBeInTheDocument();
    expect(screen.getByText(/N.º 2/)).toBeInTheDocument();
  });

  it("colapsa un año al hacer clic de nuevo", async () => {
    const user = userEvent.setup();
    render(<DispositionSection issues={issueCompletion} />);

    await user.click(screen.getByText("2024"));
    expect(screen.getByText(/N.º 1/)).toBeInTheDocument();

    await user.click(screen.getByText("2024"));
    expect(screen.queryByText(/N.º 1/)).not.toBeInTheDocument();
  });

  it("carga detalles de disposiciones por API al expandir un boletín", async () => {
    const user = userEvent.setup();
    const fakePaginated = {
      data: [{ year: 2024, issue: 1, disposition: 1, objectKey: null, downloadedAt: "2025-01-01T00:00:00.000Z", extractedAt: null }],
      total: 1, page: 1, pageSize: 50, totalPages: 1,
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(fakePaginated)));

    render(<DispositionSection issues={issueCompletion} />);

    // Expandir año 2024
    await user.click(screen.getByText("2024"));
    // Expandir boletín N.º 1
    await user.click(screen.getByText(/N.º 1/));

    await waitFor(() => {
      expect(globalThis.fetch).toHaveBeenCalledWith("/api/metrics/issue-details?year=2024&issue=1&page=1&pageSize=50");
    });
  });

  it("muestra paginación cuando hay más de una página", async () => {
    const user = userEvent.setup();
    const fakePaginated = {
      data: Array.from({ length: 50 }, (_, i) => ({
        year: 2024, issue: 1, disposition: i + 1, objectKey: null, downloadedAt: null, extractedAt: null,
      })),
      total: 120, page: 1, pageSize: 50, totalPages: 3,
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify(fakePaginated)));

    render(<DispositionSection issues={issueCompletion} />);
    await user.click(screen.getByText("2024"));
    await user.click(screen.getByText(/N.º 1/));

    await waitFor(() => {
      expect(screen.getByText(/Página 1 de 3/)).toBeInTheDocument();
      expect(screen.getByText(/120 disp\./)).toBeInTheDocument();
    });
  });
});
