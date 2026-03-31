import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET as getArchiveDetails } from "@app/api/metrics/archive-details/route";

const mockArchiveDetails = vi.fn();

vi.mock("@/lib/db/repositories/metrics", () => ({
  MetricsRepository: {
    getArchiveDetails: (...args: unknown[]) => mockArchiveDetails(...args),
  },
}));

const fakeArchiveDetails = [
  { year: 2024, absoluteLink: "/2024", objectKey: "k1", downloadedAt: "2025-01-01T00:00:00.000Z", extractedAt: "2025-01-02T00:00:00.000Z" },
  { year: 2023, absoluteLink: "/2023", objectKey: null, downloadedAt: null, extractedAt: null },
];

beforeEach(() => {
  mockArchiveDetails.mockReset().mockResolvedValue(fakeArchiveDetails);
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
