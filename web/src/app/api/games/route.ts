import { NextResponse } from "next/server";
import { listGames } from "@/lib/game-data";

export async function GET() {
  return NextResponse.json(listGames());
}
