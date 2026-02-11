import { parseOrder } from "@/lib/parse-orders";
import type { Message, PhaseOrders, PhaseResults } from "@/lib/types";

const FAILED_RESULT_TOKENS = new Set(["bounce", "dislodged", "no convoy", "disrupted", "cut"]);

export type FsbOrderStatus = "pending" | "success" | "failed" | "void" | "unknown";

export interface FsbOrderRow {
  key: string;
  index: number;
  power: string;
  unit: string;
  order: string;
  result: string;
  status: FsbOrderStatus;
  rawOrder: string;
}

export type FsbThreadStatus = "live" | "archive";

export interface FsbMessageRow {
  key: string;
  powers: [string, string];
  messages: (Message & { isLive?: boolean })[];
  count: number;
  hasLive: boolean;
  status: FsbThreadStatus;
  preview: string;
  lastPhase: string;
}

export type FsbMetricTone = "ok" | "warn" | "neutral" | "accent";

export interface FsbSummaryMetricRow {
  key: string;
  metric: string;
  value: string;
  tone: FsbMetricTone;
}

export interface SummaryStanding {
  power: string;
  scs: number;
  units: number;
}

export interface SummaryEliminated {
  power: string;
  phase: string;
}

export interface SummaryWinOdd {
  power: string;
  pct: number;
}

export interface BuildSummaryMetricRowsInput {
  phases: string[];
  finalStandings: SummaryStanding[];
  eliminated: SummaryEliminated[];
  winOdds?: SummaryWinOdd[];
  isLive: boolean;
}

function toOrderActionLabel(rawOrder: string): { unit: string; order: string } {
  const parsed = parseOrder(rawOrder);
  if (!parsed) {
    return { unit: "UNKNOWN", order: rawOrder.trim() };
  }

  const unit = parsed.action === "W" ? "WAIVE" : `${parsed.unitType} ${parsed.loc}`;

  switch (parsed.action) {
    case "H":
      return { unit, order: "HOLD" };
    case "M":
      return { unit, order: `MOVE ${parsed.dest ?? "?"}` };
    case "S":
      if (parsed.srcLoc && parsed.dest) return { unit, order: `SUPPORT ${parsed.srcLoc}-${parsed.dest}` };
      return { unit, order: `SUPPORT ${parsed.dest ?? "?"}` };
    case "C":
      return { unit, order: `CONVOY ${parsed.srcLoc ?? "?"}-${parsed.dest ?? "?"}` };
    case "B":
      return { unit, order: "BUILD" };
    case "D":
      return { unit, order: "DISBAND" };
    case "R":
      return { unit, order: `RETREAT ${parsed.dest ?? "?"}` };
    case "W":
      return { unit, order: "WAIVE" };
    default:
      return { unit, order: rawOrder.trim() };
  }
}

function resolveOrderResult(
  rawOrder: string,
  power: string,
  results: PhaseResults | null,
  pendingPowers: Set<string>,
): { result: string; status: FsbOrderStatus } {
  if (pendingPowers.has(power)) {
    return { result: "awaiting adjudication", status: "pending" };
  }

  const parsed = parseOrder(rawOrder);
  if (!parsed) {
    return { result: "no report", status: "unknown" };
  }

  const unitKey = parsed.action === "W" ? "WAIVE" : `${parsed.unitType} ${parsed.loc}`;
  const unitResult = results?.[unitKey];

  if (!unitResult) {
    if (parsed.action === "W") return { result: "resolved", status: "success" };
    return { result: "no report", status: "unknown" };
  }

  if (unitResult.length === 0) {
    return { result: "resolved", status: "success" };
  }

  const normalized = unitResult.map((entry) => entry.trim().toLowerCase());
  const rendered = normalized.join(", ");

  if (normalized.includes("void")) {
    return { result: rendered, status: "void" };
  }

  if (normalized.some((entry) => FAILED_RESULT_TOKENS.has(entry))) {
    return { result: rendered, status: "failed" };
  }

  if (normalized.includes("waive")) {
    return { result: rendered, status: "success" };
  }

  if (normalized.includes("disband")) {
    return { result: rendered, status: parsed.action === "D" ? "success" : "failed" };
  }

  return { result: rendered, status: "failed" };
}

