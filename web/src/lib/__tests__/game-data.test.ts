import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";

// ── Setup ────────────────────────────────────────────────────────────────────

let tmpDir: string;
let origGamesDir: string | undefined;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "diplomacy-data-test-"));
  origGamesDir = process.env.GAMES_DIR;
  process.env.GAMES_DIR = tmpDir;
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  if (origGamesDir !== undefined) {
    process.env.GAMES_DIR = origGamesDir;
  } else {
    delete process.env.GAMES_DIR;
  }
});

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Create a minimal game directory with snapshot phases */
function seedGame(
  gameId: string,
  phases: string[],
  opts?: {
    state?: Record<string, unknown>;
    orders?: Record<string, unknown>;
    results?: Record<string, unknown>;
    messages?: Record<string, unknown>;
    gameLog?: string;
    memory?: Record<string, string>; // power -> content
  }
) {
  const gameDir = path.join(tmpDir, gameId);
  const snapshotsDir = path.join(gameDir, "snapshots");

  for (const phase of phases) {
    const phaseDir = path.join(snapshotsDir, phase);
    fs.mkdirSync(phaseDir, { recursive: true });

    if (opts?.state) {
      fs.writeFileSync(
        path.join(phaseDir, "game_state.json"),
        JSON.stringify(opts.state),
      );
    }
    if (opts?.orders) {
      fs.writeFileSync(
        path.join(phaseDir, "orders.json"),
        JSON.stringify(opts.orders),
      );
    }
    if (opts?.results) {
      fs.writeFileSync(
        path.join(phaseDir, "results.json"),
        JSON.stringify(opts.results),
      );
    }
    if (opts?.messages) {
      fs.writeFileSync(
        path.join(phaseDir, "messages.json"),
        JSON.stringify(opts.messages),
      );
    }
    if (opts?.memory) {
      const memDir = path.join(phaseDir, "memory");
      fs.mkdirSync(memDir, { recursive: true });
      for (const [power, content] of Object.entries(opts.memory)) {
        fs.writeFileSync(path.join(memDir, `${power}_memory.md`), content);
      }
    }
  }

  if (opts?.gameLog !== undefined) {
    fs.writeFileSync(path.join(gameDir, "game_log.jsonl"), opts.gameLog);
  }
}

// ── Import the module under test ─────────────────────────────────────────────

import {
  listGames,
  listPhases,
  readPhaseState,
  readPhaseOrders,
  readPhaseResults,
  readPhaseMessages,
  readMemory,
  readAllMessages,
  readGameLog,
} from "../game-data";

// ═════════════════════════════════════════════════════════════════════════════
// TESTS
// ═════════════════════════════════════════════════════════════════════════════

