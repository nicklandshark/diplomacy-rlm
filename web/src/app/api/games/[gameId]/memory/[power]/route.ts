import { NextResponse } from "next/server";
import { readMemory } from "@/lib/game-data";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameId: string; power: string }> }
) {
  const { gameId, power } = await params;
  const url = new URL(request.url);
  const phase = url.searchParams.get("phase") || undefined;
  const content = readMemory(gameId, power.toUpperCase(), phase);
  if (content === null) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ content });
}
