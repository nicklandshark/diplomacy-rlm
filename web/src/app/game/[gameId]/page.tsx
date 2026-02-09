import fs from "fs";
import path from "path";
import { listPhases } from "@/lib/game-data";
import GameView from "./GameView";

export const dynamic = "force-dynamic";

// Cache SVG at module scope — the file never changes at runtime, so
// reading it once per server process eliminates redundant fs.readFileSync
// calls on every request.
let _svgCache: string | null = null;
function getSvgContent(): string {
  if (!_svgCache) {
    const svgPath = path.join(process.cwd(), "public", "standard-base.svg");
    try {
      _svgCache = fs.readFileSync(svgPath, "utf-8");
    } catch {
      _svgCache = "";
    }
  }
  return _svgCache;
}

export default async function GamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const phases = listPhases(gameId);
  const svgContent = getSvgContent();

  return <GameView gameId={gameId} initialPhases={phases} svgContent={svgContent} />;
}
