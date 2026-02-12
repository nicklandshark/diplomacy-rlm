// Game state from game_state.json
export interface GameState {
  centers: Record<string, string[]>;
  units: Record<string, string[]>;
  retreats: Record<string, Record<string, string[]>>;
  homes: Record<string, string[]>;
  builds: Record<string, { count: number; homes: string[] }>;
  civil_disorder: Record<string, number>;
  influence: Record<string, string[]>;
  note: string;
  name: string;
  phase_type: string;
  map: string;
  rules: string[];
  zobrist_hash: string;
}

// Orders per power from orders.json
export type PhaseOrders = Record<string, string[]>;

// Results per unit from results.json
export type PhaseResults = Record<string, string[]>;

// Messages from messages.json (keyed by timestamp)
export interface Message {
  sender: string;
  recipient: string;
  phase: string;
  message: string;
}
export type PhaseMessages = Record<string, Message>;

// Game log event from game_log.jsonl
export interface GameLogEvent {
  event: string;
  phase?: string;
  duration_seconds?: number;
  orders?: Record<string, number>;
  requests?: Record<string, number>;
  rounds?: number;
  agents?: number;
  messages?: number;
  [key: string]: unknown;
}

// Parsed order for rendering
export interface ParsedOrder {
  raw: string;
  unitType: "A" | "F";
  loc: string;
  action: "H" | "M" | "S" | "C" | "B" | "D" | "R" | "W";
  dest?: string;
  srcLoc?: string;  // for support/convoy: the unit being supported/convoyed
  via?: boolean;
  power?: string;   // assigned after matching to game state
}

// Live SSE event from Python sidecar
export interface LiveEvent {
  event_id: number;
  event_type: string;
  priority: number;
  ts_wall: number;
  phase: string | null;
  step: string | null;
  power: string | null;
  payload: Record<string, unknown>;
}

// Game summary for listing
export interface GameSummary {
  id: string;
  path: string;
  phases: string[];
  lastPhase: string;
  powers: string[];
  hasLog: boolean;
  // Enhanced fields for home page cards
  meta: { backend: string | null; model: string | null } | null;
  gameOver: boolean;
  finalStandings: { power: string; scs: number }[];
  /** Territory ownership from the last phase, for map thumbnail coloring */
  finalCenters: Record<string, string[]>;
  finalInfluence: Record<string, string[]>;
}
