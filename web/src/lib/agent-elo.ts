import fs from "fs";
import path from "path";
import { listGames, readGameSummary } from "./game-data";

const DEFAULT_ELO = 1500;
const ELO_K = 24;
const SUPPORTED_SYSTEMS = ["elo_core"] as const;
const PHASE2_READY_FOR = [
  "pre_registered_formula_weights",
  "anti_gaming_guards",
  "dev_vs_holdout_seed_partitions",
  "power_position_balancing",
  "uncertainty_confidence_intervals",
  "minimum_sample_thresholds",
  "runtime_prompt_version_locking",
  "reliability_penalty_components",
  "efficiency_cost_latency_components",
  "audit_and_deterministic_replay_provenance",
  "promotion_delta_thresholds",
] as const;

export type RatingSystemId = (typeof SUPPORTED_SYSTEMS)[number];
export type Phase2CapabilityId = (typeof PHASE2_READY_FOR)[number];

interface AgentMeta {
  backend?: string;
  model?: string;
}

interface GameMetaFile {
  backend?: string;
  model?: string;
  powers?: Record<string, AgentMeta>;
}

interface PowerStanding {
  power: string;
  scs: number;
}

export interface AgentEloRating {
  agentKey: string;
  backend: string;
  model: string;
  rating: number;
  games: number;
  matchups: number;
  wins: number;
  draws: number;
  losses: number;
  lastGameId?: string;
}

interface AgentAccumulator extends AgentEloRating {}

export interface AgentRatingRecord {
  agentKey: string;
  backend: string;
  model: string;
  rating: number;
  games: number;
  outcomes: {
    wins: number;
    draws: number;
    losses: number;
  };
  components: Record<string, number>;
  diagnostics: {
    matchups: number;
    lastGameId?: string;
  };
}

export interface RatingSystemResult {
  id: RatingSystemId;
  label: string;
  version: string;
  parameters: Record<string, number>;
  sample: {
    totalGamesSeen: number;
    completedGamesUsed: number;
    agentsBeforeFilters: number;
    agentsAfterFilters: number;
  };
  filters: {
    minGames: number;
    limit: number | null;
  };
  ratings: AgentRatingRecord[];
}

export interface RatingsBundle {
  generatedAt: string;
  schemaVersion: "v2";
  request: {
    systems: RatingSystemId[];
    minGames: number;
    limit: number | null;
  };
  systems: RatingSystemResult[];
  capabilities: {
    supportedSystems: readonly RatingSystemId[];
    phase2ReadyFor: readonly Phase2CapabilityId[];
  };
}

export interface RatingsOptions {
  systems?: RatingSystemId[];
  minGames?: number;
  limit?: number;
}

function normalizeBackend(value: string | undefined): string {
  const cleaned = (value || "").trim().toLowerCase();
  return cleaned || "unknown";
}

function normalizeModel(value: string | undefined): string {
  const cleaned = (value || "").trim();
  return cleaned || "unknown";
}

function toAgentKey(backend: string, model: string): string {
  return `${backend}:${model}`;
}

function readGameMeta(gamePath: string): GameMetaFile | null {
  const metaPath = path.join(gamePath, ".game_meta.json");
  if (!fs.existsSync(metaPath)) return null;
  try {
    const raw = fs.readFileSync(metaPath, "utf-8");
    return JSON.parse(raw) as GameMetaFile;
  } catch {
    return null;
  }
}

function resolveAgentForPower(meta: GameMetaFile | null, power: string): { backend: string; model: string } {
  const powerMeta = meta?.powers?.[power];
  const backend = normalizeBackend(powerMeta?.backend ?? meta?.backend);
  const model = normalizeModel(powerMeta?.model ?? meta?.model);
  return { backend, model };
}

function expectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

function ensureAgent(
  table: Map<string, AgentAccumulator>,
  backend: string,
  model: string,
): AgentAccumulator {
  const agentKey = toAgentKey(backend, model);
  let entry = table.get(agentKey);
  if (!entry) {
    entry = {
      agentKey,
      backend,
      model,
      rating: DEFAULT_ELO,
      games: 0,
      matchups: 0,
      wins: 0,
      draws: 0,
      losses: 0,
    };
    table.set(agentKey, entry);
  }
  return entry;
}

function compareScore(a: PowerStanding, b: PowerStanding): number {
  if (a.scs > b.scs) return 1;
  if (a.scs < b.scs) return 0;
  return 0.5;
}

function sanitizeNonNegativeInt(value: number | undefined, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value) || Number.isNaN(value)) return fallback;
  return Math.max(0, Math.floor(value));
}

