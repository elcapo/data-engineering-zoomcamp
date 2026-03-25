/**
 * Tests de integración — BulletinRepository
 *
 * Requieren DATABASE_URL activo en .env (conexión a boc_dataset).
 * Se ejecutan contra la BD real: no usan mocks.
 */
import { describe, it, expect, afterAll } from "vitest";
import { BulletinRepository } from "@/lib/db/repositories/bulletins";
import { prisma } from "@/lib/db/prisma";

afterAll(async () => {
  await prisma.$disconnect();
});

describe("BulletinRepository.findRecent", () => {
  it("devuelve el número solicitado de boletines", async () => {
    const bulletins = await BulletinRepository.findRecent(3);
    expect(bulletins).toHaveLength(3);
  });

  it("los boletines están ordenados del más reciente al más antiguo", async () => {
    const bulletins = await BulletinRepository.findRecent(5);
    for (let i = 1; i < bulletins.length; i++) {
      const prev = bulletins[i - 1];
      const curr = bulletins[i];
      const prevScore = prev.year * 1000 + prev.issue;
      const currScore = curr.year * 1000 + curr.issue;
      expect(prevScore).toBeGreaterThanOrEqual(currScore);
    }
  });

  it("cada boletín tiene año, número y al menos una disposición", async () => {
    const [bulletin] = await BulletinRepository.findRecent(1);
    expect(bulletin.year).toBeGreaterThan(1979);
    expect(bulletin.issue).toBeGreaterThan(0);
    expect(bulletin.dispositionCount).toBeGreaterThan(0);
  });

  it("sectionCounts cubre todas las disposiciones del boletín", async () => {
    const [bulletin] = await BulletinRepository.findRecent(1);
    const totalFromSections = bulletin.sectionCounts.reduce(
      (sum, s) => sum + s.count,
      0
    );
    expect(totalFromSections).toBe(bulletin.dispositionCount);
  });
});

describe("BulletinRepository.findByYearAndIssue", () => {
  it("recupera un boletín concreto por año y número", async () => {
    // Tomamos el boletín más reciente como referencia
    const [recent] = await BulletinRepository.findRecent(1);
    const bulletin = await BulletinRepository.findByYearAndIssue(
      recent.year,
      recent.issue
    );
    expect(bulletin).not.toBeNull();
    expect(bulletin!.year).toBe(recent.year);
    expect(bulletin!.issue).toBe(recent.issue);
  });

  it("devuelve null para un boletín inexistente", async () => {
    const result = await BulletinRepository.findByYearAndIssue(1900, 999);
    expect(result).toBeNull();
  });
});
