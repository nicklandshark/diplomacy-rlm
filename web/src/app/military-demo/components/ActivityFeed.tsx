"use client";

import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import type { LiveEvent, GameLogEvent } from "@/lib/types";
import type { PowerStatus } from "@/hooks/usePowerStatus";
import { POWER_DISPLAY_COLORS } from "@/lib/constants";
import { powerFlag } from "@/lib/power-flags";
import { shouldRender } from "@/components/activity/ActivityItem";
import {
  appendUniquePrintedLine,
  advanceTypedLine,
  buildTeletypeBacklogQueue,
  formatGameLogEntryLine,
  formatLiveEventLine,
  type TeletypeToken,
  type TeletypeTokenKind,
  type TeletypeLine,
  type TeletypeTone,
} from "./activity/teletype-utils";
import ConnectionStatusBadge from "./activity/ConnectionStatusBadge";
import { getConnectionIndicator } from "./activity/connection-indicator";
import CRTScreenOverlay from "./CRTScreenOverlay";

interface Props {
  id?: string;
  events: LiveEvent[];
  connected: boolean;
  connectionError?: string | null;
  gameLog?: GameLogEvent[];
  livePhase?: string | null;
  liveStep?: string | null;
  phaseCount?: number;
  powerStatus?: Record<string, PowerStatus>;
  activePowers?: string[];
  selectedPower?: string | null;
  onSelectPower?: (power: string) => void;
  units?: Record<string, string[]>;
  centers?: Record<string, string[]>;
}

const STATUS_CONFIG: Record<PowerStatus, { dot: string; animate: boolean; icon?: string }> = {
  idle: { dot: "", animate: false },
  thinking: { dot: "bg-[#d4a85f]", animate: true },
  talking: { dot: "bg-[#cdbd98]", animate: true },
  submitted: { dot: "bg-[#d9b56b]", animate: false, icon: "✓" },
  defaulted: { dot: "bg-[#8f99a3]", animate: false, icon: "–" },
  timeout: { dot: "bg-[#d46866]", animate: false, icon: "!" },
};

const STATUS_LABELS: Record<PowerStatus, { text: string; color: string }> = {
  idle: { text: "Idle", color: "text-[#7e8791]" },
  thinking: { text: "Thinking", color: "text-[#d4a85f]" },
  talking: { text: "Talking", color: "text-[#cdbd98]" },
  submitted: { text: "Ready", color: "text-[#d9b56b]" },
  defaulted: { text: "Default", color: "text-[#9aa5af]" },
  timeout: { text: "Timeout", color: "text-[#d46866]" },
};

const PRINTED_BUFFER_LIMIT = 90;
const BACKLOG_LOG_LIMIT = 40;
const BACKLOG_EVENT_LIMIT = 72;
const TYPE_TICK_MS = 28;
const CHARS_PER_TICK = 2;

const TONE_TEXT: Record<TeletypeTone, string> = {
  neutral: "text-[#c3ae88]",
  active: "text-[#d9c79f]",
  success: "text-[#d1b57f]",
  warning: "text-[#b8aa90]",
  alert: "text-[#d46866]",
};

function linePrefix(source: TeletypeLine["source"]): string {
  return source === "live" ? "RX" : "LOG";
}

const TOKEN_TEXT: Record<TeletypeTokenKind, string> = {
  phase: "text-[#d4b074]",
  eventLifecycle: "text-[#c3c6cf]",
  eventStrategize: "text-[#7db4ff]",
  eventConverse: "text-[#b79bff]",
  eventOrders: "text-[#f0ad4f]",
  eventMessage: "text-[#7bcfbe]",
  power: "",
  number: "text-[#e2cf9f]",
  operator: "text-[#8ca1b6]",
  statusSuccess: "text-[#7bd2ad]",
  statusWarning: "text-[#d9b56b]",
  statusError: "text-[#d46866]",
  muted: "text-[#8f8575]",
  text: "text-[#c9b997]",
  message: "text-[#d8d0bf]",
};

const POWER_SHORT_TO_FULL: Record<string, string> = {
  AUS: "AUSTRIA",
  ENG: "ENGLAND",
  FRA: "FRANCE",
  GER: "GERMANY",
  ITA: "ITALY",
  RUS: "RUSSIA",
  TUR: "TURKEY",
};

