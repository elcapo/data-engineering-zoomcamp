import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getArchiveDetails } from "@app/api/metrics/archive-details/route";
import { GET as getYearDetails } from "@app/api/metrics/year-details/route";
import { NextRequest } from "next/server";

const mockArchiveDetails = vi.fn();
const mockYearDetails = vi.fn();

vi.mock("@/lib/db/repositories/metrics", () => ({
  MetricsRepository: {
    getArchiveDetails: (...args: unknown[]) => mockArchiveDetails(...args),
    getYearDetails: (...args: unknown[]) => mockYearDetails(...args),
  },
}));

const fakeArchiveDetails = [
  { year: 2024, absoluteLink: "/2024", objectKey: "k1", downloadedAt: "2025-01-01T00:00:00.000Z", extractedAt: "2025-01-02T00:00:00.000Z" },
  { year: 2023, absoluteLink: "/2023", objectKey: null, downloadedAt: null, extractedAt: null },
];

const fakeYearDetails = [
  { year: 2024, issue: 1, url: "/2024/1", objectKey: "k2", downloadedAt: "2025-01-01T00:00:00.000Z", extractedAt: null },
];

beforeEach(() => {
  mockArchiveDetails.mockReset().mockResolvedValue(fakeArchiveDetails);
  mockYearDetails.mockReset().mockResolvedValue(fakeYearDetails);
});

// ── Archive Details ─────────────────────────────────────────────────────

describe("GET /api/metrics/archive-details", () => {
  it("devuelve los detalles del archivo como JSON", async () => {
    const res = await getArchiveDetails();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(fakeArchiveDetails);
  });

  it("devuelve 500 si el repositorio falla", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockArchiveDetails.mockRejectedValue(new Error("DB down"));
    const res = await getArchiveDetails();
    expect(res.status).toBe(500);
    vi.restoreAllMocks();
  });
});

// ── Year Details ────────────────────────────────────────────────────────

describe("GET /api/metrics/year-details", () => {
  function req(params: string) {
    return new NextRequest(new URL(`http://localhost/api/metrics/year-details${params}`));
  }

  it("devuelve detalles de un año", async () => {
    const res = await getYearDetails(req("?year=2024"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(fakeYearDetails);
    expect(mockYearDetails).toHaveBeenCalledWith(2024);
  });

  it("devuelve 400 si falta el parámetro year", async () => {
    const res = await getYearDetails(req(""));
    expect(res.status).toBe(400);
  });

  it("devuelve 400 si year no es numérico", async () => {
    const res = await getYearDetails(req("?year=abc"));
    expect(res.status).toBe(400);
  });

  it("devuelve 500 si el repositorio falla", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockYearDetails.mockRejectedValue(new Error("DB down"));
    const res = await getYearDetails(req("?year=2024"));
    expect(res.status).toBe(500);
    vi.restoreAllMocks();
  });
});
