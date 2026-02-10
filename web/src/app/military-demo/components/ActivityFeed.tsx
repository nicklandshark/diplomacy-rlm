"use client";

import { useRef, useEffect } from "react";
import type { LiveEvent, GameLogEvent } from "../../../../../web/src/lib/types";
import type { PowerStatus } from "../../../../../web/src/hooks/usePowerStatus";
import { POWER_DISPLAY_COLORS } from "../../../../../web/src/lib/constants";
import { powerFlag } from "../../../../../web/src/lib/power-flags";
import { shouldRender } from "../../../../../web/src/components/activity/ActivityItem";

interface Props {
  events: LiveEvent[];
  connected: boolean;
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
  thinking: { dot: "bg-amber-400", animate: true },
  talking: { dot: "bg-blue-400", animate: true },
  submitted: { dot: "bg-[#4a7c59]", animate: false, icon: "✓" },
  defaulted: { dot: "bg-yellow-500", animate: false, icon: "–" },
  timeout: { dot: "bg-[#ff9500]", animate: false, icon: "!" },
};

const STATUS_LABELS: Record<PowerStatus, { text: string; color: string }> = {
  idle: { text: "Idle", color: "text-[#808080]" },
  thinking: { text: "Thinking", color: "text-amber-400" },
  talking: { text: "Talking", color: "text-blue-400" },
  submitted: { text: "Ready", color: "text-[#4a7c59]" },
  defaulted: { text: "Default", color: "text-yellow-500" },
  timeout: { text: "Timeout", color: "text-[#ff9500]" },
};

export function ActivityFeed({ 
  events, 
  connected, 
  gameLog, 
  livePhase, 
  liveStep, 
  phaseCount, 
  powerStatus, 
  activePowers, 
  selectedPower, 
  onSelectPower, 
  units, 
  centers 
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  const rendered = events.filter(shouldRender);
  const hasLiveContent = connected || rendered.length > 0;
  const logEntries = gameLog || [];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [rendered.length, logEntries.length]);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2 py-1 border-b border-[#2a2a2a]">
        <span className="text-xs text-[#808080] flex-shrink-0">Activity</span>
        {connected ? (
          <>
            <span className="w-2 h-2 rounded-full bg-[#4a7c59] flex-shrink-0" />
            {livePhase && (
              <span className="text-[11px] text-[#4a7c59] font-medium flex-shrink-0">{livePhase}</span>
            )}
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-[#666] flex-shrink-0" />
            <span className="text-[11px] text-[#666] flex-shrink-0">
              {phaseCount != null && phaseCount > 0
                ? `${phaseCount} phase${phaseCount !== 1 ? "s" : ""}`
                : "offline"}
            </span>
          </>
        )}

        {/* Power badges */}
        <div className="flex items-center gap-1 ml-auto flex-shrink-0">
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
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-all whitespace-nowrap flex-shrink-0 border ${
                  isActive
                    ? "bg-[#2a2a2a] border-[#ff9500]/60"
                    : "bg-[#1a1a1a] border-[#3a3a3a] hover:bg-[#2a2a2a]"
                }`}
              >
                <span className="text-sm">{powerFlag(power)}</span>
                <span className="text-[#808080]">{unitCount}u</span>
                <span className="text-[#666]">|</span>
                <span className="text-[#ff9500]">{scCount}s</span>
                {status !== "idle" && (
                  cfg.icon ? (
                    <span className={`text-[9px] font-bold ${
                      status === "submitted" ? "text-[#4a7c59]" :
                      status === "defaulted" ? "text-yellow-500" :
                      "text-[#ff9500]"
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
          })}
        </div>
      </div>

      {/* Content */}
      <div className="overflow-auto flex-1 text-xs">
        {hasLiveContent ? (
          <>
            {connected && powerStatus && Object.keys(powerStatus).length > 0 && (
              <div className="px-2 py-1.5 border-b border-[#2a2a2a]/50 flex flex-wrap gap-x-3 gap-y-0.5">
                {Object.entries(powerStatus).map(([power, status]) => {
                  if (status === "idle") return null;
                  const cfg = STATUS_LABELS[status];
                  return (
                    <span key={power} className="text-[11px] flex items-center gap-1">
                      <span>{powerFlag(power)}</span>
                      <span className="text-[#808080]">{power.slice(0, 3)}</span>
                      <span className={cfg.color}>{cfg.text}</span>
                    </span>
                  );
                })}
              </div>
            )}
            {rendered.length === 0 && connected && (
              <div className="text-[#808080] p-4">Waiting for activity...</div>
            )}
            {rendered.map((event) => (
              <div key={event.event_id} className="px-2 py-1 border-b border-[#2a2a2a]/30 text-[#808080]">
                {event.event_type}
              </div>
            ))}
          </>
        ) : logEntries.length > 0 ? (
          logEntries.map((entry, i) => (
            <div key={i} className="px-2 py-1 text-[#808080]">
              {entry.event} {entry.phase && `(${entry.phase})`}
            </div>
          ))
        ) : (
          <div className="text-[#808080] p-4">No activity recorded yet.</div>
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
