import { NextResponse } from "next/server";
import { MetricsRepository } from "@/lib/db/repositories/metrics";

export async function GET() {
  try {
    const details = await MetricsRepository.getArchiveDetails();
    return NextResponse.json(details);
  } catch (error) {
    console.error("GET /api/metrics/archive-details error:", error);
    return NextResponse.json({ error: "Error al obtener detalle del archivo" }, { status: 500 });
  }
}
