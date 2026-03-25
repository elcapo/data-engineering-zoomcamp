import { NextResponse } from "next/server";
import { MetricsRepository } from "@/lib/db/repositories/metrics";

export async function GET() {
  try {
    const report = await MetricsRepository.getDataQualityReport();
    return NextResponse.json(report);
  } catch (error) {
    console.error("GET /api/metrics error:", error);
    return NextResponse.json({ error: "Error al obtener metricas" }, { status: 500 });
  }
}
