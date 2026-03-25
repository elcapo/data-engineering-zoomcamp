import { prisma } from "../prisma";
import { Bulletin, SectionCount } from "@/types/domain";

export const BulletinRepository = {
  /**
   * Devuelve los N boletines más recientes con conteo de disposiciones por sección.
   */
  async findRecent(limit = 5): Promise<Bulletin[]> {
    const issues = await prisma.issue.findMany({
      orderBy: [{ year: "desc" }, { issue: "desc" }],
      take: limit,
      include: {
        dispositions: {
          select: { section: true },
        },
      },
    });

    return issues.map(tobulletin);
  },

  /**
   * Devuelve un boletín concreto con el detalle completo de sus disposiciones por sección.
   */
  async findByYearAndIssue(year: number, issue: number): Promise<Bulletin | null> {
    const row = await prisma.issue.findFirst({
      where: { year: BigInt(year), issue: BigInt(issue) },
      include: {
        dispositions: {
          select: { section: true },
          orderBy: { dltListIdx: "asc" },
        },
      },
    });

    return row ? tobulletin(row) : null;
  },
};

// ── mappers ───────────────────────────────────────────────────────────────

type IssueWithDispositions = Awaited<ReturnType<typeof prisma.issue.findFirst>> & {
  dispositions: { section: string | null }[];
};

function tobulletin(row: NonNullable<IssueWithDispositions>): Bulletin {
  const sectionCounts = countBySection(row.dispositions);

  return {
    year: Number(row.year),
    issue: Number(row.issue),
    title: row.title ?? `BOC Nº ${row.issue}`,
    date: extractDate(row.title),
    url: row.url ?? "",
    summaryPdfUrl: row.summaryUrl ?? "",
    dispositionCount: row.dispositions.length,
    sectionCounts,
  };
}

function countBySection(dispositions: { section: string | null }[]): SectionCount[] {
  const counts = new Map<string, number>();
  for (const { section } of dispositions) {
    const key = section ?? "Sin sección";
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([section, count]) => ({ section, count }))
    .sort((a, b) => a.section.localeCompare(b.section));
}

// El título del boletín tiene el formato "BOC Nº X - Día D de mes de YYYY"
function extractDate(title: string | null): string {
  if (!title) return "";
  const match = title.match(/\d{1,2}\s+de\s+\w+\s+de\s+\d{4}/i);
  return match ? match[0] : "";
}