export function buildOrderRows(
  orders: PhaseOrders | null | undefined,
  results: PhaseResults | null,
  pendingPowers: Set<string> = new Set<string>(),
): FsbOrderRow[] {
  if (!orders) return [];

  let index = 0;
  const rows: FsbOrderRow[] = [];

  for (const [power, orderList] of Object.entries(orders)) {
    for (const rawOrder of orderList) {
      const { unit, order } = toOrderActionLabel(rawOrder);
      const { result, status } = resolveOrderResult(rawOrder, power, results, pendingPowers);

      rows.push({
        key: `${power}-${index}`,
        index,
        power,
        unit,
        order,
        result,
        status,
        rawOrder,
      });
      index += 1;
    }
  }

  return rows;
}

function threadKey(a: string, b: string): string {
  return [a, b].sort().join("↔");
}

function truncatePreview(message: string, max = 50): string {
  return message.length > max ? `${message.slice(0, max)}...` : message;
}

export function buildMessageThreadRows(
  messages: Message[] | null | undefined,
  liveMessages: Message[],
): FsbMessageRow[] {
  const base = Array.isArray(messages) ? messages : [];
  const map = new Map<string, { key: string; powers: [string, string]; messages: (Message & { isLive?: boolean })[] }>();

  const addMessage = (message: Message, isLive?: boolean) => {
    const key = threadKey(message.sender, message.recipient);
    if (!map.has(key)) {
      const powers = [message.sender, message.recipient].sort() as [string, string];
      map.set(key, { key, powers, messages: [] });
    }
    map.get(key)!.messages.push({ ...message, isLive });
  };

  for (const message of base) addMessage(message);
  for (const message of liveMessages) addMessage(message, true);

  return Array.from(map.values())
    .sort((a, b) => {
      const aLast = a.messages[a.messages.length - 1];
      const bLast = b.messages[b.messages.length - 1];
      const aLive = aLast?.isLive ? 1 : 0;
      const bLive = bLast?.isLive ? 1 : 0;
      if (aLive !== bLive) return bLive - aLive;
      return 0;
    })
    .map((thread) => {
      const lastMessage = thread.messages[thread.messages.length - 1];
      const hasLive = thread.messages.some((message) => message.isLive);

      return {
        key: thread.key,
        powers: thread.powers,
        messages: thread.messages,
        count: thread.messages.length,
        hasLive,
        status: hasLive ? "live" : "archive",
        preview: truncatePreview(lastMessage?.message ?? ""),
        lastPhase: lastMessage?.isLive ? "LIVE" : (lastMessage?.phase ?? ""),
      };
    });
}

export function buildSummaryMetricRows({
  phases,
  finalStandings,
  eliminated,
  winOdds = [],
  isLive,
}: BuildSummaryMetricRowsInput): FsbSummaryMetricRow[] {
  const winner = finalStandings.find((standing) => standing.scs >= 18);
  const leader = finalStandings.reduce<SummaryStanding | null>((best, standing) => {
    if (!best || standing.scs > best.scs) return standing;
    return best;
  }, null);
  const activePowers = finalStandings.filter((standing) => standing.scs > 0).length;

  const rows: FsbSummaryMetricRow[] = [
    {
      key: "state",
      metric: "State",
      value: winner ? `${winner.power} Victory` : (isLive ? "In Progress" : "Game Over"),
      tone: "ok",
    },
    {
      key: "leader",
      metric: "Leader",
      value: leader ? `${leader.power} (${leader.scs} SC)` : "N/A",
      tone: "ok",
    },
    {
      key: "active",
      metric: "Active Powers",
      value: String(activePowers),
      tone: "ok",
    },
    {
      key: "eliminated",
      metric: "Eliminated",
      value: String(eliminated.length),
      tone: eliminated.length > 0 ? "warn" : "neutral",
    },
    {
      key: "phases",
      metric: "Phases",
      value: String(phases.length),
      tone: "neutral",
    },
  ];

  const topOdd = winOdds
    .filter((entry) => entry.pct > 0)
    .sort((a, b) => b.pct - a.pct)[0];

  if (topOdd) {
    rows.push({
      key: "top-odds",
      metric: "Top Odds",
      value: `${topOdd.power} ${topOdd.pct}%`,
      tone: "accent",
    });
  }

  return rows;
}