describe("game-data.ts", () => {
  // ── listGames ─────────────────────────────────────────────────────────
  describe("listGames", () => {
    it("returns empty array when GAMES_DIR does not exist", () => {
      process.env.GAMES_DIR = path.join(tmpDir, "nonexistent");
      expect(listGames()).toEqual([]);
    });

    it("returns empty array when GAMES_DIR is empty", () => {
      expect(listGames()).toEqual([]);
    });

    it("skips directories without a snapshots subdirectory", () => {
      fs.mkdirSync(path.join(tmpDir, "game1"));
      // game1 exists but has no snapshots dir
      expect(listGames()).toEqual([]);
    });

    it("skips games with empty snapshots directory", () => {
      fs.mkdirSync(path.join(tmpDir, "game1", "snapshots"), { recursive: true });
      // Snapshots dir exists but has no phase subdirs
      expect(listGames()).toEqual([]);
    });

    it("lists games with valid snapshot phases", () => {
      seedGame("game1", ["S1901M", "F1901M"], {
        state: { units: { FRANCE: ["A PAR"], GERMANY: ["A BER"] } },
      });

      const games = listGames();
      expect(games).toHaveLength(1);
      expect(games[0].id).toBe("game1");
      expect(games[0].phases).toEqual(["F1901M", "S1901M"]);
      expect(games[0].lastPhase).toBe("S1901M");
      expect(games[0].powers).toContain("FRANCE");
      expect(games[0].powers).toContain("GERMANY");
    });

    it("skips non-directory entries in GAMES_DIR", () => {
      fs.writeFileSync(path.join(tmpDir, "README.md"), "hi");
      fs.writeFileSync(path.join(tmpDir, ".DS_Store"), "");
      expect(listGames()).toEqual([]);
    });

    it("handles corrupt game_state.json gracefully (returns empty powers)", () => {
      const gameDir = path.join(tmpDir, "game1");
      const phaseDir = path.join(gameDir, "snapshots", "S1901M");
      fs.mkdirSync(phaseDir, { recursive: true });
      fs.writeFileSync(
        path.join(phaseDir, "game_state.json"),
        "{{{{NOT JSON!!!!",
      );

      const games = listGames();
      expect(games).toHaveLength(1);
      // Powers extraction fails silently — should return empty powers
      expect(games[0].powers).toEqual([]);
    });

    it("handles game_state.json with missing units key", () => {
      seedGame("game1", ["S1901M"], {
        state: { centers: { FRANCE: ["PAR"] } }, // no "units" key
      });

      const games = listGames();
      expect(games).toHaveLength(1);
      expect(games[0].powers).toEqual([]);
    });

    it("excludes powers with empty unit arrays", () => {
      seedGame("game1", ["S1901M"], {
        state: { units: { FRANCE: ["A PAR"], AUSTRIA: [] } },
      });

      const games = listGames();
      expect(games[0].powers).toContain("FRANCE");
      expect(games[0].powers).not.toContain("AUSTRIA");
    });

    it("detects hasLog when game_log.jsonl exists", () => {
      seedGame("game1", ["S1901M"], { gameLog: '{"event":"test"}\n' });
      const games = listGames();
      expect(games[0].hasLog).toBe(true);
    });

    it("hasLog is false when game_log.jsonl does not exist", () => {
      seedGame("game1", ["S1901M"]);
      const games = listGames();
      expect(games[0].hasLog).toBe(false);
    });
  });

  // ── listPhases ────────────────────────────────────────────────────────
  describe("listPhases", () => {
    it("returns empty array when game has no snapshots dir", () => {
      fs.mkdirSync(path.join(tmpDir, "game1"));
      expect(listPhases("game1")).toEqual([]);
    });

    it("returns empty array when game does not exist at all", () => {
      expect(listPhases("game99")).toEqual([]);
    });

    it("returns sorted phase names", () => {
      seedGame("game1", ["S1902M", "F1901M", "S1901M"]);
      const phases = listPhases("game1");
      expect(phases).toEqual(["F1901M", "S1901M", "S1902M"]);
    });

    it("ignores non-directory entries in snapshots dir", () => {
      seedGame("game1", ["S1901M"]);
      fs.writeFileSync(
        path.join(tmpDir, "game1", "snapshots", "README.txt"),
        "ignore me",
      );
      const phases = listPhases("game1");
      expect(phases).toEqual(["S1901M"]);
    });
  });

  // ── readPhaseState ────────────────────────────────────────────────────
  describe("readPhaseState", () => {
    it("returns null for nonexistent phase", () => {
      seedGame("game1", ["S1901M"]);
      expect(readPhaseState("game1", "F1999M")).toBeNull();
    });

    it("returns null for nonexistent game", () => {
      expect(readPhaseState("game99", "S1901M")).toBeNull();
    });

    it("returns parsed state when valid", () => {
      seedGame("game1", ["S1901M"], {
        state: { units: { FRANCE: ["A PAR"] } },
      });
      const state = readPhaseState("game1", "S1901M");
      expect(state).toBeDefined();
      expect((state as Record<string, unknown>).units).toBeDefined();
    });

    it("throws on corrupt JSON (caller must handle)", () => {
      const phaseDir = path.join(tmpDir, "game1", "snapshots", "S1901M");
      fs.mkdirSync(phaseDir, { recursive: true });
      fs.writeFileSync(path.join(phaseDir, "game_state.json"), "NOT_JSON");

      expect(() => readPhaseState("game1", "S1901M")).toThrow();
    });
  });

  // ── readPhaseOrders ───────────────────────────────────────────────────
  describe("readPhaseOrders", () => {
    it("returns null when no orders.json exists", () => {
      seedGame("game1", ["S1901M"]); // no orders
      expect(readPhaseOrders("game1", "S1901M")).toBeNull();
    });

    it("returns parsed orders when valid", () => {
      seedGame("game1", ["S1901M"], {
        orders: { FRANCE: ["A PAR - BUR"] },
      });
      const orders = readPhaseOrders("game1", "S1901M");
      expect(orders).toEqual({ FRANCE: ["A PAR - BUR"] });
    });
  });

  // ── readPhaseResults ──────────────────────────────────────────────────
  describe("readPhaseResults", () => {
    it("returns null when no results.json exists", () => {
      seedGame("game1", ["S1901M"]);
      expect(readPhaseResults("game1", "S1901M")).toBeNull();
    });
  });

  // ── readPhaseMessages ─────────────────────────────────────────────────
  describe("readPhaseMessages", () => {
    it("returns null when no messages.json exists", () => {
      seedGame("game1", ["S1901M"]);
      expect(readPhaseMessages("game1", "S1901M")).toBeNull();
    });

    it("returns parsed messages when valid", () => {
      const msgs = {
        msg1: { sender: "FRANCE", recipient: "GERMANY", message: "alliance?" },
      };
      seedGame("game1", ["S1901M"], { messages: msgs });
      const result = readPhaseMessages("game1", "S1901M");
      expect(result).toEqual(msgs);
    });
  });

  // ── readMemory ────────────────────────────────────────────────────────
  describe("readMemory", () => {
    it("returns null when memory file does not exist", () => {
      seedGame("game1", ["S1901M"]);
      expect(readMemory("game1", "FRANCE", "S1901M")).toBeNull();
    });

    it("returns null for current memory when game dir has no memory file", () => {
      seedGame("game1", ["S1901M"]);
      expect(readMemory("game1", "FRANCE")).toBeNull();
    });

    it("reads phase-specific memory from snapshot", () => {
      seedGame("game1", ["S1901M"], {
        memory: { FRANCE: "# France Memory\nAllied with Germany" },
      });
      const mem = readMemory("game1", "FRANCE", "S1901M");
      expect(mem).toContain("Allied with Germany");
    });

    it("reads current memory from game root", () => {
      seedGame("game1", ["S1901M"]);
      fs.writeFileSync(
        path.join(tmpDir, "game1", "FRANCE_memory.md"),
        "current memory",
      );
      const mem = readMemory("game1", "FRANCE");
      expect(mem).toBe("current memory");
    });
  });

  // ── readAllMessages ───────────────────────────────────────────────────
  describe("readAllMessages", () => {
    it("returns empty array when no phases exist", () => {
      fs.mkdirSync(path.join(tmpDir, "game1"));
      expect(readAllMessages("game1")).toEqual([]);
    });

    it("aggregates messages across multiple phases", () => {
      // Phase 1
      const phaseDir1 = path.join(tmpDir, "game1", "snapshots", "S1901M");
      fs.mkdirSync(phaseDir1, { recursive: true });
      fs.writeFileSync(
        path.join(phaseDir1, "messages.json"),
        JSON.stringify({
          msg1: { sender: "FRANCE", recipient: "GERMANY", message: "hi" },
        }),
      );

      // Phase 2
      const phaseDir2 = path.join(tmpDir, "game1", "snapshots", "F1901M");
      fs.mkdirSync(phaseDir2, { recursive: true });
      fs.writeFileSync(
        path.join(phaseDir2, "messages.json"),
        JSON.stringify({
          msg2: { sender: "GERMANY", recipient: "FRANCE", message: "hello" },
        }),
      );

      const allMsgs = readAllMessages("game1");
      expect(allMsgs).toHaveLength(2);
    });

    it("skips phases without messages.json", () => {
      seedGame("game1", ["S1901M", "F1901M"]); // no messages in either
      expect(readAllMessages("game1")).toEqual([]);
    });
  });

  // ── readGameLog ───────────────────────────────────────────────────────
  describe("readGameLog", () => {
    it("returns empty array when game_log.jsonl does not exist", () => {
      seedGame("game1", ["S1901M"]);
      expect(readGameLog("game1")).toEqual([]);
    });

    it("returns empty array when game dir does not exist", () => {
      expect(readGameLog("game99")).toEqual([]);
    });

    it("parses valid JSONL lines", () => {
      const lines = [
        JSON.stringify({ event_type: "phase.start", phase: "S1901M" }),
        JSON.stringify({ event_type: "orders.submitted", power: "FRANCE" }),
      ].join("\n");
      seedGame("game1", ["S1901M"], { gameLog: lines });

      const events = readGameLog("game1");
      expect(events).toHaveLength(2);
      expect(events[0].event_type).toBe("phase.start");
      expect(events[1].event_type).toBe("orders.submitted");
    });

    it("skips corrupt lines and parses the rest", () => {
      const lines = [
        JSON.stringify({ event_type: "phase.start" }),
        "THIS IS NOT JSON",
        "{also: broken",
        JSON.stringify({ event_type: "game.end" }),
      ].join("\n");
      seedGame("game1", ["S1901M"], { gameLog: lines });

      const events = readGameLog("game1");
      // Only 2 valid lines out of 4
      expect(events).toHaveLength(2);
      expect(events[0].event_type).toBe("phase.start");
      expect(events[1].event_type).toBe("game.end");
    });

    it("handles empty lines in JSONL gracefully", () => {
      const lines = [
        JSON.stringify({ event_type: "phase.start" }),
        "",
        "",
        JSON.stringify({ event_type: "game.end" }),
        "",
      ].join("\n");
      seedGame("game1", ["S1901M"], { gameLog: lines });

      const events = readGameLog("game1");
      expect(events).toHaveLength(2);
    });

    it("handles game_log.jsonl that is completely empty", () => {
      seedGame("game1", ["S1901M"], { gameLog: "" });
      expect(readGameLog("game1")).toEqual([]);
    });

    it("handles single-line game log (no trailing newline)", () => {
      seedGame("game1", ["S1901M"], {
        gameLog: JSON.stringify({ event_type: "game.halt" }),
      });
      const events = readGameLog("game1");
      expect(events).toHaveLength(1);
      expect(events[0].event_type).toBe("game.halt");
    });
  });
});
