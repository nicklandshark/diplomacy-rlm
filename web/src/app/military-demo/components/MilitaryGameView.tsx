"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import DiplomacyMap from "@/components/map/DiplomacyMap";
import MemoryViewer from "@/components/memory/MemoryViewer";
import { useGameData, useMemory } from "@/hooks/useGameData";
import { usePhaseNavigation } from "@/hooks/usePhaseNavigation";
import { usePhases } from "@/hooks/usePhases";
import { useLiveEvents } from "@/hooks/useLiveEvents";
import { useAllMessages } from "@/hooks/useAllMessages";
import { useGameLog } from "@/hooks/useGameLog";
import { usePowerStatus, type PowerStatus } from "@/hooks/usePowerStatus";
import { useLiveOrders } from "@/hooks/useLiveOrders";
import { useLiveMessages } from "@/hooks/useLiveMessages";
import { phaseDisplayName, POWER_DISPLAY_COLORS } from "@/lib/constants";
import { powerFlag } from "@/lib/power-flags";
import { parseOrder, humanizeOrder, orderIcon } from "@/lib/parse-orders";
import type { LiveEvent } from "@/lib/types";
import {
  TacticalPanel,
  CommandButton,
  OrderItem,
  MessageBubble,
  ActionLog,
  Rivet,
} from "@/app/military-ui-kit/components";

interface Props {
  gameId: string;
  initialPhases: string[];
  svgContent: string;
}

type LeftTab = "orders" | "messages" | "summary";

const STATUS_CONFIG: Record<PowerStatus, { dot: string; animate: boolean; icon?: string }> = {
  idle: { dot: "", animate: false },
  thinking: { dot: "bg-amber-400", animate: true },
  talking: { dot: "bg-blue-400", animate: true },
  submitted: { dot: "bg-[#4a7c59]", animate: false, icon: "✓" },
  defaulted: { dot: "bg-yellow-500", animate: false, icon: "–" },
  timeout: { dot: "bg-[#ff9500]", animate: false, icon: "!" },
};

