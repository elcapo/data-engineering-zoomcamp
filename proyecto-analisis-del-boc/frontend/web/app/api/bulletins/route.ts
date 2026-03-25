import { NextRequest, NextResponse } from "next/server";
import { BulletinRepository } from "@/lib/db/repositories/bulletins";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const rawLimit = parseInt(searchParams.get("limit") ?? "", 10);
  const limit = Math.min(Math.max(Number.isNaN(rawLimit) ? 5 : rawLimit, 1), 50);

  try {
    const bulletins = await BulletinRepository.findRecent(limit);
    return NextResponse.json(bulletins);
  } catch (error) {
    console.error("GET /api/bulletins error:", error);
    return NextResponse.json({ error: "Error al obtener boletines" }, { status: 500 });
  }
}
