import type { GameLogEvent, LiveEvent } from "../../../../../../web/src/lib/types";

export type TeletypeTone = "neutral" | "active" | "success" | "warning" | "alert";
export type TeletypeSource = "backlog" | "live";
export type TeletypeTokenKind =
  | "phase"
  | "eventLifecycle"
  | "eventStrategize"
  | "eventConverse"
  | "eventOrders"
  | "eventMessage"
  | "message"
  | "power"
  | "number"
  | "operator"
  | "statusSuccess"
  | "statusWarning"
  | "statusError"
  | "muted"
  | "text";

export interface TeletypeToken {
  text: string;
  kind: TeletypeTokenKind;
  power?: string;
}

export interface TeletypeLine {
  id: string;
  text: string;
  source: TeletypeSource;
  tone: TeletypeTone;
  tokens?: TeletypeToken[];
  eventType?: string;
}

interface TeletypeLineBody {
  text: string;
  tone: TeletypeTone;
  tokens: TeletypeToken[];
  eventType?: string;
}

interface BuildTeletypeBacklogQueueInput {
  gameLog?: GameLogEvent[] | null;
  events?: LiveEvent[] | null;
  backlogGameLogLimit?: number;
  backlogEventLimit?: number;
}

const RENDERABLE_EVENT_TYPES = new Set([
  "phase.start",
  "step.start",
  "agent.repl",
  "agent.prompt",
  "orders.submitted",
  "orders.defaulted",
  "conversation.agent.start",
  "conversation.started",
  "message.sent",
  "message.flushed",
  "conversation.agent.finish",
  "memory.changed",
  "agent.error",
  "step.timeout",
]);

const DEFAULT_BACKLOG_GAMELOG_LIMIT = 48;
const DEFAULT_BACKLOG_EVENT_LIMIT = 96;

export function formatGameLogEntryLine(entry: GameLogEvent): TeletypeLineBody | null {
  const phase = formatPhase(entry.phase);

  switch (entry.event) {
    case "processed": {
      const mins = entry.duration_seconds && Number.isFinite(entry.duration_seconds)
        ? Math.max(1, Math.round((entry.duration_seconds as number) / 60))
        : null;
      return makeLine(
        [
          token(phase, "phase"),
          token(" ", "muted"),
          token("PROCESSED", "eventLifecycle"),
          ...(mins
            ? [token(" ", "muted"), token(`${mins}M`, "number")]
            : []),
        ],
        "success",
        "processed",
      );
    }

    case "strategize_complete": {
      const requests = entry.requests && typeof entry.requests === "object"
        ? Object.keys(entry.requests as Record<string, unknown>).length
        : 0;
      return makeLine(
        [
          token(phase, "phase"),
          token(" ", "muted"),
          token("STRATEGIZE", "eventStrategize"),
          token(" ", "muted"),
          ...(requests > 0
            ? [token(String(requests), "number"), token(" ", "muted"), token("REQUESTS", "text")]
            : [token("NO REQUESTS", "statusWarning")]),
        ],
        "neutral",
        "strategize_complete",
      );
    }

    case "converse_complete": {
      const rounds = coerceNonNegativeInt(entry.rounds);
      const messages = coerceNonNegativeInt(entry.messages);
      return makeLine(
        [
          token(phase, "phase"),
          token(" ", "muted"),
          token("CONVERSE", "eventConverse"),
          token(" ", "muted"),
          token(String(messages), "number"),
          token(" ", "muted"),
          token("MSG", "text"),
          token(" ", "muted"),
          token(String(rounds), "number"),
          token(" ", "muted"),
          token("ROUNDS", "text"),
        ],
        "active",
        "converse_complete",
      );
    }

    case "decide_complete": {
      const orders = entry.orders && typeof entry.orders === "object"
        ? Object.entries(entry.orders as Record<string, unknown>)
            .map(([power, count]) => [power, coerceNonNegativeInt(count)] as const)
            .filter(([, count]) => count > 0)
        : [];
      return makeLine(
        [
          token(phase, "phase"),
          token(" ", "muted"),
          token("ORDERS", "eventOrders"),
          token(" ", "muted"),
          ...(orders.length > 0 ? powerCountTokens(orders) : [token("NONE", "statusWarning")]),
        ],
        "success",
        "decide_complete",
      );
    }

    case "halt": {
      return makeLine(
        [
          token(phase, "phase"),
          token(" ", "muted"),
          token("HALT", "statusError"),
        ],
        "alert",
        "halt",
      );
    }

    case "end": {
      return makeLine(
        [
          token(phase, "phase"),
          token(" ", "muted"),
          token("END", "statusSuccess"),
        ],
        "success",
        "end",
      );
    }

    default:
      return null;
  }
}

