import { Prisma } from "../../../../app/generated/prisma/client";
import { prisma } from "../prisma";

export interface SitemapYear {
  year: number;
}

export interface SitemapBulletin {
  year: number;
  issue: number;
}

export interface SitemapDisposition {
  year: number;
  issue: number;
  number: string;
}

export const SitemapRepository = {
  /** Todos los años con al menos un boletín. */
  async getYears(): Promise<SitemapYear[]> {
    const rows = await prisma.$queryRaw<{ year: bigint }[]>`
      SELECT DISTINCT year FROM boc_dataset.issue ORDER BY year DESC
    `;
    return rows.map((r) => ({ year: Number(r.year) }));
  },

  /** Todos los boletines (year + issue). */
  async getBulletins(): Promise<SitemapBulletin[]> {
    const rows = await prisma.$queryRaw<{ year: bigint; issue: bigint }[]>`
      SELECT year, issue FROM boc_dataset.issue ORDER BY year DESC, issue DESC
    `;
    return rows.map((r) => ({ year: Number(r.year), issue: Number(r.issue) }));
  },

  /** Todas las disposiciones (year + issue + number), paginadas por año. */
  async getDispositionsByYear(year: number): Promise<SitemapDisposition[]> {
    const rows = await prisma.$queryRaw<{ year: bigint; issue: bigint; disposition: bigint }[]>`
      SELECT i.year, i.issue, id.disposition
      FROM boc_dataset.issue__dispositions id
      JOIN boc_dataset.issue i ON id._dlt_root_id = i._dlt_id
      WHERE i.year = ${BigInt(year)}
      ORDER BY i.issue ASC, id.disposition ASC
    `;
    return rows.map((r) => ({
      year: Number(r.year),
      issue: Number(r.issue),
      number: String(r.disposition),
    }));
  },

  /** Cuenta total de disposiciones (para decidir si hace falta sitemap index). */
  async countDispositions(): Promise<number> {
    const rows = await prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*) AS count FROM boc_dataset.issue__dispositions
    `;
    return Number(rows[0].count);
  },
};
