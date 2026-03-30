import { NextRequest, NextResponse } from "next/server";
import { DispositionRepository } from "@/lib/db/repositories/dispositions";
import type { SearchFilters, DateRangeFilter } from "@/types/domain";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const filters: SearchFilters = {};

  const q = searchParams.get("q");
  if (q) filters.q = q;

  // Secciones (nuevo formato con prefijo, con fallback al formato legacy)
  const includeSections = searchParams.getAll("include_section");
  const excludeSections = searchParams.getAll("exclude_section");
  const legacySections = searchParams.getAll("section");

  if (includeSections.length > 0) filters.section = includeSections;
  else if (legacySections.length > 0) filters.section = legacySections;
  if (excludeSections.length > 0) filters.excludeSection = excludeSections;

  // Organismos (nuevo formato con prefijo, con fallback)
  const includeOrgs = searchParams.getAll("include_org");
  const excludeOrgs = searchParams.getAll("exclude_org");
  const legacyOrg = searchParams.get("org");

  if (includeOrgs.length > 0) filters.org = includeOrgs;
  else if (legacyOrg) filters.org = [legacyOrg];
  if (excludeOrgs.length > 0) filters.excludeOrg = excludeOrgs;

  // Rangos de fecha (indexados: include_from_0, include_to_0, ...)
  filters.dateRanges = parseDateRangeParams(searchParams, "include");
  filters.excludeDateRanges = parseDateRangeParams(searchParams, "exclude");

  // Legacy: from/to sin prefijo
  if (!filters.dateRanges?.length) {
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    if (from || to) {
      filters.dateRanges = [{ from: from ?? undefined, to: to ?? undefined }];
    }
  }

  const cursor = searchParams.get("cursor") ?? undefined;
  const rawLimit = parseInt(searchParams.get("limit") ?? "", 10);
  const limit = Math.min(Math.max(Number.isNaN(rawLimit) ? 20 : rawLimit, 1), 100);

  if (process.env.NODE_ENV === "development") {
    console.log("[search] params:", Object.fromEntries(searchParams.entries()));
    console.log("[search] filters:", JSON.stringify(filters));
    console.log("[search] cursor:", cursor, "limit:", limit);
  }

  try {
    const result = await DispositionRepository.search(filters, cursor, limit);
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/search error:", error);
    return NextResponse.json({ error: "Error en la busqueda" }, { status: 500 });
  }
}

function parseDateRangeParams(params: URLSearchParams, mode: string): DateRangeFilter[] | undefined {
  const ranges: DateRangeFilter[] = [];
  for (let i = 0; i < 10; i++) {
    const from = params.get(`${mode}_from_${i}`) ?? undefined;
    const to = params.get(`${mode}_to_${i}`) ?? undefined;
    if (!from && !to) break;
    ranges.push({ from, to });
  }
  return ranges.length > 0 ? ranges : undefined;
}