export function formatLiveEventLine(event: LiveEvent): TeletypeLineBody | null {
  if (!RENDERABLE_EVENT_TYPES.has(event.event_type)) {
    return null;
  }

  const payload = isRecord(event.payload) ? event.payload : {};
  const power = normalizeToken(event.power);
  const phase = formatPhase(event.phase);

  switch (event.event_type) {
    case "phase.start":
      return makeLine(
        [
          token(phase, "phase"),
          token(" ", "muted"),
          token("PHASE", "eventLifecycle"),
          token(" ", "muted"),
          token("START", "eventLifecycle"),
        ],
        "neutral",
        "phase.start",
      );

    case "step.start": {
      const step = normalizeToken(event.step) || "STEP";
      return makeLine(
        [
          token(phase, "phase"),
          token(" ", "muted"),
          token(step, stepTokenKind(step)),
          token(" ", "muted"),
          token("START", "eventLifecycle"),
        ],
        "active",
        "step.start",
      );
    }

    case "agent.repl": {
      const text = pickPreview(payload, "text", "summary") || "NO OUTPUT";
      return makeLine(
        [
          token(power || "AGENT", "power", power || "AGENT"),
          token(" ", "muted"),
          token("REPL", "eventMessage"),
          token(" ", "muted"),
          token(text, "text"),
        ],
        "active",
        "agent.repl",
      );
    }

    case "agent.prompt": {
      const text = pickPreview(payload, "text", "summary") || "NO PROMPT";
      return makeLine(
        [
          token(power || "AGENT", "power", power || "AGENT"),
          token(" ", "muted"),
          token("PROMPT", "eventMessage"),
          token(" ", "muted"),
          token(text, "text"),
        ],
        "neutral",
        "agent.prompt",
      );
    }

    case "orders.submitted": {
      const orders = Array.isArray(payload.orders) ? payload.orders.length : 0;
      const summary = pickPreview(payload, "summary");
      const suffix = orders > 0 ? `${orders} ORDERS` : summary || "COMPLETE";
      return makeLine(
        [
          token(power || "POWER", "power", power || "POWER"),
          token(" ", "muted"),
          token("ORDERS", "eventOrders"),
          token(" ", "muted"),
          token("SUBMITTED", "statusSuccess"),
          token(" ", "muted"),
          ...suffixTokens(suffix),
        ],
        "success",
        "orders.submitted",
      );
    }

    case "orders.defaulted": {
      const summary = pickPreview(payload, "summary") || "HOLD DEFAULT";
      return makeLine(
        [
          token(power || "POWER", "power", power || "POWER"),
          token(" ", "muted"),
          token("ORDERS", "eventOrders"),
          token(" ", "muted"),
          token("DEFAULTED", "statusWarning"),
          token(" ", "muted"),
          token(summary, "statusWarning"),
        ],
        "warning",
        "orders.defaulted",
      );
    }

    case "conversation.agent.start": {
      const partners = Array.isArray(payload.partners)
        ? (payload.partners as unknown[]).map(normalizeToken).filter(Boolean)
        : [];
      const partnerText = partners.length > 0 ? partners.join(",") : "NO PARTNERS";
      return makeLine(
        [
          token(power || "POWER", "power", power || "POWER"),
          token(" ", "muted"),
          token("CONVERSE", "eventConverse"),
          token(" ", "muted"),
          token("START", "eventLifecycle"),
          token(" ", "muted"),
          token(partnerText, "text"),
        ],
        "active",
        "conversation.agent.start",
      );
    }

    case "conversation.started": {
      return makeLine(
        [
          token(power || "POWER", "power", power || "POWER"),
          token(" ", "muted"),
          token("CONVERSATION", "eventConverse"),
          token(" ", "muted"),
          token("STARTED", "eventLifecycle"),
        ],
        "active",
        "conversation.started",
      );
    }

    case "message.sent":
    case "message.flushed": {
      const sender = normalizeToken(payload.sender) || power || "?";
      const recipient = normalizeToken(payload.recipient) || "?";
      const message = pickPreview(payload, "message", "summary") || "";
      return makeLine(
        [
          token(sender, "power", sender),
          token("->", "operator"),
          token(recipient, "power", recipient),
          token(" ", "muted"),
          token("MSG", "eventMessage"),
          ...(message ? [token(" ", "muted"), token(message, "message")] : []),
        ],
        "active",
        event.event_type,
      );
    }

    case "conversation.agent.finish": {
      const summary = pickPreview(payload, "summary") || "DONE";
      return makeLine(
        [
          token(power || "POWER", "power", power || "POWER"),
          token(" ", "muted"),
          token("CONVERSE", "eventConverse"),
          token(" ", "muted"),
          token(summary, "statusSuccess"),
        ],
        "neutral",
        "conversation.agent.finish",
      );
    }

    case "memory.changed": {
      return makeLine(
        [
          token(power || "POWER", "power", power || "POWER"),
          token(" ", "muted"),
          token("MEMORY", "eventLifecycle"),
          token(" ", "muted"),
          token("UPDATED", "statusSuccess"),
        ],
        "neutral",
        "memory.changed",
      );
    }

    case "agent.error": {
      const error = pickPreview(payload, "error", "summary") || "UNKNOWN";
      return makeLine(
        [
          token(power || "POWER", "power", power || "POWER"),
          token(" ", "muted"),
          token("ERROR", "statusError"),
          token(" ", "muted"),
          token(error, "statusError"),
        ],
        "alert",
        "agent.error",
      );
    }

    case "step.timeout": {
      const summary = pickPreview(payload, "summary") || "TIMEOUT";
      return makeLine(
        [
          token(phase, "phase"),
          token(" ", "muted"),
          token("TIMEOUT", "statusWarning"),
          token(" ", "muted"),
          token(summary, "statusWarning"),
        ],
        "warning",
        "step.timeout",
      );
    }

    default:
      return null;
  }
}

