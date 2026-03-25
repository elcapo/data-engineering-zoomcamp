/**
 * Tests de integración — MetricsRepository
 *
 * Requieren DATABASE_URL activo en .env (conexión a boc_log).
 * Se ejecutan contra la BD real: no usan mocks.
 */
import { describe, it, expect, afterAll } from "vitest";
import { MetricsRepository } from "@/lib/db/repositories/metrics";
import { prisma } from "@/lib/db/prisma";

afterAll(async () => {
  await prisma.$disconnect();
});

describe("MetricsRepository.getDataQualityReport", () => {
  it("devuelve un reporte con la estructura esperada", async () => {
    const report = await MetricsRepository.getDataQualityReport();

    expect(report.downloads).toBeDefined();
    expect(report.extractions).toBeDefined();
    expect(report.downloads.years).toBeDefined();
    expect(report.downloads.issues).toBeDefined();
    expect(report.downloads.documents).toBeDefined();
    expect(report.extractions.years).toBeDefined();
    expect(report.extractions.issues).toBeDefined();
    expect(report.extractions.documents).toBeDefined();
  });

  it("los totales de descarga son positivos", async () => {
    const { downloads } = await MetricsRepository.getDataQualityReport();
    expect(downloads.years.total).toBeGreaterThan(0);
    expect(downloads.years.downloaded).toBeGreaterThanOrEqual(0);
    expect(downloads.years.downloaded).toBeLessThanOrEqual(downloads.years.total);
  });

  it("los porcentajes están entre 0 y 100", async () => {
    const report = await MetricsRepository.getDataQualityReport();

    expect(report.downloads.years.percentage).toBeGreaterThanOrEqual(0);
    expect(report.downloads.years.percentage).toBeLessThanOrEqual(100);

    for (const row of report.downloads.issues) {
      expect(row.percentage).toBeGreaterThanOrEqual(0);
      expect(row.percentage).toBeLessThanOrEqual(100);
    }
  });

  it("hay datos por año desde 1980 en adelante", async () => {
    const { downloads } = await MetricsRepository.getDataQualityReport();
    const years = downloads.issues.map((r) => r.year);
    expect(Math.min(...years)).toBeGreaterThanOrEqual(1980);
  });

  it("los totales de extracción no superan los descargados", async () => {
    const { extractions } = await MetricsRepository.getDataQualityReport();
    expect(extractions.years.extracted).toBeLessThanOrEqual(
      extractions.years.total
    );
  });
});
