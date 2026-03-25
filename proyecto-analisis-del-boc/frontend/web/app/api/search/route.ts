import { NextRequest, NextResponse } from "next/server";
import { DispositionRepository } from "@/lib/db/repositories/dispositions";
import { SearchFilters } from "@/types/domain";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const filters: SearchFilters = {};

  const q = searchParams.get("q");
  if (q) filters.q = q;

  const sections = searchParams.getAll("section");
  if (sections.length > 0) filters.section = sections;

  const subsections = searchParams.getAll("subsection");
  if (subsections.length > 0) filters.subsection = subsections;

  const org = searchParams.get("org");
  if (org) filters.org = org;

  const from = searchParams.get("from");
  if (from) filters.from = from;

  const to = searchParams.get("to");
  if (to) filters.to = to;

  const year = searchParams.get("year");
  if (year) filters.year = parseInt(year, 10) || undefined;

  const issue = searchParams.get("issue");
  if (issue) filters.issue = parseInt(issue, 10) || undefined;

  const cursor = searchParams.get("cursor") ?? undefined;
  const rawLimit = parseInt(searchParams.get("limit") ?? "", 10);
  const limit = Math.min(Math.max(Number.isNaN(rawLimit) ? 20 : rawLimit, 1), 100);

  try {
    const result = await DispositionRepository.search(filters, cursor, limit);
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/search error:", error);
    return NextResponse.json({ error: "Error en la busqueda" }, { status: 500 });
  }
}