function resolvePowerColor(token: TeletypeToken): string {
  const raw = (token.power || token.text || "").replace(/[^A-Z]/gi, "").toUpperCase();
  const normalized = POWER_SHORT_TO_FULL[raw] || raw;
  return POWER_DISPLAY_COLORS[normalized] || "#d6bd88";
}

function visibleTokenText(token: TeletypeToken, maxChars: number, start: number): string {
  if (start >= maxChars) return "";
  const remaining = maxChars - start;
  if (remaining >= token.text.length) return token.text;
  return token.text.slice(0, Math.max(0, remaining));
}

export function ActivityFeed({
  id,
  events,
  connected,
  connectionError,
  gameLog,
  livePhase,
  liveStep,
  phaseCount,
  powerStatus,
  activePowers,
  selectedPower,
  onSelectPower,
  units,
  centers,
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const seededRef = useRef(false);
  const knownLineIdsRef = useRef<Set<string>>(new Set());
  const knownLiveEventIdsRef = useRef<Set<number>>(new Set());
  const knownGameLogLengthRef = useRef(0);

  const [pendingQueue, setPendingQueue] = useState<TeletypeLine[]>([]);
  const [activeLine, setActiveLine] = useState<TeletypeLine | null>(null);
  const [typedCount, setTypedCount] = useState(0);
  const [printedLines, setPrintedLines] = useState<TeletypeLine[]>([]);

  const rendered = events.filter((event) =>
    shouldRender(event) ||
    event.event_type === "message.sent" ||
    event.event_type === "conversation.started",
  );
  const logEntries = gameLog || [];

  const enqueueUniqueLines = useCallback((lines: TeletypeLine[]) => {
    if (lines.length === 0) {
      return;
    }

    const fresh: TeletypeLine[] = [];
    for (const line of lines) {
      if (knownLineIdsRef.current.has(line.id)) {
        continue;
      }
      knownLineIdsRef.current.add(line.id);
      fresh.push(line);
    }

    if (fresh.length > 0) {
      setPendingQueue((prev) => [...prev, ...fresh]);
    }
  }, []);

  useEffect(() => {
    if (seededRef.current) {
      return;
    }
    if (logEntries.length === 0 && rendered.length === 0) {
      return;
    }

    const initialQueue = buildTeletypeBacklogQueue({
      gameLog: logEntries,
      events: rendered,
      backlogGameLogLimit: BACKLOG_LOG_LIMIT,
      backlogEventLimit: BACKLOG_EVENT_LIMIT,
    });

    enqueueUniqueLines(initialQueue);
    knownGameLogLengthRef.current = logEntries.length;
    for (const event of rendered) {
      knownLiveEventIdsRef.current.add(event.event_id);
    }
    seededRef.current = true;
  }, [enqueueUniqueLines, logEntries, rendered]);

  useEffect(() => {
    if (!seededRef.current) {
      return;
    }

    const prevLength = knownGameLogLengthRef.current;
    if (logEntries.length < prevLength) {
      knownGameLogLengthRef.current = logEntries.length;
      return;
    }
    if (logEntries.length === prevLength) {
      return;
    }

    const appended: TeletypeLine[] = [];
    for (let i = prevLength; i < logEntries.length; i += 1) {
      const entry = logEntries[i];
      if (!entry) {
        continue;
      }
      const line = formatGameLogEntryLine(entry);
      if (!line) {
        continue;
      }
      appended.push({
        id: `backlog:${i}:${entry.event}:${entry.phase ?? "-"}`,
        source: "backlog",
        text: line.text,
        tone: line.tone,
        tokens: line.tokens,
        eventType: line.eventType,
      });
    }

    knownGameLogLengthRef.current = logEntries.length;
    enqueueUniqueLines(appended);
  }, [enqueueUniqueLines, logEntries]);

  useEffect(() => {
    if (!seededRef.current) {
      return;
    }

    const appended: TeletypeLine[] = [];
    for (const event of rendered) {
      if (knownLiveEventIdsRef.current.has(event.event_id)) {
        continue;
      }
      knownLiveEventIdsRef.current.add(event.event_id);

      const line = formatLiveEventLine(event);
      if (!line) {
        continue;
      }

      appended.push({
        id: `live:${event.event_id}`,
        source: "live",
        text: line.text,
        tone: line.tone,
        tokens: line.tokens,
        eventType: line.eventType,
      });
    }

    enqueueUniqueLines(appended);
  }, [enqueueUniqueLines, rendered]);

  useEffect(() => {
    if (activeLine || pendingQueue.length === 0) {
      return;
    }

    const [next, ...rest] = pendingQueue;
    setPendingQueue(rest);
    setActiveLine(next);
    setTypedCount(0);
  }, [activeLine, pendingQueue]);

  useEffect(() => {
    if (!activeLine) {
      return;
    }

    let finalized = false;
    const timer = window.setInterval(() => {
      setTypedCount((current) => {
        if (finalized) return current;
        const next = advanceTypedLine(activeLine.text, current, CHARS_PER_TICK);
        if (next.done) {
          finalized = true;
          window.clearInterval(timer);
          setPrintedLines((prev) => appendUniquePrintedLine(prev, activeLine, PRINTED_BUFFER_LIMIT));
          setActiveLine(null);
          return 0;
        }
        return next.nextCount;
      });
    }, TYPE_TICK_MS);

    return () => window.clearInterval(timer);
  }, [activeLine]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "auto", block: "end" });
  }, [activeLine?.id, printedLines.length, typedCount]);

  const queueActive = Boolean(activeLine) || pendingQueue.length > 0;
  const hasTeletypeContent = printedLines.length > 0 || activeLine != null || pendingQueue.length > 0;
  const typedText = activeLine ? activeLine.text.slice(0, typedCount) : "";
  const renderedPrintedLines = useMemo(() => {
    const seen = new Set<string>();
    return printedLines.filter((line) => {
      if (seen.has(line.id)) return false;
      seen.add(line.id);
      return true;
    });
  }, [printedLines]);
  const indicator = getConnectionIndicator(connected, queueActive, liveStep, connectionError);

  const renderTokens = (tokens: TeletypeToken[] | undefined, fallbackText: string, maxChars = Number.POSITIVE_INFINITY) => {
    if (!tokens || tokens.length === 0) {
      return <span className="whitespace-pre-wrap break-words">{fallbackText.slice(0, maxChars)}</span>;
    }

    let cursor = 0;
    return (
      <span className="whitespace-pre-wrap break-words">
        {tokens.map((token, idx) => {
          const tokenText = visibleTokenText(token, maxChars, cursor);
          cursor += token.text.length;
          if (!tokenText) return null;

          const colorClass = TOKEN_TEXT[token.kind];
          const style = token.kind === "power" ? { color: resolvePowerColor(token) } : undefined;
          return (
            <span key={`${idx}:${cursor}:${token.kind}`} className={colorClass} style={style}>
              {tokenText}
            </span>
          );
        })}
      </span>
    );
  };

  return (
    <div id={id} className="flex flex-col h-full bg-[#171b21] border-t border-[#323942]" role="region" aria-label="Activity feed">
      <div
        className="relative flex items-center gap-2 px-2 py-1 border-b border-[#3b434d]"
        style={{
          background:
            "repeating-linear-gradient(90deg, transparent 0px, transparent 1px, rgba(255,255,255,0.01) 1px, rgba(255,255,255,0.01) 2px), linear-gradient(180deg, #444b55 0%, #353b45 30%, #2b3139 100%)",
        }}
      >
        <div
          className="inline-flex items-center px-2.5 py-0.5 rounded-[3px] border text-[9px] uppercase tracking-[0.2em] font-semibold"
          style={{
            borderColor: "#12161b",
            color: "#c3ccd6",
            background: "linear-gradient(180deg, #1b2026 0%, #12171d 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          Activity
        </div>

        <span className="text-[9px] uppercase tracking-[0.14em] text-[#8d96a1]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
          {livePhase || (phaseCount ? `${phaseCount} phases` : "feed")}
        </span>

        <div className="ml-auto">
          <ConnectionStatusBadge indicator={indicator} />
        </div>
      </div>

      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div className="absolute inset-0 bg-[#02070b]" />
        <CRTScreenOverlay color="amber" />

        <div className="relative z-10 h-full overflow-auto text-xs" role="log" aria-live="polite" aria-relevant="additions text">
          {connected && powerStatus && Object.keys(powerStatus).length > 0 && (
            <div className="px-2 py-1 border-b border-[#2c3640] flex flex-wrap gap-x-3 gap-y-0.5 bg-[#0d1218]/80">
              {Object.entries(powerStatus).map(([power, status]) => {
                if (status === "idle") return null;
                const cfg = STATUS_LABELS[status];
                return (
                  <span key={power} className="text-[10px] flex items-center gap-1">
                    <span>{powerFlag(power)}</span>
                    <span className="text-[#8a96a2]">{power.slice(0, 3)}</span>
                    <span className={cfg.color}>{cfg.text}</span>
                  </span>
                );
              })}
            </div>
          )}

          {hasTeletypeContent ? (
            <>
              {renderedPrintedLines.map((line, idx) => (
                <div
                  key={`${line.id}:${idx}`}
                  className={`px-2 py-1 border-b border-[#1f2730] tracking-[0.06em] text-[11px] ${TONE_TEXT[line.tone]}`}
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  <span className="text-[9px] text-[#9b8e76] uppercase tracking-[0.2em] mr-2">
                    {linePrefix(line.source)}
                  </span>
                  {renderTokens(line.tokens, line.text)}
                </div>
              ))}

              {activeLine && (
                <div
                  className={`px-2 py-1 border-b border-[#2a353f] tracking-[0.06em] text-[11px] bg-[#0d1319] ${TONE_TEXT[activeLine.tone]}`}
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  <span className="text-[9px] text-[#aa9c82] uppercase tracking-[0.2em] mr-2">
                    {linePrefix(activeLine.source)}
                  </span>
                  {renderTokens(activeLine.tokens, typedText, typedCount)}
                  <span className="inline-block w-1.5 h-3 align-middle ml-0.5 bg-[#e2c88b] animate-pulse" />
                </div>
              )}
            </>
          ) : connected ? (
            <div className="flex flex-col items-center justify-center h-32 text-[#b9ae99]">
              <div className="text-xl mb-2 animate-pulse" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>SYSTEM STANDBY</div>
              <div className="text-[11px] uppercase tracking-[0.2em]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Listening for dispatches</div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-32 px-3 text-[#7d8792]">
              <div className="text-2xl mb-2">◈</div>
              <div className="text-sm uppercase tracking-wider" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>Feed Offline</div>
              {connectionError && (
                <div className="mt-1 text-[10px] leading-[1.3] text-[#bf9d9d] text-center max-w-[30ch]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
                  {connectionError}
                </div>
              )}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      <div className="flex items-center gap-1 px-2 py-1 border-t border-[#313842] bg-[#11161d]/90 overflow-x-auto">
          {activePowers?.map((power) => {
          const isActive = selectedPower === power;
          const unitCount = (units?.[power] || []).length;
          const scCount = (centers?.[power] || []).length;
          const status = (powerStatus?.[power] || "idle") as PowerStatus;
          const cfg = STATUS_CONFIG[status];
          const color = POWER_DISPLAY_COLORS[power] || "#666";

          return (
            <button
              key={power}
              onClick={() => onSelectPower?.(power)}
              type="button"
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-all whitespace-nowrap flex-shrink-0 border ${
                isActive
                  ? "bg-[#1f2730] border-[#4a5a6a]"
                  : "bg-[#0f141a] border-[#2f3944] hover:bg-[#151c24]"
              }`}
              style={{ boxShadow: isActive ? `0 0 10px ${color}25` : "none" }}
              aria-pressed={isActive}
              aria-label={`${power} ${unitCount} units ${scCount} centers${status !== "idle" ? ` ${STATUS_LABELS[status].text.toLowerCase()}` : ""}`}
            >
              <span
                className="h-2 w-2 rounded-[2px] border border-[#0e1218]"
                style={{
                  backgroundColor: color,
                  boxShadow: `0 0 5px ${color}66`,
                }}
                aria-hidden
              />
              <span className="text-xs">{powerFlag(power)}</span>
              <span className="text-[9px] font-semibold uppercase tracking-[0.08em]" style={{ color }}>
                {power.slice(0, 3)}
              </span>
              <span className="text-[#9aa8b5]">{unitCount}u</span>
              <span className="text-[#5f6d79]">|</span>
              <span className="text-[#d6bd88]">{scCount}s</span>
              {status !== "idle" && cfg.icon && (
                <span className={`text-[9px] font-bold ${
                  status === "submitted" ? "text-[#d9b56b]" :
                  status === "defaulted" ? "text-[#9aa5af]" :
                  "text-[#d46866]"
                }`}>
                  {cfg.icon}
                </span>
              )}
            </button>
          );
        })}
      </div>

    </div>
  );
}
