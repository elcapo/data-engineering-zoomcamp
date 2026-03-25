import { describe, it, expect } from "vitest";
import {
  buildTsquery,
  buildTsqueryFromString,
  type BooleanTerm,
} from "@/lib/search/query-builder";

describe("buildTsqueryFromString", () => {
  it("devuelve null para cadena vacía", () => {
    expect(buildTsqueryFromString("")).toBeNull();
    expect(buildTsqueryFromString("   ")).toBeNull();
  });

  it("una sola palabra produce búsqueda de prefijo", () => {
    expect(buildTsqueryFromString("convocatoria")).toBe("convocatoria:*");
  });

  it("varias palabras se unen con AND implícito", () => {
    expect(buildTsqueryFromString("beca universitaria")).toBe("beca:* & universitaria:*");
  });

  it("elimina caracteres especiales que romperían tsquery", () => {
    expect(buildTsqueryFromString("beca's")).toBe("becas:*");
    expect(buildTsqueryFromString("A&B")).toBe("ab:*");
  });
});

describe("buildTsquery", () => {
  it("devuelve null para lista vacía", () => {
    expect(buildTsquery([])).toBeNull();
  });

  it("un término include produce búsqueda de prefijo", () => {
    const terms: BooleanTerm[] = [{ value: "convocatoria", mode: "include" }];
    expect(buildTsquery(terms)).toBe("convocatoria:*");
  });

  it("término excluido se prefija con !", () => {
    const terms: BooleanTerm[] = [{ value: "universidad", mode: "exclude" }];
    expect(buildTsquery(terms)).toBe("!universidad:*");
  });

  it("dos includes del mismo grupo se unen con OR", () => {
    const terms: BooleanTerm[] = [
      { value: "convocatoria", mode: "include", group: 0 },
      { value: "beca", mode: "include", group: 0 },
    ];
    expect(buildTsquery(terms)).toBe("(convocatoria:* | beca:*)");
  });

  it("grupos distintos se unen con AND", () => {
    const terms: BooleanTerm[] = [
      { value: "convocatoria", mode: "include", group: 0 },
      { value: "beca", mode: "include", group: 0 },
      { value: "educacion", mode: "include", group: 1 },
    ];
    expect(buildTsquery(terms)).toBe("(convocatoria:* | beca:*) & educacion:*");
  });

  it("combina includes y excludes", () => {
    const terms: BooleanTerm[] = [
      { value: "convocatoria", mode: "include", group: 0 },
      { value: "beca", mode: "include", group: 0 },
      { value: "universidad", mode: "exclude" },
    ];
    expect(buildTsquery(terms)).toBe("(convocatoria:* | beca:*) & !universidad:*");
  });
});
