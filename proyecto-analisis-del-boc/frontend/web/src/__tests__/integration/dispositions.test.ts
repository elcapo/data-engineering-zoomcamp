/**
 * Tests de integración — DispositionRepository
 *
 * Requieren DATABASE_URL activo en .env (conexión a boc_dataset).
 * Se ejecutan contra la BD real: no usan mocks.
 */
import { describe, it, expect, afterAll } from "vitest";
import { DispositionRepository } from "@/lib/db/repositories/dispositions";
import { BulletinRepository } from "@/lib/db/repositories/bulletins";
import { prisma } from "@/lib/db/prisma";

afterAll(async () => {
  await prisma.$disconnect();
});

describe("DispositionRepository.search — sin filtros", () => {
  it("devuelve resultados con límite por defecto", async () => {
    const result = await DispositionRepository.search({});
    expect(result.results.length).toBeGreaterThan(0);
    expect(result.results.length).toBeLessThanOrEqual(20);
    expect(result.total).toBeGreaterThan(0);
  });

  it("respeta el parámetro limit", async () => {
    const result = await DispositionRepository.search({}, undefined, 5);
    expect(result.results.length).toBeLessThanOrEqual(5);
  });

  it("cada disposición tiene los campos obligatorios", async () => {
    const { results } = await DispositionRepository.search({}, undefined, 3);
    for (const d of results) {
      expect(d.year).toBeGreaterThan(1979);
      expect(d.issue).toBeGreaterThan(0);
      expect(d.number).toBeTruthy();
    }
  });

  it("los resultados están ordenados descendentemente por año y boletín", async () => {
    const { results } = await DispositionRepository.search({}, undefined, 10);
    for (let i = 1; i < results.length; i++) {
      const prev = results[i - 1];
      const curr = results[i];
      const prevScore = prev.year * 10000 + prev.issue;
      const currScore = curr.year * 10000 + curr.issue;
      expect(prevScore).toBeGreaterThanOrEqual(currScore);
    }
  });
});

describe("DispositionRepository.search — filtro por sección", () => {
  it("todos los resultados pertenecen a la sección filtrada", async () => {
    const { results } = await DispositionRepository.search({ section: ["I"] }, undefined, 10);
    for (const d of results) {
      expect(d.section).toBe("I");
    }
  });
});

describe("DispositionRepository.search — full-text", () => {
  it("devuelve resultados para un término común", async () => {
    const { results, total } = await DispositionRepository.search(
      { q: "convocatoria" },
      undefined,
      5
    );
    expect(total).toBeGreaterThan(0);
    expect(results.length).toBeGreaterThan(0);
  });

  it("los resultados de búsqueda incluyen un fragmento resaltado", async () => {
    const { results } = await DispositionRepository.search(
      { q: "convocatoria" },
      undefined,
      3
    );
    const withExcerpt = results.filter((d) => d.excerpt);
    // Al menos algunos resultados tienen texto extraído para resaltar
    expect(withExcerpt.length).toBeGreaterThan(0);
  });

  it("un término inexistente devuelve 0 resultados", async () => {
    const { results, total } = await DispositionRepository.search(
      { q: "xzqwerty1234567" },
      undefined,
      5
    );
    expect(total).toBe(0);
    expect(results).toHaveLength(0);
  });
});

describe("DispositionRepository.search — paginación por cursor", () => {
  it("nextCursor es null cuando hay menos resultados que el límite", async () => {
    const { nextCursor } = await DispositionRepository.search(
      { q: "xzqwerty1234567" }
    );
    expect(nextCursor).toBeNull();
  });

  it("la segunda página no repite resultados de la primera", async () => {
    const page1 = await DispositionRepository.search({}, undefined, 5);
    if (!page1.nextCursor) return; // No hay suficientes datos para paginar

    const page2 = await DispositionRepository.search({}, page1.nextCursor, 5);
    const ids1 = new Set(page1.results.map((d) => `${d.year}-${d.issue}-${d.number}`));
    for (const d of page2.results) {
      expect(ids1.has(`${d.year}-${d.issue}-${d.number}`)).toBe(false);
    }
  });
});

describe("DispositionRepository.findByIdentifier", () => {
  it("localiza una disposición existente", async () => {
    // Toma una disposición real del boletín más reciente
    const [bulletin] = await BulletinRepository.findRecent(1);
    const { results } = await DispositionRepository.search(
      { year: bulletin.year, issue: bulletin.issue },
      undefined,
      1
    );
    if (results.length === 0) return;

    const [ref] = results;
    const found = await DispositionRepository.findByIdentifier(
      ref.year,
      ref.issue,
      ref.number
    );
    expect(found).not.toBeNull();
    expect(found!.year).toBe(ref.year);
    expect(found!.issue).toBe(ref.issue);
    expect(found!.number).toBe(ref.number);
  });

  it("devuelve null para identificador inexistente", async () => {
    const result = await DispositionRepository.findByIdentifier(1900, 999, "0");
    expect(result).toBeNull();
  });
});
