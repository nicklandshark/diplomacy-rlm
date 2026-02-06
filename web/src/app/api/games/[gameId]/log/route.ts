import { NextResponse } from "next/server";
import { readGameLog } from "@/lib/game-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  return NextResponse.json(readGameLog(gameId));
}
