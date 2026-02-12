"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import type { LiveEvent, GameLogEvent } from "@/lib/types";
import type { PowerStatus } from "@/hooks/usePowerStatus";
import ActivityItem, { shouldRender } from "./ActivityItem";
import { phaseDisplayName, POWER_DISPLAY_COLORS } from "@/lib/constants";
import { powerFlag } from "@/lib/power-flags";
import PowerBadge from "@/components/power/PowerBadge";
import ConnectionStoplight from "./ConnectionStoplight";
import {
  getConnectionDisplayState,
  resolveConnectionSignal,
} from "./connection-status";

const STATUS_CHIP_CONFIG: Record<PowerStatus, { dot: string; animate: boolean; icon?: string }> = {
  idle: { dot: "", animate: false },
  thinking: { dot: "bg-amber-400", animate: true },
  talking: { dot: "bg-blue-400", animate: true },
  submitted: { dot: "bg-green-400", animate: false, icon: "\u2713" },
  defaulted: { dot: "bg-yellow-500", animate: false, icon: "\u2013" },
  timeout: { dot: "bg-orange-400", animate: false, icon: "!" },
};

interface Props {
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

export default function ActivityFeed({ events, connected, connectionError, gameLog, livePhase, liveStep, phaseCount, powerStatus, activePowers, selectedPower, onSelectPower, units, centers }: Props) {
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
  const connectionSignal = resolveConnectionSignal(connected, connectionError);
  const connectionDisplay = getConnectionDisplayState(connectionSignal);
  const phaseSummary = phaseCount != null && phaseCount > 0
    ? `${phaseCount} phase${phaseCount !== 1 ? "s" : ""}`
    : "no phases";
  const phaseChipLabel = connected && livePhase ? livePhase : phaseSummary;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [rendered.length, logEntries.length]);

  return (
    <div className="font-ui-activity flex flex-col h-full">
      <div className="flex items-center gap-1.5 px-2 py-1 border-b border-gray-800">
        <span className="font-ui-title tracking-wide text-xs text-gray-400 flex-shrink-0">Activity</span>
        <span className="text-[10px] text-gray-500 uppercase tracking-[0.14em] flex-shrink-0">
          {phaseChipLabel}
        </span>
        <ConnectionStoplight display={connectionDisplay} />
        <span className={`text-[10px] font-medium tracking-[0.1em] uppercase flex-shrink-0 ${connectionDisplay.statusToneClass}`}>
          {connectionDisplay.feedLabel}
        </span>
        {connected && liveStep && (
          <span className="text-[10px] text-gray-500 hidden xl:inline">{liveStep}</span>
        )}
        {/* Power chips + activity filter */}
        <div className="flex items-center gap-1 ml-auto flex-shrink-0 min-w-0 overflow-hidden">
          {activePowers && activePowers.length > 0 ? (
            activePowers.map((power) => {
              const isActive = selectedPower === power;
              const unitCount = (units?.[power] || []).length;
              const scCount = (centers?.[power] || []).length;
              const status = (powerStatus?.[power] || "idle") as PowerStatus;
              const cfg = STATUS_CHIP_CONFIG[status];
              return (
                <button
                  key={power}
                  onClick={() => onSelectPower?.(power)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-all whitespace-nowrap flex-shrink-0 ${
                    isActive
                      ? "bg-gray-800 border-blue-500/60 shadow-sm shadow-blue-500/10"
                      : "bg-gray-800/40 border-gray-700 hover:bg-gray-800 hover:border-gray-600"
                  }`}
                  style={{ borderWidth: 1, borderStyle: "solid" }}
                >
                  <PowerBadge power={power} size="sm" />
                  <span className="text-gray-400">{unitCount}u</span>
                  <span className="text-gray-600">|</span>
                  <span className="text-gray-400">{scCount}sc</span>
                  {status !== "idle" && (
                    cfg.icon ? (
                      <span className={`text-[9px] font-bold ${
                        status === "submitted" ? "text-green-400" :
                        status === "defaulted" ? "text-yellow-500" :
                        "text-orange-400"
                      }`}>
                        {cfg.icon}
                      </span>
                    ) : (
                      <span className="relative flex h-1.5 w-1.5">
                        {cfg.animate && (
                          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${cfg.dot} opacity-75`} />
                        )}
                        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${cfg.dot}`} />
                      </span>
                    )
                  )}
                </button>
              );
            })
          ) : (
            eventPowers.length > 1 && eventPowers.map(p => {
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
            })
          )}
        </div>
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
