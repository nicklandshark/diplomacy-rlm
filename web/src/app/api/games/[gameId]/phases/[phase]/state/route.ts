import { NextResponse } from "next/server";
import { readPhaseState } from "@/lib/game-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ gameId: string; phase: string }> }
) {
  const { gameId, phase } = await params;
  const data = readPhaseState(gameId, phase);
  if (!data) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
