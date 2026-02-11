"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import DiplomacyMap from "@/components/map/DiplomacyMap";
import PhaseTimeline from "@/components/phase/PhaseTimeline";
import PhaseControls from "@/components/phase/PhaseControls";
import PowerBadge from "@/components/power/PowerBadge";
import MemoryViewer from "@/components/memory/MemoryViewer";
import MessageList from "@/components/messages/MessageList";
import ActivityFeed from "@/components/activity/ActivityFeed";
import PhaseTransitionOverlay from "@/components/phase/PhaseTransitionOverlay";
import GameSummary from "@/components/summary/GameSummary";
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
import { soundPhaseComplete, soundOrderSubmitted, soundMessageReceived, soundGameHalted } from "@/lib/sounds";

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
  submitted: { dot: "bg-green-400", animate: false, icon: "\u2713" },
  defaulted: { dot: "bg-yellow-500", animate: false, icon: "\u2013" },
  timeout: { dot: "bg-orange-400", animate: false, icon: "!" },
};

export default function GameView({ gameId, initialPhases, svgContent }: Props) {
  const { phases, refresh: refreshPhases } = usePhases(gameId, initialPhases);
  const nav = usePhaseNavigation(phases);
  const [dataRefreshKey, setDataRefreshKey] = useState(0);
  const { state, orders, results, loading } = useGameData(gameId, nav.currentPhase, dataRefreshKey);
  const { messages: allMessages } = useAllMessages(gameId, dataRefreshKey);
  const [selectedPower, setSelectedPower] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<LeftTab>("orders");
  const [hoveredOrder, setHoveredOrder] = useState<string | null>(null);

  // Playback state: step through individual orders one at a time
  const [playing, setPlaying] = useState(false);
  const [revealedOrderCount, setRevealedOrderCount] = useState(-1); // -1 = show all
  const playTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeOrderRef = useRef<HTMLDivElement>(null);

  const [memoryRefreshKey, setMemoryRefreshKey] = useState(0);

  const onEvent = useCallback((event: LiveEvent) => {
    if (event.event_type === "snapshot.saved") {
      refreshPhases();
      setDataRefreshKey(k => k + 1);
      soundPhaseComplete();
    } else if (event.event_type === "phase.end") {
      refreshPhases();
      setDataRefreshKey(k => k + 1);
    } else if (event.event_type === "memory.changed" && event.power) {
      setSelectedPower(event.power);
      setMemoryRefreshKey(k => k + 1);
    } else if (event.event_type === "orders.submitted") {
      soundOrderSubmitted();
    } else if (event.event_type === "message.flushed") {
      soundMessageReceived();
    } else if (event.event_type === "game.halt" || event.event_type === "game.end") {
      soundGameHalted();
    }
  }, [refreshPhases]);

  const liveEvents = useLiveEvents(gameId, { onEvent });
  const gameLog = useGameLog(gameId, dataRefreshKey);

  // When connected and on latest phase, read live memory (no phase param = game root file)
  const memoryPhase = (liveEvents.connected && nav.isLast) ? undefined : (nav.currentPhase || undefined);
  const { content: memoryContent, loading: memoryLoading } = useMemory(
    gameId,
    selectedPower || "FRANCE",
    memoryPhase,
    memoryRefreshKey
  );

  // Live data hooks
  const powerStatus = usePowerStatus(liveEvents.events);
  const liveOrders = useLiveOrders(liveEvents.events);
  const liveMessages = useLiveMessages(liveEvents.events);

  // Track unread messages for notification badge
  const lastSeenMessageCount = useRef<number>(0);
  const totalMessages = (allMessages?.length || 0) + (liveMessages?.length || 0);

  useEffect(() => {
    if (leftTab === "messages") {
      lastSeenMessageCount.current = totalMessages;
    }
  }, [leftTab, totalMessages]);

  const unreadCount = totalMessages - lastSeenMessageCount.current;

  // Compute focus location from hovered order (destination for moves, source for holds)
  const focusLocation = useMemo(() => {
    if (!hoveredOrder) return null;
    const parsed = parseOrder(hoveredOrder);
    if (!parsed) return null;
    return parsed.dest || parsed.loc;
  }, [hoveredOrder]);

  // Derive current step label from latest SSE event
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

  // Derive live phase from latest SSE event
  const livePhase = useMemo(() => {
    for (let i = liveEvents.events.length - 1; i >= 0; i--) {
      if (liveEvents.events[i].phase) return liveEvents.events[i].phase;
    }
    return null;
  }, [liveEvents.events]);

  // Derive memory lastUpdated timestamp from SSE events
  const memoryLastUpdated = useMemo(() => {
    for (let i = liveEvents.events.length - 1; i >= 0; i--) {
      const ev = liveEvents.events[i];
      if (ev.event_type === "memory.changed" && ev.power === selectedPower) {
        return ev.ts_wall;
      }
    }
    return undefined;
  }, [liveEvents.events, selectedPower]);

  // Merge snapshot orders with live pending orders
  const displayOrders = useMemo(() => {
    const base = orders || {};
    if (!liveEvents.connected) return base;
    const merged: Record<string, string[]> = { ...base };
    for (const [power, orderList] of Object.entries(liveOrders.pending)) {
      if (orderList.length > 0 && (!merged[power] || (merged[power] as string[]).length === 0)) {
        merged[power] = orderList;
      }
    }
    return merged;
  }, [orders, liveOrders.pending, liveEvents.connected]);

  // Flatten display orders for step-through playback (same iteration order as sidebar & parseOrders)
  const flatDisplayOrders = useMemo(() => {
    if (!displayOrders) return [];
    const result: string[] = [];
    for (const [, orderList] of Object.entries(displayOrders)) {
      for (const raw of orderList as string[]) result.push(raw);
    }
    return result;
  }, [displayOrders]);

  // Reset reveal count when phase changes during playback
  useEffect(() => {
    if (playing) setRevealedOrderCount(0);
  }, [playing, nav.currentIndex]);

  // Step timer: reveal one order at a time, then advance phase
  useEffect(() => {
    if (!playing || revealedOrderCount < 0) return;
    const total = flatDisplayOrders.length;

    if (total === 0) {
      const t = setTimeout(() => {
        if (nav.isLast) { setPlaying(false); setRevealedOrderCount(-1); }
        else nav.goNext();
      }, 800);
      playTimerRef.current = t;
      return () => clearTimeout(t);
    }

    if (revealedOrderCount < total) {
      const t = setTimeout(() => setRevealedOrderCount(c => c + 1), 1500);
      playTimerRef.current = t;
      return () => clearTimeout(t);
    }

    // All revealed — hold then advance
    const t = setTimeout(() => {
      if (nav.isLast) { setPlaying(false); setRevealedOrderCount(-1); }
      else nav.goNext();
    }, 2000);
    playTimerRef.current = t;
    return () => clearTimeout(t);
  }, [playing, revealedOrderCount, flatDisplayOrders.length, nav.isLast]);

  // Auto-scroll sidebar to the active order during playback
  useEffect(() => {
    activeOrderRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [revealedOrderCount]);

  // During playback, zoom map to the active order (reuses focusLocation → animateViewBox)
  useEffect(() => {
    if (!playing) return;
    if (revealedOrderCount > 0 && revealedOrderCount <= flatDisplayOrders.length) {
      setHoveredOrder(flatDisplayOrders[revealedOrderCount - 1]);
    } else {
      setHoveredOrder(null);
    }
  }, [playing, revealedOrderCount, flatDisplayOrders]);

  const handlePlayToggle = useCallback(() => {
    setPlaying(p => {
      if (p) {
        setRevealedOrderCount(-1);
        setHoveredOrder(null);
        if (playTimerRef.current) clearTimeout(playTimerRef.current);
        return false;
      }
      if (nav.isLast) nav.goFirst();
      return true;
    });
  }, [nav.isLast, nav.goFirst]);

  // Keyboard shortcuts: Space = play/pause, Escape = stop playback + reset zoom
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === " ") {
        e.preventDefault();
        handlePlayToggle();
      } else if (e.key === "Escape") {
        if (playing) {
          setPlaying(false);
          setRevealedOrderCount(-1);
          setHoveredOrder(null);
          if (playTimerRef.current) clearTimeout(playTimerRef.current);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handlePlayToggle, playing]);

  // Track which powers have only live (not yet snapshot) orders
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

  // Auto-select first active power for memory
  useEffect(() => {
    if (!selectedPower && activePowers.length > 0) {
      setSelectedPower(activePowers[0]);
    }
  }, [activePowers, selectedPower]);

  const tabButtonClass = (active: boolean) =>
    `px-3 py-1.5 text-xs font-medium capitalize transition-colors relative ${
      active
        ? "text-blue-400 border-b-2 border-blue-400 bg-blue-500/5"
        : "text-gray-500 hover:text-gray-300 border-b-2 border-transparent"
    }`;

  return (
    <div className="flex flex-col gap-2 h-[calc(100vh-80px)]">
      {/* Top nav bar */}
      <div className="flex items-center gap-3 bg-gray-900/60 rounded-lg border border-gray-800 px-3 py-2">
        {/* Game title */}
        <span className="text-sm font-semibold text-gray-100 whitespace-nowrap">{gameId}</span>

        <div className="w-px h-5 bg-gray-700 flex-shrink-0" />

        {/* Phase controls */}
        <PhaseControls
          onPrev={nav.goPrev}
          onNext={nav.goNext}
          isFirst={nav.isFirst}
          isLast={nav.isLast}
          playing={playing}
          onPlayToggle={handlePlayToggle}
        />

        {/* Phase timeline */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <PhaseTimeline
            phases={phases}
            currentIndex={nav.currentIndex}
            onSelect={nav.goTo}
          />
        </div>

        {/* Step indicator — shows current game step when live, phase count when offline */}
        <div className="w-px h-5 bg-gray-700 flex-shrink-0" />
        <span className="flex items-center gap-1.5 flex-shrink-0 text-xs whitespace-nowrap">
          {liveEvents.connected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-green-300 font-medium">{liveStep || "Connected"}</span>
              <button
                onClick={async () => {
                  if (!confirm("Stop this game? The process will be terminated.")) return;
                  try {
                    const res = await fetch(`/api/games/${gameId}/stop`, { method: "POST", signal: AbortSignal.timeout(10_000) });
                    const data = await res.json();
                    if (!res.ok) alert(data.error || "Failed to stop game");
                  } catch { alert("Failed to stop game"); }
                }}
                className="ml-1 px-1.5 py-0.5 text-[10px] font-medium bg-red-900/60 text-red-300 hover:bg-red-800/80 hover:text-red-200 rounded border border-red-800/50 transition-colors"
                title="Stop game"
              >
                Stop
              </button>
            </>
          ) : (
            <span className="text-gray-500">{phases.length} phase{phases.length !== 1 ? "s" : ""}</span>
          )}
        </span>
      </div>

      {/* Main content: left sidebar + map + right sidebar */}
      <div className="flex gap-2 flex-1 min-h-0">
        {/* Left sidebar: Orders + Messages */}
        <div className="w-72 flex-shrink-0 flex flex-col min-h-0 bg-gray-900/50 rounded-lg border border-gray-800">
          <div className="flex border-b border-gray-800">
            {(["orders", "messages", "summary"] as LeftTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setLeftTab(tab)}
                className={tabButtonClass(leftTab === tab)}
              >
                {tab}
                {tab === "messages" && unreadCount > 0 && leftTab !== "messages" && (
                  <>
                    <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-blue-500 text-white rounded-full min-w-[18px] text-center">
                      {unreadCount}
                    </span>
                    <span className="ml-0.5 relative flex h-2 w-2 inline-flex">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
                    </span>
                  </>
                )}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-auto min-h-0">
            {leftTab === "orders" && (
              <div className="p-2 text-sm">
                {(() => {
                  let orderIdx = 0;
                  const isRevealing = playing && revealedOrderCount >= 0;
                  return displayOrders && Object.entries(displayOrders).map(([power, orderList]) => {
                    if (!(orderList as string[]).length) return null;
                    const isPending = pendingOrderPowers.has(power);
                    return (
                      <div key={power} className="mb-3">
                        <div className="flex items-center gap-1.5 text-xs font-medium mb-1">
                          <span className="text-gray-400">{power}</span>
                          {isPending && (
                            <span className="text-[10px] text-blue-400 font-normal italic">pending</span>
                          )}
                        </div>
                        {(orderList as string[]).map((order, i) => {
                          const idx = orderIdx++;
                          const parsed = parseOrder(order);
                          const isHovered = hoveredOrder === order;
                          const isActive = isRevealing && idx === revealedOrderCount - 1;
                          const isHidden = isRevealing && idx >= revealedOrderCount;
                          const isDimmed = isRevealing && idx < revealedOrderCount - 1;
                          return (
                            <div
                              key={i}
                              ref={isActive ? activeOrderRef : undefined}
                              className={`flex items-center gap-1.5 text-xs pl-2 py-0.5 rounded cursor-default transition-all duration-300 ${
                                isPending && !isActive ? "border-l-2 border-blue-500/40 " : ""
                              }${
                                isActive ? "bg-blue-500/20 text-white border-l-2 border-blue-400 " :
                                isHidden ? "opacity-30 text-gray-600 " :
                                isDimmed ? "opacity-60 text-gray-400 " :
                                isHovered ? "bg-gray-800 text-white " : "text-gray-300 hover:bg-gray-800/50 "
                              }`}
                              title={order}
                              onMouseEnter={() => !playing && setHoveredOrder(order)}
                              onMouseLeave={() => !playing && setHoveredOrder(null)}
                            >
                              {parsed && (
                                <span className={`w-4 text-center flex-shrink-0 ${isActive ? "text-blue-400" : "text-gray-500"}`}>
                                  {orderIcon(parsed.action)}
                                </span>
                              )}
                              <span>{parsed ? humanizeOrder(parsed) : order}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  });
                })()}
                {(!displayOrders || Object.values(displayOrders).every((v) => !(v as string[]).length)) && (
                  <div className="text-gray-500 text-xs p-2">No orders this phase.</div>
                )}
              </div>
            )}
            {leftTab === "messages" && (
              <MessageList
                messages={allMessages}
                liveMessages={liveMessages}
              />
            )}
            {leftTab === "summary" && (
              <GameSummary gameId={gameId} currentPhase={nav.currentPhase || undefined} refreshKey={dataRefreshKey} isLive={liveEvents.connected} />
            )}
          </div>
        </div>

        {/* Map area (center) + Activity below */}
        <div className="flex-1 min-w-0 flex flex-col gap-2 min-h-0">
          <div className="flex-1 min-h-0 flex flex-col items-center overflow-hidden">
            {/* Map container with size containment for proper aspect-ratio fitting */}
            <div className="flex-1 min-h-0 w-full relative" style={{ containerType: 'size' }}>
              <PhaseTransitionOverlay phase={nav.currentPhase} />
              {loading ? (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  Loading phase data...
                </div>
              ) : (
                <DiplomacyMap
                  svgContent={svgContent}
                  state={state}
                  orders={displayOrders || undefined}
                  results={results}
                  hoveredOrder={hoveredOrder}
                  focusLocation={focusLocation}
                  revealedOrderCount={revealedOrderCount}
                />
              )}
            </div>
          </div>
          {/* Activity feed below map — fixed height so it's always visible */}
          <div className="h-44 flex-shrink-0 bg-gray-900/50 rounded-lg border border-gray-800 overflow-hidden">
            <ActivityFeed events={liveEvents.events} connected={liveEvents.connected} gameLog={gameLog} livePhase={livePhase} liveStep={liveStep} phaseCount={phases.length} powerStatus={powerStatus} activePowers={activePowers} selectedPower={selectedPower} onSelectPower={setSelectedPower} units={state?.units as Record<string, string[]> | undefined} centers={state?.centers as Record<string, string[]> | undefined} />
          </div>
        </div>

        {/* Right sidebar: Memory only */}
        <div className="w-72 flex-shrink-0 flex min-h-0 bg-gray-900/50 rounded-lg border border-gray-800">
          {/* Vertical power tabs */}
          <div className="flex flex-col border-r border-gray-800 py-1">
            {activePowers.map((power) => {
              const isActive = selectedPower === power;
              const color = POWER_DISPLAY_COLORS[power] || "#666";
              return (
                <button
                  key={power}
                  onClick={() => setSelectedPower(power)}
                  className={`flex flex-col items-center gap-0.5 px-2 py-1.5 text-[10px] font-medium transition-colors relative ${
                    isActive ? "text-white" : "text-gray-500 hover:text-gray-300"
                  }`}
                  style={{
                    backgroundColor: isActive ? color + "22" : "transparent",
                  }}
                  title={power}
                >
                  {isActive && (
                    <span
                      className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r"
                      style={{ backgroundColor: color }}
                    />
                  )}
                  <span className="text-sm">{powerFlag(power)}</span>
                  <span>{power.slice(0, 3)}</span>
                </button>
              );
            })}
          </div>
          {/* Memory content */}
          <div className="flex-1 flex flex-col min-w-0 min-h-0">
            <div className="flex-1 overflow-auto min-h-0">
              {memoryLoading && (
                <div className="text-gray-500 text-sm p-4">Loading memory...</div>
              )}
              {!memoryLoading && memoryContent && (
                <MemoryViewer content={memoryContent} lastUpdated={memoryLastUpdated} />
              )}
              {!memoryLoading && !memoryContent && selectedPower && (
                <div className="text-gray-500 text-sm p-4">No memory for {selectedPower}.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-gray-900 border border-gray-800 rounded text-xs text-gray-500">
        <span className="flex items-center gap-2">
          <strong className="text-gray-200">
            {nav.currentPhase && phaseDisplayName(nav.currentPhase)}
          </strong>
          <span className="text-gray-600">
            ({nav.currentIndex + 1} of {phases.length})
          </span>
          {liveEvents.connected && (
            <span className="relative flex h-1.5 w-1.5 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
            </span>
          )}
        </span>
        <span className="flex items-center gap-3">
          <a
            href={`/api/games/${gameId}/export`}
            download={`${gameId}-replay.json`}
            className="text-gray-600 hover:text-gray-300 transition-colors"
            title="Export replay JSON"
          >
            &#8595; Export
          </a>
          <span className="text-gray-600">
            {phases.length} phase{phases.length !== 1 ? "s" : ""}
          </span>
        </span>
      </div>
    </div>
  );
}
