import fs from "fs";
import path from "path";
import type { GameState, PhaseOrders, PhaseResults, PhaseMessages, Message, GameLogEvent, GameSummary } from "./types";
import { phaseSort } from "./constants";

function getGamesDir(): string {
  const dir = process.env.GAMES_DIR || "../runs";
  return path.resolve(process.cwd(), dir);
}

export function listGames(): GameSummary[] {
  const gamesDir = getGamesDir();
  if (!fs.existsSync(gamesDir)) return [];

  const entries = fs.readdirSync(gamesDir, { withFileTypes: true });
  const games: GameSummary[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    // For symlinks, verify the target is a directory
    if (entry.isSymbolicLink()) {
      try { if (!fs.statSync(path.join(gamesDir, entry.name)).isDirectory()) continue; } catch { continue; }
    }
    const gameDir = path.join(gamesDir, entry.name);
    const snapshotsDir = path.join(gameDir, "snapshots");

    if (!fs.existsSync(snapshotsDir)) continue;

    const phases = fs.readdirSync(snapshotsDir)
      .filter((p) => fs.statSync(path.join(snapshotsDir, p)).isDirectory())
      .sort(phaseSort);

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

    // Read .game_meta.json for model/backend
    let meta: { backend: string | null; model: string | null } | null = null;
    const metaPath = path.join(gameDir, ".game_meta.json");
    if (fs.existsSync(metaPath)) {
      try {
        const raw = JSON.parse(fs.readFileSync(metaPath, "utf-8"));
        meta = { backend: raw.backend ?? null, model: raw.model ?? null };
      } catch {}
    }

    // Read final game state for territory coloring + standings
    let gameOver = false;
    let finalStandings: { power: string; scs: number }[] = [];
    let finalCenters: Record<string, string[]> = {};
    let finalInfluence: Record<string, string[]> = {};

    const finalStatePath = path.join(snapshotsDir, lastPhase, "game_state.json");
    if (fs.existsSync(finalStatePath)) {
      try {
        const finalState: GameState = JSON.parse(fs.readFileSync(finalStatePath, "utf-8"));
        finalCenters = finalState.centers || {};
        finalInfluence = finalState.influence || {};

        // Build standings from centers
        finalStandings = Object.entries(finalCenters)
          .map(([power, locs]) => ({ power, scs: locs.length }))
          .filter(s => s.scs > 0)
          .sort((a, b) => b.scs - a.scs);

        // Game is over if someone has 18+ SCs or the phase is COMPLETED
        gameOver = finalStandings.some(s => s.scs >= 18) || lastPhase === "COMPLETED";
      } catch {}
    }

    games.push({
      id: entry.name,
      path: gameDir,
      phases,
      lastPhase,
      powers,
      hasLog,
      meta,
      gameOver,
      finalStandings,
      finalCenters,
      finalInfluence,
    });
  }

  // Natural sort: game1, game2, ..., game9, game10
  games.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
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
    .sort(phaseSort);
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

export interface GameSummaryData {
  phases: string[];
  scHistory: Record<string, number[]>;  // power -> SC count per phase
  finalStandings: { power: string; scs: number; units: number }[];
  eliminated: { power: string; phase: string }[];
  gameOver: boolean;  // true if game ended (victory, halt, or COMPLETED state)
}

export function readGameSummary(gameId: string): GameSummaryData | null {
  const phases = listPhases(gameId);
  if (phases.length === 0) return null;

  const scHistory: Record<string, number[]> = {};
  const lastAlive: Record<string, string> = {}; // power -> last phase where they had SCs

  for (let pi = 0; pi < phases.length; pi++) {
    const state = readPhaseState(gameId, phases[pi]);
    if (!state?.centers) continue;
    for (const [power, locs] of Object.entries(state.centers)) {
      if (!scHistory[power]) scHistory[power] = new Array(pi).fill(0);
      while (scHistory[power].length < pi) scHistory[power].push(0);
      scHistory[power].push(locs.length);
      if (locs.length > 0) lastAlive[power] = phases[pi];
    }
  }

  // Pad all to same length
  for (const power of Object.keys(scHistory)) {
    while (scHistory[power].length < phases.length) scHistory[power].push(0);
  }

  // Final standings from last phase
  const lastState = readPhaseState(gameId, phases[phases.length - 1]);
  const finalStandings = Object.keys(scHistory)
    .map(power => ({
      power,
      scs: scHistory[power][phases.length - 1] || 0,
      units: (lastState?.units?.[power] as string[] || []).length,
    }))
    .sort((a, b) => b.scs - a.scs);

  // Eliminated powers: had SCs at some point but ended with 0
  const eliminated: { power: string; phase: string }[] = [];
  for (const power of Object.keys(scHistory)) {
    const counts = scHistory[power];
    const hadSCs = counts.some(c => c > 0);
    const endedZero = counts[counts.length - 1] === 0;
    if (hadSCs && endedZero) {
      // Find first phase where they went to 0 and stayed there
      for (let i = 1; i < counts.length; i++) {
        if (counts[i] === 0 && counts[i - 1] > 0) {
          eliminated.push({ power, phase: phases[i] });
          break;
        }
      }
    }
  }
  eliminated.sort((a, b) => phases.indexOf(a.phase) - phases.indexOf(b.phase));

  // Determine if the game is definitively over (victory or engine says COMPLETED)
  const hasVictor = finalStandings.some(s => s.scs >= 18);
  const lastPhase = phases[phases.length - 1];
  const isCompletedPhase = lastPhase === "COMPLETED";
  const gameOver = hasVictor || isCompletedPhase;

  return { phases, scHistory, finalStandings, eliminated, gameOver };
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
