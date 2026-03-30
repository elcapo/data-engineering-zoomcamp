import { NextResponse } from "next/server";
import { FiltersRepository } from "@/lib/db/repositories/filters";

export async function GET() {
  try {
    const [sections, organizations] = await Promise.all([
      FiltersRepository.getSections(),
      FiltersRepository.getOrganizations(),
    ]);
    return NextResponse.json({ sections, organizations });
  } catch (error) {
    console.error("GET /api/filters error:", error);
    return NextResponse.json({ error: "Error al obtener filtros" }, { status: 500 });
  }
}
