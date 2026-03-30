import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@app/api/search/route";
import { NextRequest } from "next/server";

const mockSearch = vi.fn();

vi.mock("@/lib/db/repositories/dispositions", () => ({
  DispositionRepository: {
    search: (...args: unknown[]) => mockSearch(...args),
  },
}));

function request(params = ""): NextRequest {
  return new NextRequest(`http://localhost/api/search${params ? `?${params}` : ""}`);
}

const fakeResult = {
  results: [{ year: 2024, issue: 10, number: "3", section: "I", title: "Test" }],
  total: 1,
  nextCursor: null,
  prevCursor: null,
  facets: {
    byYear: [{ label: "2024", count: 1 }],
    bySection: [{ label: "I", count: 1 }],
    byOrg: [{ label: "Test Org", count: 1 }],
  },
};

beforeEach(() => {
  mockSearch.mockReset();
  mockSearch.mockResolvedValue(fakeResult);
});

describe("GET /api/search", () => {
  it("pasa filtros vacíos cuando no hay parámetros", async () => {
    const res = await GET(request());
    expect(res.status).toBe(200);
    expect(mockSearch).toHaveBeenCalledWith({}, undefined, 20);
  });

  it("parsea q, org, from, to (formato legacy)", async () => {
    await GET(request("q=beca&org=ULPGC&from=2024-01-01&to=2024-12-31"));
    expect(mockSearch).toHaveBeenCalledWith(
      {
        q: "beca",
        org: ["ULPGC"],
        dateRanges: [{ from: "2024-01-01", to: "2024-12-31" }],
      },
      undefined,
      20,
    );
  });

  it("parsea arrays de section (formato legacy)", async () => {
    await GET(request("section=I&section=II"));
    expect(mockSearch).toHaveBeenCalledWith(
      { section: ["I", "II"] },
      undefined,
      20,
    );
  });

  it("parsea include/exclude section y org", async () => {
    await GET(request("include_section=I&exclude_section=III&include_org=ULPGC&exclude_org=Test"));
    expect(mockSearch).toHaveBeenCalledWith(
      {
        section: ["I"],
        excludeSection: ["III"],
        org: ["ULPGC"],
        excludeOrg: ["Test"],
      },
      undefined,
      20,
    );
  });

  it("pasa el cursor", async () => {
    await GET(request("cursor=2024-010-3"));
    expect(mockSearch).toHaveBeenCalledWith({}, "2024-010-3", 20);
  });

  it("parsea y limita el parámetro limit", async () => {
    await GET(request("limit=5"));
    expect(mockSearch).toHaveBeenCalledWith({}, undefined, 5);
  });

  it("limita el máximo a 100", async () => {
    await GET(request("limit=500"));
    expect(mockSearch).toHaveBeenCalledWith({}, undefined, 100);
  });

  it("limita el mínimo a 1", async () => {
    await GET(request("limit=0"));
    expect(mockSearch).toHaveBeenCalledWith({}, undefined, 1);
  });

  it("parsea date ranges indexados", async () => {
    await GET(request("include_from_0=2024-01-01&include_to_0=2024-12-31&exclude_from_0=2022-06-01&exclude_to_0=2022-12-31"));
    expect(mockSearch).toHaveBeenCalledWith(
      {
        dateRanges: [{ from: "2024-01-01", to: "2024-12-31" }],
        excludeDateRanges: [{ from: "2022-06-01", to: "2022-12-31" }],
      },
      undefined,
      20,
    );
  });

  it("devuelve el resultado del repositorio como JSON", async () => {
    const res = await GET(request("q=test"));
    const body = await res.json();
    expect(body).toEqual(fakeResult);
  });

  it("devuelve 500 si el repositorio falla", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockSearch.mockRejectedValue(new Error("DB down"));
    const res = await GET(request());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeTruthy();
    vi.restoreAllMocks();
  });
});
