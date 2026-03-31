import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArchiveSection } from "@/components/metrics/ArchiveSection";
import { BulletinSection } from "@/components/metrics/BulletinSection";
import { DispositionSection } from "@/components/metrics/DispositionSection";
import type {
  YearOverview,
  ProcessedBulletin,
  ProcessedDisposition,
} from "@/types/domain";

// Mock next/link
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

// ── Fixtures ────────────────────────────────────────────────────────────

const yearOverviews: YearOverview[] = [
  { year: 2024, totalBulletins: 255, processedBulletins: 250, bulletinPercentage: 98.0, totalDispositions: 5000, processedDispositions: 4500, dispositionPercentage: 90.0 },
  { year: 2023, totalBulletins: 260, processedBulletins: 130, bulletinPercentage: 50.0, totalDispositions: 5200, processedDispositions: 2600, dispositionPercentage: 50.0 },
];

const recentBulletins: ProcessedBulletin[] = [
  { year: 2024, issue: 255, processedAt: "2025-03-15T10:00:00.000Z" },
  { year: 2024, issue: 254, processedAt: "2025-03-14T10:00:00.000Z" },
];

const oldestBulletins: ProcessedBulletin[] = [
  { year: 2001, issue: 1, processedAt: "2024-01-10T10:00:00.000Z" },
  { year: 2001, issue: 2, processedAt: "2024-01-10T12:00:00.000Z" },
];

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
  it("muestra la tabla con todos los años", () => {
    render(<ArchiveSection years={yearOverviews} />);
    expect(screen.getByText("2024")).toBeInTheDocument();
    expect(screen.getByText("2023")).toBeInTheDocument();
  });

  it("muestra conteos de boletines y disposiciones por año", () => {
    render(<ArchiveSection years={yearOverviews} />);
    expect(screen.getByText("250")).toBeInTheDocument();
    expect(screen.getByText("4.500")).toBeInTheDocument();
  });

  it("enlaza cada año a su página", () => {
    render(<ArchiveSection years={yearOverviews} />);
    const link = screen.getByText("2024");
    expect(link.closest("a")).toHaveAttribute("href", "/ano/2024");
  });
});

// ── BulletinSection ─────────────────────────────────────────────────────

describe("BulletinSection", () => {
  it("muestra las tablas de boletines recientes y antiguos", () => {
    render(<BulletinSection recent={recentBulletins} oldest={oldestBulletins} />);
    expect(screen.getByText("Últimos procesados")).toBeInTheDocument();
    expect(screen.getByText("Primeros procesados")).toBeInTheDocument();
  });

  it("muestra el código de boletín con enlace", () => {
    render(<BulletinSection recent={recentBulletins} oldest={oldestBulletins} />);
    const link = screen.getByText("2024/255");
    expect(link.closest("a")).toHaveAttribute("href", "/boletin/2024/255");
  });
});

// ── DispositionSection ──────────────────────────────────────────────────

describe("DispositionSection", () => {
  it("muestra las tablas de disposiciones recientes y antiguas", () => {
    render(<DispositionSection recent={recentDispositions} oldest={oldestDispositions} />);
    expect(screen.getByText("Últimas procesadas")).toBeInTheDocument();
    expect(screen.getByText("Primeras procesadas")).toBeInTheDocument();
  });

  it("muestra el código de disposición con enlace", () => {
    render(<DispositionSection recent={recentDispositions} oldest={oldestDispositions} />);
    const link = screen.getByText("2024/255/3");
    expect(link.closest("a")).toHaveAttribute("href", "/disposicion/2024/255/3");
  });

  it("muestra enlaces a boletines", () => {
    render(<DispositionSection recent={recentDispositions} oldest={oldestDispositions} />);
    const bulletinLinks = screen.getAllByText("2024/255");
    expect(bulletinLinks[0].closest("a")).toHaveAttribute("href", "/boletin/2024/255");
  });
});
