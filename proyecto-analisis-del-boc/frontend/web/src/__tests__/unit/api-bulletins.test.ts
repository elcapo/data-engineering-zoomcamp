import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@app/api/bulletins/route";
import { NextRequest } from "next/server";

const mockFindRecent = vi.fn();

vi.mock("@/lib/db/repositories/bulletins", () => ({
  BulletinRepository: {
    findRecent: (...args: unknown[]) => mockFindRecent(...args),
  },
}));

function request(params = ""): NextRequest {
  return new NextRequest(`http://localhost/api/bulletins${params ? `?${params}` : ""}`);
}

const fakeBulletins = [
  { year: 2024, issue: 100, title: "BOC Nº 100", dispositionCount: 5, sectionCounts: [] },
  { year: 2024, issue: 99, title: "BOC Nº 99", dispositionCount: 3, sectionCounts: [] },
];

beforeEach(() => {
  mockFindRecent.mockReset();
  mockFindRecent.mockResolvedValue(fakeBulletins);
});

describe("GET /api/bulletins", () => {
  it("usa limit=5 por defecto", async () => {
    const res = await GET(request());
    expect(mockFindRecent).toHaveBeenCalledWith(5);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(fakeBulletins);
  });

  it("parsea el parámetro limit", async () => {
    await GET(request("limit=10"));
    expect(mockFindRecent).toHaveBeenCalledWith(10);
  });

  it("limita el máximo a 50", async () => {
    await GET(request("limit=999"));
    expect(mockFindRecent).toHaveBeenCalledWith(50);
  });

  it("limita el mínimo a 1", async () => {
    await GET(request("limit=0"));
    expect(mockFindRecent).toHaveBeenCalledWith(1);
  });

  it("ignora valores no numéricos y usa el defecto", async () => {
    await GET(request("limit=abc"));
    expect(mockFindRecent).toHaveBeenCalledWith(5);
  });

  it("devuelve 500 si el repositorio falla", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mockFindRecent.mockRejectedValue(new Error("DB down"));
    const res = await GET(request());
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBeTruthy();
    vi.restoreAllMocks();
  });
});