function computeEloCoreResult(): RatingSystemResult {
  const games = listGames();
  const table = new Map<string, AgentAccumulator>();
  let completedGamesUsed = 0;

  for (const game of games) {
    const summary = readGameSummary(game.id);
    if (!summary?.gameOver || summary.finalStandings.length < 2) continue;
    completedGamesUsed += 1;

    const meta = readGameMeta(game.path);
    const standings = summary.finalStandings.map((standing) => {
      const id = resolveAgentForPower(meta, standing.power);
      return {
        power: standing.power,
        scs: standing.scs,
        backend: id.backend,
        model: id.model,
      };
    });

    const gameAgentKeys = new Set<string>();
    for (const standing of standings) {
      const agent = ensureAgent(table, standing.backend, standing.model);
      gameAgentKeys.add(agent.agentKey);
      agent.lastGameId = game.id;
    }
    for (const key of gameAgentKeys) {
      const agent = table.get(key);
      if (agent) agent.games += 1;
    }

    for (let i = 0; i < standings.length; i += 1) {
      for (let j = i + 1; j < standings.length; j += 1) {
        const a = standings[i];
        const b = standings[j];
        if (a.backend === b.backend && a.model === b.model) continue;

        const ratingA = ensureAgent(table, a.backend, a.model);
        const ratingB = ensureAgent(table, b.backend, b.model);

        const scoreA = compareScore(a, b);
        const scoreB = 1 - scoreA;
        const expectedA = expectedScore(ratingA.rating, ratingB.rating);
        const expectedB = expectedScore(ratingB.rating, ratingA.rating);

        ratingA.rating += ELO_K * (scoreA - expectedA);
        ratingB.rating += ELO_K * (scoreB - expectedB);

        ratingA.matchups += 1;
        ratingB.matchups += 1;
        if (scoreA === 1) {
          ratingA.wins += 1;
          ratingB.losses += 1;
        } else if (scoreA === 0) {
          ratingB.wins += 1;
          ratingA.losses += 1;
        } else {
          ratingA.draws += 1;
          ratingB.draws += 1;
        }
      }
    }
  }

  const ratings = Array.from(table.values())
    .map<AgentRatingRecord>((entry) => ({
      agentKey: entry.agentKey,
      backend: entry.backend,
      model: entry.model,
      rating: Math.round(entry.rating),
      games: entry.games,
      outcomes: {
        wins: entry.wins,
        draws: entry.draws,
        losses: entry.losses,
      },
      components: {
        elo_core: Math.round(entry.rating),
      },
      diagnostics: {
        matchups: entry.matchups,
        lastGameId: entry.lastGameId,
      },
    }))
    .sort((a, b) => {
      if (b.rating !== a.rating) return b.rating - a.rating;
      if (b.outcomes.wins !== a.outcomes.wins) return b.outcomes.wins - a.outcomes.wins;
      return a.agentKey.localeCompare(b.agentKey);
    });

  return {
    id: "elo_core",
    label: "Elo Core (pairwise approximation)",
    version: "1.0.0",
    parameters: {
      baseRating: DEFAULT_ELO,
      kFactor: ELO_K,
    },
    sample: {
      totalGamesSeen: games.length,
      completedGamesUsed,
      agentsBeforeFilters: ratings.length,
      agentsAfterFilters: ratings.length,
    },
    filters: {
      minGames: 0,
      limit: null,
    },
    ratings,
  };
}

export function parseRatingSystems(raw: string | null | undefined): RatingSystemId[] {
  if (!raw) return ["elo_core"];
  const parsed = raw
    .split(",")
    .map((token) => token.trim().toLowerCase())
    .filter(Boolean);
  const systems = parsed.filter((token): token is RatingSystemId =>
    SUPPORTED_SYSTEMS.includes(token as RatingSystemId),
  );
  return systems.length > 0 ? Array.from(new Set(systems)) : ["elo_core"];
}

export function computeAgentRatings(options: RatingsOptions = {}): RatingsBundle {
  const requestedRaw: RatingSystemId[] =
    options.systems && options.systems.length > 0 ? options.systems : ["elo_core"];
  const requested = Array.from(new Set<RatingSystemId>(requestedRaw));
  const minGames = sanitizeNonNegativeInt(options.minGames, 0);
  const limit = sanitizeNonNegativeInt(options.limit, 0);
  const systems: RatingSystemResult[] = [];

  for (const system of requested) {
    if (system === "elo_core") {
      const result = computeEloCoreResult();
      const filtered = result.ratings.filter((entry) => entry.games >= minGames);
      const sliced = limit > 0 ? filtered.slice(0, limit) : filtered;
      systems.push({
        ...result,
        sample: {
          ...result.sample,
          agentsBeforeFilters: result.ratings.length,
          agentsAfterFilters: sliced.length,
        },
        filters: {
          minGames,
          limit: limit > 0 ? limit : null,
        },
        ratings: sliced,
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    schemaVersion: "v2",
    request: {
      systems: requested,
      minGames,
      limit: limit > 0 ? limit : null,
    },
    systems,
    capabilities: {
      supportedSystems: SUPPORTED_SYSTEMS,
      phase2ReadyFor: PHASE2_READY_FOR,
    },
  };
}

export function toLegacyEloRatings(records: AgentRatingRecord[]): AgentEloRating[] {
  return records.map((entry) => ({
    agentKey: entry.agentKey,
    backend: entry.backend,
    model: entry.model,
    rating: entry.rating,
    games: entry.games,
    matchups: entry.diagnostics.matchups,
    wins: entry.outcomes.wins,
    draws: entry.outcomes.draws,
    losses: entry.outcomes.losses,
    lastGameId: entry.diagnostics.lastGameId,
  }));
}

export function computeAgentEloRatings(): AgentEloRating[] {
  return toLegacyEloRatings(computeEloCoreResult().ratings);
}
