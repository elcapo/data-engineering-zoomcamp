import { prisma } from "../prisma";
import type { FacetBucket } from "@/types/domain";

type LabelRow = { label: string };
type LabelCountRow = { label: string; count: bigint };

export const FiltersRepository = {
  async getSections(): Promise<string[]> {
    const rows = await prisma.$queryRaw<LabelRow[]>`
      SELECT section AS label FROM boc_dataset.sections ORDER BY dispositions DESC
    `;
    return rows.map((r) => r.label);
  },

  async getOrganizations(): Promise<string[]> {
    const rows = await prisma.$queryRaw<LabelRow[]>`
      SELECT organization AS label FROM boc_dataset.organizations ORDER BY dispositions DESC
    `;
    return rows.map((r) => r.label);
  },

  async getTopSections(limit = 10): Promise<{ top: FacetBucket[]; total: number }> {
    const rows = await prisma.$queryRaw<LabelCountRow[]>`
      SELECT section AS label, dispositions AS count
      FROM boc_dataset.sections
      ORDER BY dispositions DESC
    `;
    const all = rows.map((r) => ({ label: r.label, count: Number(r.count) }));
    const total = all.reduce((s, r) => s + r.count, 0);
    return { top: all.slice(0, limit), total };
  },

  async getTopOrganizations(limit = 10): Promise<{ top: FacetBucket[]; total: number }> {
    const rows = await prisma.$queryRaw<LabelCountRow[]>`
      SELECT organization AS label, dispositions AS count
      FROM boc_dataset.organizations
      ORDER BY dispositions DESC
    `;
    const all = rows.map((r) => ({ label: r.label, count: Number(r.count) }));
    const total = all.reduce((s, r) => s + r.count, 0);
    return { top: all.slice(0, limit), total };
  },
};
