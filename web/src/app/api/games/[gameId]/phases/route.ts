import { NextResponse } from "next/server";
import { listPhases } from "@/lib/game-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  return NextResponse.json(listPhases(gameId), {
    headers: { "Cache-Control": "public, max-age=5" },
  });
}
