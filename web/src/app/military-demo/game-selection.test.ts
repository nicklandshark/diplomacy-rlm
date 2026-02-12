import { describe, expect, it } from "vitest";
import { firstQueryValue, resolveMilitaryDemoGame } from "./game-selection";

describe("military-demo game selection", () => {
  const baseFields = {
    meta: null,
    gameOver: false,
    finalStandings: [],
    finalCenters: {},
    finalInfluence: {},
  };

  const games = [
    {
      id: "game1",
      path: "/runs/game1",
      phases: ["S1901M", "F1901M"],
      lastPhase: "F1901M",
      powers: ["FRANCE", "GERMANY"],
      hasLog: true,
      ...baseFields,
    },
    {
      id: "game2",
      path: "/runs/game2",
      phases: ["S1901M", "F1901M", "S1902M"],
      lastPhase: "S1902M",
      powers: ["AUSTRIA", "FRANCE", "RUSSIA"],
      hasLog: true,
      ...baseFields,
    },
  ];

  it("returns first query value from arrays", () => {
    expect(firstQueryValue(["game2", "game1"])).toBe("game2");
    expect(firstQueryValue("game1")).toBe("game1");
    expect(firstQueryValue(undefined)).toBeUndefined();
  });

  it("uses requested game id when present", () => {
    expect(
      resolveMilitaryDemoGame({
        games,
        requestedGameId: "game1",
      }),
    ).toMatchObject({
      mode: "live",
      gameId: "game1",
      phases: ["S1901M", "F1901M"],
    });
  });

  it("falls back to latest game when requested id is missing", () => {
    expect(
      resolveMilitaryDemoGame({
        games,
        requestedGameId: "missing",
      }),
    ).toMatchObject({
      mode: "live",
      gameId: "game2",
      phases: ["S1901M", "F1901M", "S1902M"],
    });
  });

  it("prefers mock mode when explicitly requested", () => {
    expect(
      resolveMilitaryDemoGame({
        games,
        useMock: true,
        mockGameId: "demo",
        mockPhases: ["S1901M", "F1901M"],
      }),
    ).toMatchObject({
      mode: "mock",
      gameId: "demo",
      phases: ["S1901M", "F1901M"],
    });
  });

  it("returns empty mode when there are no games and no mock", () => {
    expect(
      resolveMilitaryDemoGame({
        games: [],
      }),
    ).toMatchObject({
      mode: "empty",
      gameId: null,
      phases: [],
    });
  });
});
