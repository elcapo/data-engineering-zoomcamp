import { describe, it, expect } from "vitest";
import { parseSearchParams, buildSearchUrl } from "@/lib/search/url-params";
import type { BooleanTerm } from "@/lib/search/query-builder";
import { SearchFilters } from "@/types/domain";

describe("parseSearchParams", () => {
  it("devuelve filtros vacíos y términos vacíos para params vacíos", () => {
    const { filters, terms, cursor, limit } = parseSearchParams({});
    expect(filters).toEqual({});
    expect(terms).toEqual([]);
    expect(cursor).toBeUndefined();
    expect(limit).toBe(20);
  });

  it("parsea org, from, to, year, issue como filtros estructurados", () => {
    const { filters } = parseSearchParams({
      org: "ULPGC",
      from: "2024-01-01",
      to: "2024-12-31",
      year: "2024",
      issue: "10",
    });
    expect(filters).toEqual({
      org: "ULPGC",
      from: "2024-01-01",
      to: "2024-12-31",
      year: 2024,
      issue: 10,
    });
  });

  it("q sin include/exclude se convierte a chips include", () => {
    const { terms, filters } = parseSearchParams({ q: "beca universitaria" });
    expect(terms).toEqual([
      { value: "beca", mode: "include", group: 0 },
      { value: "universitaria", mode: "include", group: 0 },
    ]);
    // q no se almacena en filters — solo vive en terms
    expect(filters.q).toBeUndefined();
  });

  it("parsea section y subsection como arrays", () => {
    const { filters } = parseSearchParams({ section: ["I", "II"], subsection: "A" });
    expect(filters.section).toEqual(["I", "II"]);
    expect(filters.subsection).toEqual(["A"]);
  });

  it("reconstruye BooleanTerms desde include/exclude (ignora q)", () => {
    const { terms } = parseSearchParams({ q: "ignorado", include: ["beca", "ayuda"], exclude: "universidad" });
    expect(terms).toEqual([
      { value: "beca", mode: "include", group: 0 },
      { value: "ayuda", mode: "include", group: 0 },
      { value: "universidad", mode: "exclude" },
    ]);
  });

  it("parsea cursor y limit", () => {
    const { cursor, limit } = parseSearchParams({ cursor: "2024-010-3", limit: "50" });
    expect(cursor).toBe("2024-010-3");
    expect(limit).toBe(50);
  });

  it("clampea limit a 1–100", () => {
    expect(parseSearchParams({ limit: "0" }).limit).toBe(1);
    expect(parseSearchParams({ limit: "999" }).limit).toBe(100);
  });
});

describe("buildSearchUrl", () => {
  it("genera /buscar sin params para filtros vacíos y sin términos", () => {
    const url = buildSearchUrl({}, []);
    expect(url).toBe("/buscar");
  });

  it("no incluye q si no hay términos (incluso con filters.q residual)", () => {
    const url = buildSearchUrl({ q: "residuo" } as SearchFilters, []);
    expect(url).not.toContain("q=");
  });

  it("construye q desde BooleanTerms con tsquery", () => {
    const terms: BooleanTerm[] = [
      { value: "beca", mode: "include", group: 0 },
      { value: "ayuda", mode: "include", group: 0 },
    ];
    const url = buildSearchUrl({}, terms);
    expect(url).toContain("q=");
    expect(url).toContain("include=beca");
    expect(url).toContain("include=ayuda");
  });

  it("incluye exclude en la URL", () => {
    const terms: BooleanTerm[] = [{ value: "universidad", mode: "exclude" }];
    const url = buildSearchUrl({}, terms);
    expect(url).toContain("exclude=universidad");
  });

  it("incluye filtros de sección, org, fechas, año", () => {
    const filters: SearchFilters = {
      section: ["I", "II"],
      org: "ULPGC",
      from: "2024-01-01",
      year: 2024,
    };
    const url = buildSearchUrl(filters, []);
    expect(url).toContain("section=I");
    expect(url).toContain("section=II");
    expect(url).toContain("org=ULPGC");
    expect(url).toContain("from=2024-01-01");
    expect(url).toContain("year=2024");
  });

  it("incluye cursor cuando se proporciona", () => {
    const url = buildSearchUrl({}, [], "2024-010-3");
    expect(url).toContain("cursor=2024-010-3");
  });

  it("solo filtros estructurados sin texto genera URL sin q", () => {
    const url = buildSearchUrl({ year: 2026 }, []);
    expect(url).toBe("/buscar?year=2026");
  });
});
