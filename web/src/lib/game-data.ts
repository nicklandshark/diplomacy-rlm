import fs from "fs";
import path from "path";
import type { GameState, PhaseOrders, PhaseResults, PhaseMessages, Message, GameLogEvent, GameSummary } from "./types";

function getGamesDir(): string {
  const dir = process.env.GAMES_DIR || "../test_game_outputs";
  return path.resolve(process.cwd(), dir);
}

export function listGames(): GameSummary[] {
  const gamesDir = getGamesDir();
  if (!fs.existsSync(gamesDir)) return [];

  const entries = fs.readdirSync(gamesDir, { withFileTypes: true });
  const games: GameSummary[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const gameDir = path.join(gamesDir, entry.name);
    const snapshotsDir = path.join(gameDir, "snapshots");

    if (!fs.existsSync(snapshotsDir)) continue;

    const phases = fs.readdirSync(snapshotsDir)
      .filter((p) => fs.statSync(path.join(snapshotsDir, p)).isDirectory())
      .sort();

    if (phases.length === 0) continue;

    const lastPhase = phases[phases.length - 1];
    const statePath = path.join(snapshotsDir, phases[0], "game_state.json");
    let powers: string[] = [];
    if (fs.existsSync(statePath)) {
      try {
        const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
        powers = Object.keys(state.units || {}).filter(
          (p) => (state.units[p]?.length || 0) > 0
        );
      } catch {}
    }

    const hasLog = fs.existsSync(path.join(gameDir, "game_log.jsonl"));

    games.push({
      id: entry.name,
      path: gameDir,
      phases,
      lastPhase,
      powers,
      hasLog,
    });
  }

  return games;
}

export function getGameDir(gameId: string): string {
  return path.join(getGamesDir(), gameId);
}

export function listPhases(gameId: string): string[] {
  const snapshotsDir = path.join(getGameDir(gameId), "snapshots");
  if (!fs.existsSync(snapshotsDir)) return [];
  return fs.readdirSync(snapshotsDir)
    .filter((p) => {
      try {
        return fs.statSync(path.join(snapshotsDir, p)).isDirectory();
      } catch {
        return false;
      }
    })
    .sort();
}

export function readPhaseState(gameId: string, phase: string): GameState | null {
  const filePath = path.join(getGameDir(gameId), "snapshots", phase, "game_state.json");
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export function readPhaseOrders(gameId: string, phase: string): PhaseOrders | null {
  const filePath = path.join(getGameDir(gameId), "snapshots", phase, "orders.json");
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export function readPhaseResults(gameId: string, phase: string): PhaseResults | null {
  const filePath = path.join(getGameDir(gameId), "snapshots", phase, "results.json");
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export function readPhaseMessages(gameId: string, phase: string): PhaseMessages | null {
  const filePath = path.join(getGameDir(gameId), "snapshots", phase, "messages.json");
  if (!fs.existsSync(filePath)) return null;
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export function readMemory(gameId: string, power: string, phase?: string): string | null {
  // If phase specified, read from snapshot memory dir
  if (phase) {
    const filePath = path.join(
      getGameDir(gameId), "snapshots", phase, "memory", `${power}_memory.md`
    );
    if (fs.existsSync(filePath)) return fs.readFileSync(filePath, "utf-8");
    return null;
  }
  // Otherwise read current memory from game dir root
  const filePath = path.join(getGameDir(gameId), `${power}_memory.md`);
  if (fs.existsSync(filePath)) return fs.readFileSync(filePath, "utf-8");
  return null;
}

export function readAllMessages(gameId: string): Message[] {
  const phases = listPhases(gameId);
  const all: Message[] = [];
  for (const phase of phases) {
    const msgs = readPhaseMessages(gameId, phase);
    if (msgs) {
      for (const msg of Object.values(msgs)) {
        all.push(msg);
      }
    }
  }
  return all;
}

export function readGameLog(gameId: string): GameLogEvent[] {
  const filePath = path.join(getGameDir(gameId), "game_log.jsonl");
  if (!fs.existsSync(filePath)) return [];
  const content = fs.readFileSync(filePath, "utf-8");
  return content
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter((e): e is GameLogEvent => e !== null);
}
