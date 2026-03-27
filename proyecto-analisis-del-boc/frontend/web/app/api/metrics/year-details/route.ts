import { NextRequest, NextResponse } from "next/server";
import { MetricsRepository } from "@/lib/db/repositories/metrics";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const yearParam = searchParams.get("year");

  if (!yearParam || Number.isNaN(Number(yearParam))) {
    return NextResponse.json({ error: "Parámetro 'year' requerido" }, { status: 400 });
  }

  try {
    const details = await MetricsRepository.getYearDetails(Number(yearParam));
    return NextResponse.json(details);
  } catch (error) {
    console.error("GET /api/metrics/year-details error:", error);
    return NextResponse.json({ error: "Error al obtener detalle del año" }, { status: 500 });
  }
}
