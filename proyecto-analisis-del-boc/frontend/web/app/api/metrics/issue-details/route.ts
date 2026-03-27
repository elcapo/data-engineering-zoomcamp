import { NextRequest, NextResponse } from "next/server";
import { MetricsRepository } from "@/lib/db/repositories/metrics";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const yearParam = searchParams.get("year");
  const issueParam = searchParams.get("issue");
  const pageParam = searchParams.get("page") ?? "1";
  const pageSizeParam = searchParams.get("pageSize") ?? "50";

  if (!yearParam || !issueParam || Number.isNaN(Number(yearParam)) || Number.isNaN(Number(issueParam))) {
    return NextResponse.json({ error: "Parámetros 'year' e 'issue' requeridos" }, { status: 400 });
  }

  const page = Math.max(1, Number(pageParam));
  const pageSize = Math.min(100, Math.max(1, Number(pageSizeParam)));

  try {
    const result = await MetricsRepository.getIssueDetails(Number(yearParam), Number(issueParam), page, pageSize);
    return NextResponse.json(result);
  } catch (error) {
    console.error("GET /api/metrics/issue-details error:", error);
    return NextResponse.json({ error: "Error al obtener detalle del boletín" }, { status: 500 });
  }
}