export function buildTeletypeBacklogQueue({
  gameLog,
  events,
  backlogGameLogLimit = DEFAULT_BACKLOG_GAMELOG_LIMIT,
  backlogEventLimit = DEFAULT_BACKLOG_EVENT_LIMIT,
}: BuildTeletypeBacklogQueueInput): TeletypeLine[] {
  const queue: TeletypeLine[] = [];
  const safeGameLog = Array.isArray(gameLog) ? gameLog : [];
  const safeEvents = Array.isArray(events) ? events : [];

  const gameLogStart = Math.max(0, safeGameLog.length - Math.max(0, backlogGameLogLimit));
  for (let i = gameLogStart; i < safeGameLog.length; i += 1) {
    const entry = safeGameLog[i];
    if (!entry) continue;

    const line = formatGameLogEntryLine(entry);
    if (!line) continue;

    queue.push({
      id: `backlog:${i}:${entry.event}:${entry.phase ?? "-"}`,
      text: line.text,
      tone: line.tone,
      source: "backlog",
      tokens: line.tokens,
      eventType: line.eventType,
    });
  }

  const eventStart = Math.max(0, safeEvents.length - Math.max(0, backlogEventLimit));
  for (let i = eventStart; i < safeEvents.length; i += 1) {
    const event = safeEvents[i];
    if (!event) continue;

    const line = formatLiveEventLine(event);
    if (!line) continue;

    queue.push({
      id: `live:${event.event_id}`,
      text: line.text,
      tone: line.tone,
      source: "live",
      tokens: line.tokens,
      eventType: line.eventType,
    });
  }

  return queue;
}

