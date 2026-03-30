import { prisma } from "../prisma";

type LabelRow = { label: string };

export const FiltersRepository = {
  async getSections(): Promise<string[]> {
    const rows = await prisma.$queryRaw<LabelRow[]>`
      SELECT section AS label FROM boc_dataset.sections ORDER BY section
    `;
    return rows.map((r) => r.label);
  },

  async getOrganizations(): Promise<string[]> {
    const rows = await prisma.$queryRaw<LabelRow[]>`
      SELECT organization AS label FROM boc_dataset.organizations ORDER BY organization
    `;
    return rows.map((r) => r.label);
  },
};
