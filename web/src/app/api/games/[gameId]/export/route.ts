import { NextResponse } from "next/server";
import {
  listPhases,
  readPhaseState,
  readPhaseOrders,
  readPhaseResults,
  readPhaseMessages,
  readMemory,
  readGameSummary,
  readGameLog,
} from "@/lib/game-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const phases = listPhases(gameId);
  if (phases.length === 0) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  // Collect all powers from the first phase state
  const firstState = readPhaseState(gameId, phases[0]);
  const powers = firstState ? Object.keys(firstState.units || {}) : [];

  // Bundle every phase's snapshot data
  const phaseData = phases.map((phase) => ({
    phase,
    state: readPhaseState(gameId, phase),
    orders: readPhaseOrders(gameId, phase),
    results: readPhaseResults(gameId, phase),
    messages: readPhaseMessages(gameId, phase),
  }));

  // Collect final memories for each power
  const memories: Record<string, string | null> = {};
  for (const power of powers) {
    memories[power] = readMemory(gameId, power);
  }

  const payload = {
    gameId,
    exportedAt: new Date().toISOString(),
    phases: phaseData,
    summary: readGameSummary(gameId),
    log: readGameLog(gameId),
    memories,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="${gameId}-replay.json"`,
    },
  });
}
