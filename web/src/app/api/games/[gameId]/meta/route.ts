import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { getGameDir } from "@/lib/game-data";

/**
 * GET /api/games/[gameId]/meta
 *
 * Returns the .game_meta.json for a game (backend, model, powers config).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> },
) {
  const { gameId } = await params;
  const metaPath = path.join(getGameDir(gameId), ".game_meta.json");

  if (!fs.existsSync(metaPath)) {
    return NextResponse.json({ gameId, backend: null, model: null, powers: null });
  }

  try {
    const raw = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
    return NextResponse.json({
      gameId,
      backend: raw.backend ?? null,
      model: raw.model ?? null,
      powers: raw.powers ?? null,
    });
  } catch {
    return NextResponse.json({ gameId, backend: null, model: null, powers: null });
  }
}