export function trimTeletypeBuffer(lines: TeletypeLine[], maxLines: number): TeletypeLine[] {
  if (maxLines <= 0) {
    return [];
  }

  if (lines.length <= maxLines) {
    return lines;
  }

  return lines.slice(lines.length - maxLines);
}

export function appendUniquePrintedLine(
  lines: TeletypeLine[],
  line: TeletypeLine,
  maxLines: number,
): TeletypeLine[] {
  if (lines.some((entry) => entry.id === line.id)) {
    return lines;
  }
  return trimTeletypeBuffer([...lines, line], maxLines);
}

export function advanceTypedLine(
  text: string,
  currentCount: number,
  chunkSize = 1,
): { typed: string; nextCount: number; done: boolean } {
  if (!text) {
    return {
      typed: "",
      nextCount: 0,
      done: true,
    };
  }

  const safeCurrent = Math.max(0, Math.floor(currentCount));
  const safeChunk = chunkSize > 0 ? Math.floor(chunkSize) : 1;
  const nextCount = Math.min(text.length, safeCurrent + safeChunk);

  return {
    typed: text.slice(0, nextCount),
    nextCount,
    done: nextCount >= text.length,
  };
}

function coerceNonNegativeInt(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.round(value));
}

function normalizeToken(value: unknown): string {
  if (typeof value !== "string") {
    return "";
  }
  return value.trim().toUpperCase();
}

function formatPhase(phase: unknown): string {
  if (typeof phase !== "string" || phase.trim().length === 0) {
    return "????";
  }
  return phase.trim().toUpperCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value != null && typeof value === "object";
}

function pickPreview(payload: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value !== "string") {
      continue;
    }
    const collapsed = value.replace(/\s+/g, " ").trim();
    if (!collapsed) {
      continue;
    }
    return collapsed.length > 72 ? `${collapsed.slice(0, 72)}...` : collapsed;
  }
  return "";
}

function makeLine(
  tokens: TeletypeToken[],
  tone: TeletypeTone,
  eventType?: string,
): TeletypeLineBody {
  return {
    text: tokens.map((part) => part.text).join(""),
    tone,
    tokens,
    eventType,
  };
}

function token(text: string, kind: TeletypeTokenKind, power?: string): TeletypeToken {
  return { text, kind, power };
}

function powerCountTokens(entries: ReadonlyArray<readonly [string, number]>): TeletypeToken[] {
  const parts: TeletypeToken[] = [];
  for (let i = 0; i < entries.length; i += 1) {
    const [rawPower, count] = entries[i];
    const power = normalizeToken(rawPower);
    parts.push(token(power, "power", power));
    parts.push(token("=", "operator"));
    parts.push(token(String(count), "number"));
    if (i < entries.length - 1) {
      parts.push(token(" ", "muted"));
    }
  }
  return parts;
}

function suffixTokens(suffix: string): TeletypeToken[] {
  const match = suffix.match(/^(\d+)\s+ORDERS$/i);
  if (!match) {
    return [token(suffix, "text")];
  }
  return [
    token(match[1] || "0", "number"),
    token(" ", "muted"),
    token("ORDERS", "eventOrders"),
  ];
}

function stepTokenKind(step: string): TeletypeTokenKind {
  if (step.includes("STRATEGIZE")) return "eventStrategize";
  if (step.includes("CONVERSE")) return "eventConverse";
  if (step.includes("DECIDE") || step.includes("ORDER")) return "eventOrders";
  return "eventLifecycle";
}
