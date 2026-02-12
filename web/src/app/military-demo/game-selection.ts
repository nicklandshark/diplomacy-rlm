import type { GameSummary } from "@/lib/types";

export interface ResolveMilitaryDemoGameOptions {
  games: GameSummary[];
  requestedGameId?: string;
  useMock?: boolean;
  mockGameId?: string;
  mockPhases?: string[];
}

export interface ResolvedMilitaryDemoGame {
  mode: "live" | "mock" | "empty";
  gameId: string | null;
  phases: string[];
}

export function firstQueryValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export function resolveMilitaryDemoGame({
  games,
  requestedGameId,
  useMock = false,
  mockGameId = "demo",
  mockPhases = [],
}: ResolveMilitaryDemoGameOptions): ResolvedMilitaryDemoGame {
  if (useMock) {
    return {
      mode: "mock",
      gameId: mockGameId,
      phases: [...mockPhases],
    };
  }

  if (games.length === 0) {
    return {
      mode: "empty",
      gameId: null,
      phases: [],
    };
  }

  const requested = requestedGameId
    ? games.find((game) => game.id === requestedGameId)
    : null;

  if (requested) {
    return {
      mode: "live",
      gameId: requested.id,
      phases: [...requested.phases],
    };
  }

  const latest = games[games.length - 1];
  return {
    mode: "live",
    gameId: latest.id,
    phases: [...latest.phases],
  };
}
