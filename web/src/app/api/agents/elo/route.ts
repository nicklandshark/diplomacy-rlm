import { NextRequest, NextResponse } from "next/server";
import { computeAgentRatings, parseRatingSystems, toLegacyEloRatings } from "@/lib/agent-elo";

function parseNonNegativeInt(raw: string | null): number | undefined {
  if (!raw) return undefined;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || Number.isNaN(value)) return undefined;
  return Math.max(0, value);
}

export async function GET(request: NextRequest) {
  const systems = parseRatingSystems(request.nextUrl.searchParams.get("systems"));
  const minGames = parseNonNegativeInt(request.nextUrl.searchParams.get("minGames"));
  const limit = parseNonNegativeInt(request.nextUrl.searchParams.get("limit"));

  const bundle = computeAgentRatings({ systems, minGames, limit });
  const eloCore = bundle.systems.find((system) => system.id === "elo_core");
  const ratings = toLegacyEloRatings(eloCore?.ratings ?? []);

  return NextResponse.json({
    system: "elo",
    base: eloCore?.parameters.baseRating ?? 1500,
    kFactor: eloCore?.parameters.kFactor ?? 24,
    ratings,
    bundle,
  });
}
