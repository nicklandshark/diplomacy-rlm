"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import type { LiveEvent, GameLogEvent } from "@/lib/types";
import type { PowerStatus } from "@/hooks/usePowerStatus";
import ActivityItem, { shouldRender } from "./ActivityItem";
import { phaseDisplayName, POWER_DISPLAY_COLORS } from "@/lib/constants";
import { powerFlag } from "@/lib/power-flags";

interface Props {
  events: LiveEvent[];
  connected: boolean;
  gameLog?: GameLogEvent[];
  livePhase?: string | null;
  liveStep?: string | null;
  phaseCount?: number;
  powerStatus?: Record<string, PowerStatus>;
}

function LogEntry({ entry }: { entry: GameLogEvent }) {
  const e = entry.event;
  const phase = entry.phase;

  if (e === "processed") {
    const mins = entry.duration_seconds
      ? `${Math.round(entry.duration_seconds / 60)}m`
      : "";
    return (
      <div className="px-2 py-1.5 text-xs border-b border-gray-800/50">
        <span className="text-green-400 font-medium">{phase}</span>
        {phase && (
          <span className="text-gray-500 ml-1">
            {phaseDisplayName(phase).split(" ").slice(1).join(" ")}
          </span>
        )}
        {mins && <span className="text-gray-600 ml-1">({mins})</span>}
      </div>
    );
  }

  if (e === "strategize_complete") {
    const reqs = entry.requests ? Object.keys(entry.requests) : [];
    return (
      <div className="px-2 py-1 text-xs text-gray-400">
        Strategize: {reqs.length > 0 ? `${reqs.join(", ")} requested talks` : "no talks requested"}
      </div>
    );
  }

  if (e === "converse_complete") {
    return (
      <div className="px-2 py-1 text-xs text-gray-400">
        Converse: {entry.messages || 0} messages, {entry.rounds || 0} rounds
      </div>
    );
  }

  if (e === "decide_complete") {
    const orders = entry.orders || {};
    const parts = Object.entries(orders)
      .filter(([, count]) => (count as number) > 0)
      .map(([power, count]) => `${power}: ${count}`);
    return (
      <div className="px-2 py-1 text-xs text-gray-400">
        Orders: {parts.length > 0 ? parts.join(", ") : "none"}
      </div>
    );
  }

  if (e === "halt") {
    return (
      <div className="px-2 py-1 text-xs text-red-400">
        Game halted at {phase}
      </div>
    );
  }

  return null;
}

const STATUS_LABELS: Record<PowerStatus, { text: string; color: string }> = {
  idle: { text: "Idle", color: "text-gray-500" },
  thinking: { text: "Thinking", color: "text-amber-400" },
  talking: { text: "Talking", color: "text-blue-400" },
  submitted: { text: "Submitted", color: "text-green-400" },
  defaulted: { text: "Defaulted", color: "text-yellow-500" },
  timeout: { text: "Timed out", color: "text-orange-400" },
};

export default function ActivityFeed({ events, connected, gameLog, livePhase, liveStep, phaseCount, powerStatus }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const [filterPower, setFilterPower] = useState<string | null>(null);

  const rendered = events.filter(shouldRender);
  // Unique powers that appear in events
  const eventPowers = useMemo(() => {
    const s = new Set<string>();
    for (const e of rendered) { if (e.power) s.add(e.power); }
    return Array.from(s).sort();
  }, [rendered]);

  // Apply power filter (phase-level events like phase.start/step.start always show)
  const filtered = filterPower
    ? rendered.filter(e => !e.power || e.power === filterPower)
    : rendered;

  const hasLiveContent = connected || rendered.length > 0;
  const logEntries = gameLog || [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [rendered.length, logEntries.length]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-1.5 px-2 py-1 border-b border-gray-800">
        <span className="text-xs text-gray-400 flex-shrink-0">Activity</span>
        {connected ? (
          <>
            <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
            {livePhase && (
              <span className="text-[11px] text-green-400 font-medium flex-shrink-0">{livePhase}</span>
            )}
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-gray-600 flex-shrink-0" />
            <span className="text-[11px] text-gray-500 flex-shrink-0">
              {phaseCount != null && phaseCount > 0
                ? `${phaseCount} phase${phaseCount !== 1 ? "s" : ""}`
                : "offline"}
            </span>
          </>
        )}
        {/* Power filter chips */}
        {eventPowers.length > 1 && (
          <div className="flex items-center gap-0.5 ml-auto flex-shrink-0">
            {eventPowers.map(p => {
              const active = filterPower === p;
              return (
                <button
                  key={p}
                  onClick={() => setFilterPower(active ? null : p)}
                  className={`text-[10px] px-1 py-0.5 rounded transition-colors ${
                    active ? "text-white" : "text-gray-600 hover:text-gray-400"
                  }`}
                  style={active ? { backgroundColor: (POWER_DISPLAY_COLORS[p] || "#666") + "44" } : undefined}
                  title={`Filter: ${p}`}
                >
                  {powerFlag(p)}
                </button>
              );
            })}
          </div>
        )}
      </div>
      <div className="overflow-auto flex-1">
        {hasLiveContent ? (
          <>
            {/* Live per-faction status */}
            {connected && powerStatus && Object.keys(powerStatus).length > 0 && (
              <div className="px-2 py-1.5 border-b border-gray-800/50 flex flex-wrap gap-x-3 gap-y-0.5">
                {Object.entries(powerStatus).map(([power, status]) => {
                  if (status === "idle") return null;
                  const cfg = STATUS_LABELS[status];
                  return (
                    <span key={power} className="text-[11px] flex items-center gap-1">
                      <span>{powerFlag(power)}</span>
                      <span className="text-gray-400">{power.slice(0, 3)}</span>
                      <span className={cfg.color}>{cfg.text}</span>
                    </span>
                  );
                })}
              </div>
            )}
            {filtered.length === 0 && connected && (
              <div className="text-gray-500 text-xs p-4">
                {filterPower ? `No activity for ${filterPower}` : "Waiting for activity..."}
              </div>
            )}
            {filtered.map((event) => (
              <ActivityItem key={event.event_id} event={event} />
            ))}
          </>
        ) : logEntries.length > 0 ? (
          logEntries.map((entry, i) => <LogEntry key={i} entry={entry} />)
        ) : (
          <div className="text-gray-500 text-xs p-4">No activity recorded yet.</div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
