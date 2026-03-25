import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/metrics/route";

const mockGetReport = vi.fn();

vi.mock("@/lib/db/repositories/metrics", () => ({
  MetricsRepository: {
    getDataQualityReport: () => mockGetReport(),
  },
}));

const fakeReport = {
  downloads: {
    years: { total: 45, downloaded: 40, percentage: 88.9 },
    issues: [{ year: 2024, total: 255, done: 250, percentage: 98.0 }],
    documents: [],
  },
  extractions: {
    years: { total: 40, extracted: 35, percentage: 87.5 },
    issues: [{ year: 2024, total: 250, done: 200, percentage: 80.0 }],
    documents: [],
  },
};

beforeEach(() => {
  mockGetReport.mockReset();
  mockGetReport.mockResolvedValue(fakeReport);
});

describe("GET /api/metrics", () => {
  it("devuelve el reporte de calidad como JSON", async () => {
    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(fakeReport);
  });

  it("llama al repositorio exactamente una vez", async () => {
    await GET();
    expect(mockGetReport).toHaveBeenCalledTimes(1);
  });

  it("devuelve 500 si el repositorio falla", async () => {
    mockGetReport.mockRejectedValue(new Error("DB down"));
    const res = await GET();
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });
});
