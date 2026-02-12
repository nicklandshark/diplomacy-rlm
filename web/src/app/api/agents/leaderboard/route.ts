import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { computeAgentEloRatings } from "@/lib/agent-elo";
import { readGameSummary, getGameDir } from "@/lib/game-data";

export interface LeaderboardEntry {
  rank: number;
  power: string;
  agentKey: string;
  backend: string;
  model: string;
  scs: number;
  units: number;
  delta: number;
  elo: number | null;
  eloGames: number;
  record: { wins: number; draws: number; losses: number };
}

export interface LeaderboardResponse {
  gameId: string | null;
  phase: string | null;
  entries: LeaderboardEntry[];
  eloBase: number;
}

/**
 * GET /api/agents/leaderboard?gameId=game19
 *
 * Returns per-power standings for a specific game merged with cross-game ELO.
 * If no gameId is provided, returns only the cross-game ELO rankings.
 */
export async function GET(request: NextRequest) {
  const gameId = request.nextUrl.searchParams.get("gameId");

  const eloRatings = computeAgentEloRatings();
  const eloMap = new Map(eloRatings.map((r) => [r.agentKey, r]));

  if (!gameId) {
    const entries: LeaderboardEntry[] = eloRatings.map((r, i) => ({
      rank: i + 1,
      power: "",
      agentKey: r.agentKey,
      backend: r.backend,
      model: r.model,
      scs: 0,
      units: 0,
      delta: 0,
      elo: r.rating,
      eloGames: r.games,
      record: { wins: r.wins, draws: r.draws, losses: r.losses },
    }));
    return NextResponse.json({ gameId: null, phase: null, entries, eloBase: 1500 } satisfies LeaderboardResponse);
  }

  const summary = readGameSummary(gameId);
  if (!summary) {
    return NextResponse.json({ gameId, phase: null, entries: [], eloBase: 1500 } satisfies LeaderboardResponse);
  }

  const { phases, scHistory, finalStandings } = summary;
  const lastPhase = phases[phases.length - 1] ?? null;

  // Read .game_meta.json for agent identity per power
  let metaTopBackend = "";
  let metaTopModel = "";
  let gameMeta: Record<string, { backend?: string; model?: string }> | null = null;
  try {
    const metaPath = path.join(getGameDir(gameId), ".game_meta.json");
    if (fs.existsSync(metaPath)) {
      const raw = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
      metaTopBackend = raw.backend ?? "";
      metaTopModel = raw.model ?? "";
      gameMeta = raw.powers ?? null;
    }
  } catch {
    // No meta — agents will show as "unknown"
  }

  const entries: LeaderboardEntry[] = finalStandings.map((standing, i) => {
    const counts = scHistory[standing.power] || [];
    const current = counts[counts.length - 1] ?? 0;

    // Find the last phase where this power's SC count was different (skip
    // adjustment phases that duplicate the previous movement phase's count).
    let delta = 0;
    for (let j = counts.length - 2; j >= 0; j--) {
      if (counts[j] !== current) {
        delta = current - counts[j];
        break;
      }
    }

    // Resolve agent identity — per-power override, then top-level fallback
    const powerMeta = gameMeta?.[standing.power];
    const backend = (powerMeta?.backend || metaTopBackend || "unknown").trim().toLowerCase();
    const model = (powerMeta?.model || metaTopModel || "unknown").trim();
    const agentKey = `${backend}:${model}`;

    const eloEntry = eloMap.get(agentKey);

    return {
      rank: i + 1,
      power: standing.power,
      agentKey,
      backend,
      model,
      scs: current,
      units: standing.units,
      delta,
      elo: eloEntry?.rating ?? null,
      eloGames: eloEntry?.games ?? 0,
      record: {
        wins: eloEntry?.wins ?? 0,
        draws: eloEntry?.draws ?? 0,
        losses: eloEntry?.losses ?? 0,
      },
    };
  });

  return NextResponse.json({ gameId, phase: lastPhase, entries, eloBase: 1500 } satisfies LeaderboardResponse);
}
