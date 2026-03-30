import { describe, it, expect } from "vitest";
import { parseSearchParams, buildSearchUrl, activeFiltersToSearchFilters } from "@/lib/search/url-params";
import type { ActiveFilter } from "@/types/domain";

describe("parseSearchParams", () => {
  it("devuelve filtros vacíos para params vacíos", () => {
    const { filters, cursor, limit } = parseSearchParams({});
    expect(filters).toEqual([]);
    expect(cursor).toBeUndefined();
    expect(limit).toBe(20);
  });

  it("parsea include_term y exclude_term como ActiveFilter[]", () => {
    const { filters } = parseSearchParams({
      include_term: ["beca", "ayuda"],
      exclude_term: "universidad",
    });
    expect(filters).toEqual([
      expect.objectContaining({ type: "term", mode: "include", value: "beca" }),
      expect.objectContaining({ type: "term", mode: "include", value: "ayuda" }),
      expect.objectContaining({ type: "term", mode: "exclude", value: "universidad" }),
    ]);
  });

  it("legacy q sin include/exclude se convierte a chips include", () => {
    const { filters } = parseSearchParams({ q: "beca universitaria" });
    expect(filters).toEqual([
      expect.objectContaining({ type: "term", mode: "include", value: "beca" }),
      expect.objectContaining({ type: "term", mode: "include", value: "universitaria" }),
    ]);
  });

  it("legacy include/exclude se parsean como términos", () => {
    const { filters } = parseSearchParams({ include: ["beca"], exclude: "uni" });
    expect(filters).toEqual([
      expect.objectContaining({ type: "term", mode: "include", value: "beca" }),
      expect.objectContaining({ type: "term", mode: "exclude", value: "uni" }),
    ]);
  });

  it("parsea include_section y exclude_section", () => {
    const { filters } = parseSearchParams({
      include_section: ["I", "II"],
      exclude_section: "III",
    });
    expect(filters).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "section", mode: "include", value: "I" }),
      expect.objectContaining({ type: "section", mode: "include", value: "II" }),
      expect.objectContaining({ type: "section", mode: "exclude", value: "III" }),
    ]));
  });

  it("legacy section sin prefijo → include", () => {
    const { filters } = parseSearchParams({ section: ["I", "II"] });
    expect(filters).toEqual([
      expect.objectContaining({ type: "section", mode: "include", value: "I" }),
      expect.objectContaining({ type: "section", mode: "include", value: "II" }),
    ]);
  });

  it("parsea include_org y exclude_org", () => {
    const { filters } = parseSearchParams({
      include_org: "Consejería",
      exclude_org: "Educación",
    });
    expect(filters).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "org", mode: "include", value: "Consejería" }),
      expect.objectContaining({ type: "org", mode: "exclude", value: "Educación" }),
    ]));
  });

  it("legacy org sin prefijo → include", () => {
    const { filters } = parseSearchParams({ org: "ULPGC" });
    expect(filters).toEqual([
      expect.objectContaining({ type: "org", mode: "include", value: "ULPGC" }),
    ]);
  });

  it("parsea date ranges indexados", () => {
    const { filters } = parseSearchParams({
      include_from_0: "2024-01-01",
      include_to_0: "2024-12-31",
    });
    expect(filters).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "dateRange", mode: "include", from: "2024-01-01", to: "2024-12-31" }),
    ]));
  });

  it("legacy from/to sin prefijo → include dateRange", () => {
    const { filters } = parseSearchParams({ from: "2024-01-01", to: "2024-12-31" });
    expect(filters).toEqual([
      expect.objectContaining({ type: "dateRange", mode: "include", from: "2024-01-01", to: "2024-12-31" }),
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
  it("genera /buscar sin params para filtros vacíos", () => {
    const url = buildSearchUrl([]);
    expect(url).toBe("/buscar");
  });

  it("construye q y include_term desde filtros de tipo term", () => {
    const filters: ActiveFilter[] = [
      { id: "1", type: "term", mode: "include", value: "beca" },
      { id: "2", type: "term", mode: "include", value: "ayuda" },
    ];
    const url = buildSearchUrl(filters);
    expect(url).toContain("q=");
    expect(url).toContain("include_term=beca");
    expect(url).toContain("include_term=ayuda");
  });

  it("incluye exclude_term en la URL", () => {
    const filters: ActiveFilter[] = [
      { id: "1", type: "term", mode: "exclude", value: "universidad" },
    ];
    const url = buildSearchUrl(filters);
    expect(url).toContain("exclude_term=universidad");
  });

  it("incluye filtros de sección y organismo", () => {
    const filters: ActiveFilter[] = [
      { id: "1", type: "section", mode: "include", value: "I" },
      { id: "2", type: "section", mode: "exclude", value: "III" },
      { id: "3", type: "org", mode: "include", value: "ULPGC" },
    ];
    const url = buildSearchUrl(filters);
    expect(url).toContain("include_section=I");
    expect(url).toContain("exclude_section=III");
    expect(url).toContain("include_org=ULPGC");
  });

  it("incluye date ranges indexados", () => {
    const filters: ActiveFilter[] = [
      { id: "1", type: "dateRange", mode: "include", value: "", from: "2024-01-01", to: "2024-12-31" },
    ];
    const url = buildSearchUrl(filters);
    expect(url).toContain("include_from_0=2024-01-01");
    expect(url).toContain("include_to_0=2024-12-31");
  });

  it("incluye cursor cuando se proporciona", () => {
    const url = buildSearchUrl([], "2024-010-3");
    expect(url).toContain("cursor=2024-010-3");
  });
});

describe("activeFiltersToSearchFilters", () => {
  it("convierte filtros activos a SearchFilters", () => {
    const filters: ActiveFilter[] = [
      { id: "1", type: "term", mode: "include", value: "beca" },
      { id: "2", type: "term", mode: "exclude", value: "uni" },
      { id: "3", type: "section", mode: "include", value: "I" },
      { id: "4", type: "section", mode: "exclude", value: "III" },
      { id: "5", type: "org", mode: "include", value: "Consejería" },
      { id: "6", type: "org", mode: "exclude", value: "Educación" },
      { id: "7", type: "dateRange", mode: "include", value: "", from: "2024-01-01", to: "2024-12-31" },
      { id: "8", type: "dateRange", mode: "exclude", value: "", from: "2022-01-01", to: "2022-12-31" },
    ];
    const sf = activeFiltersToSearchFilters(filters);
    expect(sf.q).toBeTruthy();
    expect(sf.section).toEqual(["I"]);
    expect(sf.excludeSection).toEqual(["III"]);
    expect(sf.org).toEqual(["Consejería"]);
    expect(sf.excludeOrg).toEqual(["Educación"]);
    expect(sf.dateRanges).toEqual([{ from: "2024-01-01", to: "2024-12-31" }]);
    expect(sf.excludeDateRanges).toEqual([{ from: "2022-01-01", to: "2022-12-31" }]);
  });
});
