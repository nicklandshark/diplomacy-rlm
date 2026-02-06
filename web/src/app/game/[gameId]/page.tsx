import { listPhases } from "@/lib/game-data";
import GameView from "./GameView";

export const dynamic = "force-dynamic";

export default async function GamePage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const phases = listPhases(gameId);

  // Load SVG content on server side
  const fs = await import("fs");
  const path = await import("path");
  const svgPath = path.join(process.cwd(), "public", "standard-base.svg");
  let svgContent = "";
  try {
    svgContent = fs.readFileSync(svgPath, "utf-8");
  } catch {
    // SVG file not found
  }

  return <GameView gameId={gameId} initialPhases={phases} svgContent={svgContent} />;
}
