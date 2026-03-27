import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getArchiveDetails } from "@app/api/metrics/archive-details/route";
import { GET as getYearDetails } from "@app/api/metrics/year-details/route";
import { GET as getIssueDetails } from "@app/api/metrics/issue-details/route";
import { NextRequest } from "next/server";

const mockArchiveDetails = vi.fn();
const mockYearDetails = vi.fn();
const mockIssueDetails = vi.fn();

vi.mock("@/lib/db/repositories/metrics", () => ({
  MetricsRepository: {
    getArchiveDetails: (...args: unknown[]) => mockArchiveDetails(...args),
    getYearDetails: (...args: unknown[]) => mockYearDetails(...args),
    getIssueDetails: (...args: unknown[]) => mockIssueDetails(...args),
  },
}));

const fakeArchiveDetails = [
  { year: 2024, absoluteLink: "/2024", objectKey: "k1", downloadedAt: "2025-01-01T00:00:00.000Z", extractedAt: "2025-01-02T00:00:00.000Z" },
  { year: 2023, absoluteLink: "/2023", objectKey: null, downloadedAt: null, extractedAt: null },
];

const fakeYearDetails = [
  { year: 2024, issue: 1, url: "/2024/1", objectKey: "k2", downloadedAt: "2025-01-01T00:00:00.000Z", extractedAt: null },
];

const fakeIssueDetails = {
  data: [{ year: 2024, issue: 1, disposition: 1, objectKey: "k3", downloadedAt: "2025-01-01T00:00:00.000Z", extractedAt: null }],
  total: 1,
  page: 1,
  pageSize: 50,
  totalPages: 1,
};

beforeEach(() => {
  mockArchiveDetails.mockReset().mockResolvedValue(fakeArchiveDetails);
  mockYearDetails.mockReset().mockResolvedValue(fakeYearDetails);
  mockIssueDetails.mockReset().mockResolvedValue(fakeIssueDetails);
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

// ── Issue Details ───────────────────────────────────────────────────────

describe("GET /api/metrics/issue-details", () => {
  function req(params: string) {
    return new NextRequest(new URL(`http://localhost/api/metrics/issue-details${params}`));
  }

  it("devuelve detalles paginados de un boletín", async () => {
    const res = await getIssueDetails(req("?year=2024&issue=1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(fakeIssueDetails);
    expect(mockIssueDetails).toHaveBeenCalledWith(2024, 1, 1, 50);
  });

  it("respeta parámetros de paginación", async () => {
    const res = await getIssueDetails(req("?year=2024&issue=1&page=3&pageSize=25"));
    expect(res.status).toBe(200);
    expect(mockIssueDetails).toHaveBeenCalledWith(2024, 1, 3, 25);
  });

  it("limita pageSize a 100", async () => {
    await getIssueDetails(req("?year=2024&issue=1&pageSize=999"));
    expect(mockIssueDetails).toHaveBeenCalledWith(2024, 1, 1, 100);
  });

  it("devuelve 400 si falta year o issue", async () => {
    expect((await getIssueDetails(req("?year=2024"))).status).toBe(400);
    expect((await getIssueDetails(req("?issue=1"))).status).toBe(400);
    expect((await getIssueDetails(req(""))).status).toBe(400);
  });

  it("devuelve 500 si el repositorio falla", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockIssueDetails.mockRejectedValue(new Error("DB down"));
    const res = await getIssueDetails(req("?year=2024&issue=1"));
    expect(res.status).toBe(500);
    vi.restoreAllMocks();
  });
});
