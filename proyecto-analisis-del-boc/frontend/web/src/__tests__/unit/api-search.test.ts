import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/search/route";
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

  it("parsea q, org, from, to, year, issue", async () => {
    await GET(request("q=beca&org=ULPGC&from=2024-01-01&to=2024-12-31&year=2024&issue=10"));
    expect(mockSearch).toHaveBeenCalledWith(
      {
        q: "beca",
        org: "ULPGC",
        from: "2024-01-01",
        to: "2024-12-31",
        year: 2024,
        issue: 10,
      },
      undefined,
      20,
    );
  });

  it("parsea arrays de section y subsection", async () => {
    await GET(request("section=I&section=II&subsection=A"));
    expect(mockSearch).toHaveBeenCalledWith(
      { section: ["I", "II"], subsection: ["A"] },
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

  it("ignora year no numérico", async () => {
    await GET(request("year=abc"));
    expect(mockSearch).toHaveBeenCalledWith({}, undefined, 20);
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
