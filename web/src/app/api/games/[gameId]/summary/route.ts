import { NextResponse } from "next/server";
import { readGameSummary } from "@/lib/game-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const summary = readGameSummary(gameId);
  if (!summary) return NextResponse.json(null, { status: 404 });
  return NextResponse.json(summary);
}