export default function MilitaryGameView({ gameId, initialPhases, svgContent }: Props) {
  const { phases, refresh: refreshPhases } = usePhases(gameId, initialPhases);
  const nav = usePhaseNavigation(phases);
  const [dataRefreshKey, setDataRefreshKey] = useState(0);
  const { state, orders, results, loading } = useGameData(gameId, nav.currentPhase, dataRefreshKey);
  const { messages: allMessages } = useAllMessages(gameId, dataRefreshKey);
  const [selectedPower, setSelectedPower] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<LeftTab>("orders");
  const [hoveredOrder, setHoveredOrder] = useState<string | null>(null);

  // Playback state
  const [playing, setPlaying] = useState(false);
  const [revealedOrderCount, setRevealedOrderCount] = useState(-1);
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeOrderRef = useRef<HTMLDivElement>(null);

  const [memoryRefreshKey, setMemoryRefreshKey] = useState(0);

  const onEvent = useCallback((event: LiveEvent) => {
    if (event.event_type === "snapshot.saved" || event.event_type === "phase.end") {
      refreshPhases();
      setDataRefreshKey(k => k + 1);
    } else if (event.event_type === "memory.changed" && event.power) {
      setSelectedPower(event.power);
      setMemoryRefreshKey(k => k + 1);
    }
  }, [refreshPhases]);

  const liveEvents = useLiveEvents(gameId, { onEvent });
  const gameLog = useGameLog(gameId, dataRefreshKey);

  const memoryPhase = (liveEvents.connected && nav.isLast) ? undefined : (nav.currentPhase || undefined);
  const { content: memoryContent, loading: memoryLoading } = useMemory(
    gameId,
    selectedPower || "FRANCE",
    memoryPhase,
    memoryRefreshKey
  );

  const powerStatus = usePowerStatus(liveEvents.events);
  const liveOrders = useLiveOrders(liveEvents.events);
  const liveMessages = useLiveMessages(liveEvents.events);

  const lastSeenMessageCount = useRef<number>(0);
  const totalMessages = (allMessages?.length || 0) + (liveMessages?.length || 0);

  useEffect(() => {
    if (leftTab === "messages") {
      lastSeenMessageCount.current = totalMessages;
    }
  }, [leftTab, totalMessages]);

  const unreadCount = totalMessages - lastSeenMessageCount.current;

  const focusLocation = useMemo(() => {
    if (!hoveredOrder) return null;
    const parsed = parseOrder(hoveredOrder);
    if (!parsed) return null;
    return parsed.dest || parsed.loc;
  }, [hoveredOrder]);

  const liveStep = useMemo(() => {
    for (let i = liveEvents.events.length - 1; i >= 0; i--) {
      const step = liveEvents.events[i].step;
      if (step) {
        const s = step.toLowerCase();
        if (s.includes("strategize")) return "Strategizing";
        if (s.includes("converse")) return "Conversing";
        if (s.includes("decide")) return "Deciding";
        return step;
      }
    }
    return null;
  }, [liveEvents.events]);

  const displayOrders = useMemo(() => {
    if (!liveEvents.connected || !nav.isLast) return orders;
    const merged: Record<string, string[]> = {};
    for (const power of Object.keys(orders || {})) {
      merged[power] = [...(orders?.[power] as string[] || [])];
    }
    for (const [power, pending] of Object.entries(liveOrders.pending)) {
      if (!merged[power]) merged[power] = [];
      for (const order of pending) {
        if (!merged[power].includes(order)) {
          merged[power].push(order);
        }
      }
    }
    return merged;
  }, [orders, liveOrders.pending, liveEvents.connected, nav.isLast]);

  const flatDisplayOrders = useMemo(() => {
    return Object.values(displayOrders || {}).flat() as string[];
  }, [displayOrders]);

  const pendingOrderPowers = useMemo(() => {
    const s = new Set<string>();
    if (!liveEvents.connected) return s;
    for (const [power, orderList] of Object.entries(liveOrders.pending)) {
      if (orderList.length > 0 && (!orders || !orders[power] || (orders[power] as string[]).length === 0)) {
        s.add(power);
      }
    }
    return s;
  }, [orders, liveOrders.pending, liveEvents.connected]);

  const activePowers = state
    ? Object.entries(state.units || {})
        .filter(([, units]) => (units as string[]).length > 0)
        .map(([power]) => power)
    : [];

  useEffect(() => {
    if (!selectedPower && activePowers.length > 0) {
      setSelectedPower(activePowers[0]);
    }
  }, [activePowers, selectedPower]);

  return (
    <div className="flex flex-col gap-4 h-[calc(100vh-80px)] bg-[#0a0a0a] p-4">
      {/* Top Control Panel */}
      <TacticalPanel className="!p-4">
        <div className="flex items-center justify-between gap-4">
          {/* Game Title */}
          <div className="flex items-center gap-3">
            <span className="text-[#ff9500] font-bold text-lg uppercase tracking-wider">{gameId}</span>
            <div className="w-px h-6 bg-[#3a3a3a]" />
          </div>

          {/* Phase Navigation */}
          <div className="flex items-center gap-3">
            <CommandButton
              variant="secondary"
              disabled={nav.isFirst}
              onClick={nav.goPrev}
              className="!px-4 !py-2 !text-sm"
            >
              ◀ PREV
            </CommandButton>

            <div className="px-4 py-2 bg-[#1a1a1a] border-2 border-[#3a3a3a] font-mono text-sm text-[#ff9500]">
              {nav.currentPhase || "Loading..."}
            </div>

            <CommandButton
              variant="secondary"
              disabled={nav.isLast}
              onClick={nav.goNext}
              className="!px-4 !py-2 !text-sm"
            >
              NEXT ▶
            </CommandButton>
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${liveEvents.connected ? "bg-[#4a7c59]" : "bg-[#dc143c]"} ${liveEvents.connected ? "animate-pulse" : ""}`} />
            <span className="text-xs text-[#808080] uppercase tracking-wider">
              {liveEvents.connected ? (liveStep || "CONNECTED") : `${phases.length} PHASES`}
            </span>
          </div>
        </div>

        {/* Phase Timeline */}
        <div className="mt-4">
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {phases.map((phase: string, idx: number) => {
              const isCurrent = phase === nav.currentPhase;
              const isPast = phases.indexOf(nav.currentPhase || "") > idx;

              return (
                <div
                  key={phase}
                  className={`relative w-14 h-14 flex-shrink-0 border-2 flex items-center justify-center transition-all cursor-pointer ${
                    isCurrent
                      ? "border-[#ff9500] bg-[#ff9500]/10 text-[#ff9500]"
                      : isPast
                      ? "border-[#4a7c59] bg-[#4a7c59]/5 text-[#4a7c59]"
                      : "border-[#3a3a3a] bg-[#1a1a1a] text-[#808080]"
                  }`}
                  style={{
                    boxShadow: isCurrent
                      ? "0 0 16px rgba(255, 149, 0, 0.3), inset 0 2px 4px rgba(0,0,0,0.6)"
                      : isPast
                      ? "inset 0 2px 4px rgba(0,0,0,0.6)"
                      : "inset 0 2px 4px rgba(0,0,0,0.8)"
                  }}
                  onClick={() => nav.goTo(idx)}
                >
                  <div className="text-xs font-bold">{phase.slice(0, 6)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </TacticalPanel>

      {/* Main 3-Column Layout */}
      <div className="flex gap-3 flex-1 min-h-0">
        {/* Left Sidebar: Orders/Messages/Summary */}
        <div className="w-64 min-w-[240px] flex-shrink flex flex-col gap-3 min-h-0">
          <TacticalPanel title="INTELLIGENCE" className="flex-1 min-h-0 flex flex-col">
            {/* Tab Buttons */}
            <div className="flex gap-1 mb-3">
              {(["orders", "messages", "summary"] as LeftTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setLeftTab(tab)}
                  className={`flex-1 px-2 py-2 text-[11px] font-bold uppercase tracking-wide border-2 transition-all ${
                    leftTab === tab
                      ? "bg-[#ff9500] border-[#ff9500] text-[#0a0a0a]"
                      : "bg-[#3a3a3a] border-[#3a3a3a] text-[#ff9500] hover:border-[#ff9500]/50"
                  }`}
                  style={{
                    boxShadow: leftTab === tab
                      ? "0 0 12px rgba(255, 149, 0, 0.4), inset 0 2px 4px rgba(0,0,0,0.3)"
                      : "inset 0 2px 4px rgba(0,0,0,0.6)"
                  }}
                >
                  {tab}
                  {tab === "messages" && unreadCount > 0 && leftTab !== "messages" && (
                    <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-[#4a7c59] text-white rounded-full">
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-auto min-h-0">
              {leftTab === "orders" && (
                <div className="space-y-3">
                  {displayOrders && Object.entries(displayOrders).map(([power, orderList]) => {
                    if (!(orderList as string[]).length) return null;
                    const isPending = pendingOrderPowers.has(power);
                    return (
                      <div key={power}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-bold text-[#ff9500] uppercase tracking-wider">{power}</span>
                          {isPending && (
                            <span className="text-[10px] text-[#4a7c59] font-normal italic">pending</span>
                          )}
                        </div>
                        {(orderList as string[]).map((order, i) => {
                          const parsed = parseOrder(order);
                          if (!parsed) return null;
                          const humanized = humanizeOrder(parsed);
                          const result = results?.[order];
                          const status = result?.includes("void") ? "failed" :
                                        result?.includes("bounce") ? "bounced" :
                                        "success";
                          return (
                            <OrderItem
                              key={i}
                              territory={parsed.loc}
                              unitType={parsed.unit || ""}
                              order={humanized}
                              status={status}
                            />
                          );
                        })}
                      </div>
                    );
                  })}
                  {(!displayOrders || Object.values(displayOrders).every((v) => !(v as string[]).length)) && (
                    <div className="text-center text-[#808080] text-sm">No orders this phase.</div>
                  )}
                </div>
              )}

              {leftTab === "messages" && (
                <div className="space-y-2">
                  {allMessages && allMessages.length > 0 ? (
                    allMessages
                      .sort((a, b) => a.phase.localeCompare(b.phase))
                      .map((msg, idx) => (
                        <MessageBubble
                          key={idx}
                          from={msg.sender}
                          to={msg.recipient}
                          content={msg.message}
                          timestamp={msg.phase}
                        />
                      ))
                  ) : (
                    <div className="text-center text-[#808080] text-sm">No messages</div>
                  )}
                  {liveMessages && liveMessages.length > 0 && (
                    <>
                      <div className="text-xs text-[#ff9500] uppercase tracking-wider my-2">Live Messages</div>
                      {liveMessages.map((msg, idx) => (
                        <MessageBubble
                          key={`live-${idx}`}
                          from={msg.sender}
                          to={msg.recipient}
                          content={msg.message}
                          timestamp="LIVE"
                        />
                      ))}
                    </>
                  )}
                </div>
              )}

              {leftTab === "summary" && state && (
                <div className="space-y-2">
                  {Object.entries(state.units).map(([power, units]) => (
                    <div key={power} className="p-3 bg-[#1a1a1a] border-2 border-[#3a3a3a] relative">
                      <Rivet size={5} style={{ left: "6px", top: "6px" }} />
                      <Rivet size={5} style={{ right: "6px", top: "6px" }} />
                      <div className="relative z-10">
                        <div className="text-xs text-[#ff9500] font-bold uppercase">{power}</div>
                        <div className="text-[10px] text-[#808080] mt-1">
                          {units.length} units • {state.centers[power]?.length || 0} centers
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TacticalPanel>
        </div>

        {/* Center: Map */}
        <div className="flex-1 min-w-0 min-h-0">
          <TacticalPanel title="TACTICAL MAP" className="h-full">
            {svgContent && state ? (
              <DiplomacyMap
                svgContent={svgContent}
                state={state}
                orders={displayOrders || {}}
                results={results || {}}
                onTerritoryHover={(loc) => {}}
                focusLocation={focusLocation}
              />
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-[#808080]">Loading map...</div>
              </div>
            )}
          </TacticalPanel>
        </div>

        {/* Right Sidebar: Activity + Memory */}
        <div className="w-64 min-w-[240px] flex-shrink flex flex-col gap-3 min-h-0">
          {/* Activity Feed */}
          <ActionLog
            actions={gameLog.map((entry, idx) => ({
              time: `T+${idx}`,
              message: `${entry.event}${entry.phase ? ` (${entry.phase})` : ""}`
            }))}
          />

          {/* Memory Viewer */}
          <TacticalPanel title="MEMORY" className="flex-1 min-h-0 flex flex-col">
            {/* Power Selector */}
            <div className="mb-3">
              <select
                value={selectedPower || ""}
                onChange={(e) => setSelectedPower(e.target.value)}
                className="w-full bg-[#1a1a1a] border-2 border-[#3a3a3a] text-[#e0e0e0] px-3 py-2 text-sm font-mono uppercase"
              >
                {activePowers.map(power => (
                  <option key={power} value={power}>{power}</option>
                ))}
              </select>
            </div>

            {/* Memory Content */}
            <div className="flex-1 overflow-auto min-h-0">
              {memoryLoading ? (
                <div className="text-center text-[#808080] text-sm">Loading memory...</div>
              ) : (
                <MemoryViewer content={memoryContent || ""} />
              )}
            </div>
          </TacticalPanel>

          {/* Power Badges */}
          <TacticalPanel className="!p-3">
            <div className="grid grid-cols-3 gap-2">
              {activePowers.map((power) => {
                const status = powerStatus[power] || "idle";
                const config = STATUS_CONFIG[status];
                const color = (POWER_DISPLAY_COLORS as any)[power] || "#808080";

                return (
                  <button
                    key={power}
                    onClick={() => setSelectedPower(power)}
                    className={`relative flex items-center gap-1.5 px-2 py-1.5 border-2 transition-all ${
                      selectedPower === power
                        ? "border-[#ff9500] bg-[#ff9500]/10"
                        : "border-[#3a3a3a] bg-[#1a1a1a] hover:border-[#4a4a4a]"
                    }`}
                  >
                    <span className="text-lg">{powerFlag(power)}</span>
                    {config.dot && (
                      <div className={`w-1.5 h-1.5 rounded-full ${config.dot} ${config.animate ? "animate-pulse" : ""}`} />
                    )}
                    {config.icon && (
                      <span className="text-xs text-[#4a7c59]">{config.icon}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </TacticalPanel>
        </div>
      </div>
    </div>
  );
}
