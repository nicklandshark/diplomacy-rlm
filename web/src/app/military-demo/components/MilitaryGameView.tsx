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
import { usePowerStatus } from "@/hooks/usePowerStatus";
import { useLiveOrders } from "@/hooks/useLiveOrders";
import { useLiveMessages } from "@/hooks/useLiveMessages";
import { phaseDisplayName, POWER_DISPLAY_COLORS } from "@/lib/constants";
import { powerFlag } from "@/lib/power-flags";
import { parseOrder, humanizeOrder, orderIcon } from "@/lib/parse-orders";
import type { LiveEvent } from "@/lib/types";
import { OrderPanel } from "./OrderPanel";
import { MessagePanel } from "./MessagePanel";
import { SummaryPanel } from "./SummaryPanel";
import { PhaseTimeline } from "./PhaseTimeline";
import { PhaseTransition } from "./PhaseTransition";
import { ActivityFeed } from "./ActivityFeed";
import { TacticalPanel, Rivet } from "@/app/military-ui-kit/components";

// Pixel art flag icons for each power
const PixelFlagIcon = ({ power, size = 20 }: { power: string; size?: number }) => {
  const flags: Record<string, JSX.Element> = {
    AUSTRIA: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
        <rect x="2" y="3" width="12" height="3" fill="#dc143c" />
        <rect x="2" y="6" width="12" height="3" fill="#ffffff" />
        <rect x="2" y="9" width="12" height="3" fill="#dc143c" />
      </svg>
    ),
    ENGLAND: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
        <rect x="2" y="3" width="12" height="10" fill="#012169" />
        <rect x="7" y="3" width="2" height="10" fill="#ffffff" />
        <rect x="2" y="7" width="12" height="2" fill="#ffffff" />
        <rect x="7" y="3" width="2" height="10" fill="#dc143c" />
        <rect x="2" y="7" width="12" height="2" fill="#dc143c" opacity="0.8" />
      </svg>
    ),
    FRANCE: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
        <rect x="2" y="3" width="4" height="10" fill="#002395" />
        <rect x="6" y="3" width="4" height="10" fill="#ffffff" />
        <rect x="10" y="3" width="4" height="10" fill="#ed2939" />
      </svg>
    ),
    GERMANY: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
        <rect x="2" y="3" width="12" height="3" fill="#000000" />
        <rect x="2" y="6" width="12" height="3" fill="#dc143c" />
        <rect x="2" y="9" width="12" height="3" fill="#ffcc00" />
      </svg>
    ),
    ITALY: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
        <rect x="2" y="3" width="4" height="10" fill="#008c45" />
        <rect x="6" y="3" width="4" height="10" fill="#ffffff" />
        <rect x="10" y="3" width="4" height="10" fill="#cd212a" />
      </svg>
    ),
    RUSSIA: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
        <rect x="2" y="3" width="12" height="3" fill="#ffffff" />
        <rect x="2" y="6" width="12" height="3" fill="#0039a6" />
        <rect x="2" y="9" width="12" height="3" fill="#d52b1e" />
      </svg>
    ),
    TURKEY: (
      <svg width={size} height={size} viewBox="0 0 16 16" fill="none" style={{ imageRendering: "pixelated" }}>
        <rect x="2" y="3" width="12" height="10" fill="#dc143c" />
        <circle cx="7" cy="8" r="2.5" fill="#ffffff" />
        <circle cx="8" cy="8" r="2" fill="#dc143c" />
        <path d="M 10 6 L 12 8 L 10 10 L 11 8 Z" fill="#ffffff" />
      </svg>
    ),
  };

  return flags[power] || null;
};

interface Props {
  gameId: string;
  initialPhases: string[];
  svgContent: string;
}

type LeftTab = "orders" | "messages" | "summary";

export default function MilitaryGameView({ gameId, initialPhases, svgContent }: Props) {
  const { phases, refresh: refreshPhases } = usePhases(gameId, initialPhases);
  const nav = usePhaseNavigation(phases);
  const [dataRefreshKey, setDataRefreshKey] = useState(0);
  const { state, orders, results, loading } = useGameData(gameId, nav.currentPhase, dataRefreshKey);
  const { messages: allMessages } = useAllMessages(gameId, dataRefreshKey);
  const gameLog = useGameLog(gameId, dataRefreshKey);

  const [leftTab, setLeftTab] = useState<LeftTab>("orders");
  const [selectedPower, setSelectedPower] = useState<string | null>(null);
  const [memoryRefreshKey, setMemoryRefreshKey] = useState(0);
  const [hoveredOrder, setHoveredOrder] = useState<string | null>(null);
  
  // Playback state
  const [playing, setPlaying] = useState(false);
  const [revealedOrderCount, setRevealedOrderCount] = useState(-1);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeOrderRef = useRef<HTMLDivElement>(null);

  // Live data
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
  const powerStatus = usePowerStatus(liveEvents.events);
  const liveOrders = useLiveOrders(liveEvents.events);
  const liveMessages = useLiveMessages(liveEvents.events);

  const memoryPhase = (liveEvents.connected && nav.isLast) ? undefined : (nav.currentPhase || undefined);
  const { content: memoryContent, loading: memoryLoading } = useMemory(
    gameId,
    selectedPower || "FRANCE",
    memoryPhase,
    memoryRefreshKey
  );

  // Track unread messages
  const lastSeenMessageCount = useRef<number>(0);
  const totalMessages = (allMessages?.length || 0) + (liveMessages?.length || 0);
  useEffect(() => {
    if (leftTab === "messages") {
      lastSeenMessageCount.current = totalMessages;
    }
  }, [leftTab, totalMessages]);
  const unreadCount = totalMessages - lastSeenMessageCount.current;

  // Focus location from hovered order
  const focusLocation = useMemo(() => {
    if (!hoveredOrder) return null;
    const parsed = parseOrder(hoveredOrder);
    return parsed?.dest || parsed?.loc || null;
  }, [hoveredOrder]);

  // Live step indicator
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

  const livePhase = useMemo(() => {
    for (let i = liveEvents.events.length - 1; i >= 0; i--) {
      if (liveEvents.events[i].phase) return liveEvents.events[i].phase;
    }
    return null;
  }, [liveEvents.events]);

  // Merge orders with live pending
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

  // Flatten orders for playback
  const flatDisplayOrders = useMemo(() => {
    if (!displayOrders) return [];
    const result: string[] = [];
    for (const [, orderList] of Object.entries(displayOrders)) {
      for (const raw of orderList as string[]) result.push(raw);
    }
    return result;
  }, [displayOrders]);

  // Pending order powers
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

  // Playback logic
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

    const t = setTimeout(() => {
      if (nav.isLast) { setPlaying(false); setRevealedOrderCount(-1); }
      else nav.goNext();
    }, 2000);
    playTimerRef.current = t;
    return () => clearTimeout(t);
  }, [playing, revealedOrderCount, flatDisplayOrders.length, nav.isLast, nav]);

  useEffect(() => {
    activeOrderRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [revealedOrderCount]);

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
      setRevealedOrderCount(0);
      return true;
    });
  }, [nav.isLast, nav]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
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

  const tabButtonClass = (active: boolean) =>
    `px-3 py-1.5 text-xs font-medium capitalize transition-colors relative ${
      active
        ? "text-[#ff9500] border-b-2 border-[#ff9500] bg-[#ff9500]/5"
        : "text-[#808080] hover:text-[#e0e0e0] border-b-2 border-transparent"
    }`;

  return (
    <div className="flex flex-col gap-2 h-[calc(100vh-80px)] bg-[#0a0a0a]">
      <PhaseTransition phase={nav.currentPhase} show={!!nav.currentPhase} />

      {/* Top nav bar */}
      <TacticalPanel className="flex items-center gap-3" contentClassName="p-2 flex flex-row items-center gap-3">
        <span className="text-sm font-semibold text-[#ff9500] whitespace-nowrap">{gameId}</span>
        <div className="w-px h-5 bg-[#3a3a3a] flex-shrink-0" />
        
        {/* Phase controls */}
        <div className="flex items-center gap-1">
          <button
            disabled={nav.isFirst}
            onClick={nav.goPrev}
            className="px-2 py-1 text-[10px] font-bold uppercase bg-[#2a2a2a] border border-[#3a3a3a] text-[#808080] hover:border-[#ff9500] hover:text-[#ff9500] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            ◀
          </button>
          <button
            onClick={handlePlayToggle}
            className={`px-2 py-1 text-[10px] font-bold uppercase border transition-all ${
              playing 
                ? "bg-[#ff9500] border-[#ff9500] text-[#0a0a0a]" 
                : "bg-[#2a2a2a] border-[#3a3a3a] text-[#808080] hover:border-[#4a4a4a]"
            }`}
          >
            {playing ? "⏹" : "▶"}
          </button>
          <button
            disabled={nav.isLast}
            onClick={nav.goNext}
            className="px-2 py-1 text-[10px] font-bold uppercase bg-[#2a2a2a] border border-[#3a3a3a] text-[#808080] hover:border-[#ff9500] hover:text-[#ff9500] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            ▶
          </button>
        </div>

        {/* Phase timeline */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <PhaseTimeline
            phases={phases}
            currentPhase={nav.currentPhase}
            onSelectPhase={nav.goTo}
          />
        </div>

        {/* Status */}
        <div className="w-px h-5 bg-[#3a3a3a] flex-shrink-0" />
        <span className="flex items-center gap-1.5 flex-shrink-0 text-xs whitespace-nowrap">
          {liveEvents.connected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4a7c59] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4a7c59]" />
              </span>
              <span className="text-[#4a7c59] font-medium">{liveStep || "Live"}</span>
            </>
          ) : (
            <span className="text-[#808080]">{phases.length} phase{phases.length !== 1 ? "s" : ""}</span>
          )}
        </span>
      </TacticalPanel>

      {/* Main content */}
      <div className="flex gap-2 flex-1 min-h-0">
        {/* Left sidebar */}
        <TacticalPanel title="INTELLIGENCE" className="w-72 flex-shrink-0 flex flex-col min-h-0" contentClassName="p-2 flex flex-col flex-1 min-h-0">
          <div className="flex border-b border-[#2a2a2a]">
            {(["orders", "messages", "summary"] as LeftTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setLeftTab(tab)}
                className={tabButtonClass(leftTab === tab)}
              >
                {tab}
                {tab === "messages" && unreadCount > 0 && leftTab !== "messages" && (
                  <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-[#ff9500] text-[#0a0a0a] rounded-full min-w-[18px] text-center">
                    {unreadCount}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-auto min-h-0">
            {leftTab === "orders" && (
              <OrderPanel
                orders={displayOrders}
                results={results}
                pendingPowers={pendingOrderPowers}
                onOrderHover={setHoveredOrder}
                revealedOrderCount={playing ? revealedOrderCount : -1}
                activeOrderRef={activeOrderRef}
              />
            )}
            {leftTab === "messages" && (
              <MessagePanel
                messages={allMessages}
                liveMessages={liveMessages}
              />
            )}
            {leftTab === "summary" && (
              <SummaryPanel state={state} />
            )}
          </div>
        </TacticalPanel>

        {/* Center: Map + Activity (unified) */}
        <div className="flex-1 min-w-0 flex flex-col gap-1 min-h-0">
          {/* Map area - constrained max height, sizes by aspect ratio */}
          <div className="w-full flex-shrink min-h-0" style={{
            maxHeight: '70vh',
            containerType: 'size'
          }}>
            {loading ? (
              <div className="flex items-center justify-center h-64 text-[#808080]">
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
                revealedOrderCount={playing ? revealedOrderCount : -1}
              />
            )}
          </div>

          {/* Activity feed below map — fills ALL remaining vertical space */}
          <TacticalPanel className="flex-1 min-h-[80px] flex flex-col" contentClassName="p-0 flex flex-col flex-1 min-h-0">
            <ActivityFeed
              events={liveEvents.events}
              connected={liveEvents.connected}
              gameLog={gameLog}
              livePhase={livePhase}
              liveStep={liveStep}
              phaseCount={phases.length}
              powerStatus={powerStatus}
              activePowers={activePowers}
              selectedPower={selectedPower}
              onSelectPower={setSelectedPower}
              units={state?.units as Record<string, string[]> | undefined}
              centers={state?.centers as Record<string, string[]> | undefined}
            />
          </TacticalPanel>
        </div>

        {/* Right sidebar: Memory with affixed tabs */}
        <div className="w-72 flex-shrink-0 flex flex-row min-h-0 gap-0">
          {/* Vertical power tabs - separate container */}
          <div className="w-14 flex-shrink-0 flex flex-col border-r-2 border-[#1a1a1a] py-1 overflow-y-auto" style={{
            background: 'linear-gradient(to right, #1a1a1a 0%, #151515 50%, #1a1a1a 100%)'
          }}>
            {activePowers.map((power) => {
              const isActive = selectedPower === power;
              const color = POWER_DISPLAY_COLORS[power] || "#666";
              return (
                <button
                  key={power}
                  onClick={() => setSelectedPower(power)}
                  className={`relative flex flex-col items-center gap-0.5 px-1.5 py-2.5 mx-1 my-0.5 text-[10px] font-bold uppercase tracking-wider transition-all border-2 overflow-hidden ${
                    isActive
                      ? "text-[#ff9500] border-[#ff9500]"
                      : "text-[#808080] border-[#3a3a3a] hover:text-[#e0e0e0] hover:border-[#4a4a4a]"
                  }`}
                  style={{
                    background: isActive
                      ? 'linear-gradient(135deg, #2a2a2a 0%, #252525 50%, #2a2a2a 100%)'
                      : 'linear-gradient(135deg, #1a1a1a 0%, #151515 50%, #1a1a1a 100%)',
                    boxShadow: isActive
                      ? 'inset 0 2px 4px rgba(0,0,0,0.6), inset 0 -1px 2px rgba(255,255,255,0.05), 0 0 12px rgba(255,149,0,0.4)'
                      : 'inset 0 2px 4px rgba(0,0,0,0.8), inset 0 -1px 2px rgba(255,255,255,0.02)'
                  }}
                  title={power}
                >
                  {/* Corner rivets on active tab */}
                  {isActive && (
                    <>
                      <Rivet size={4} style={{ position: 'absolute', left: '3px', top: '3px', zIndex: 10 }} />
                      <Rivet size={4} style={{ position: 'absolute', right: '3px', top: '3px', zIndex: 10 }} />
                      <Rivet size={4} style={{ position: 'absolute', left: '3px', bottom: '3px', zIndex: 10 }} />
                      <Rivet size={4} style={{ position: 'absolute', right: '3px', bottom: '3px', zIndex: 10 }} />

                      {/* Orange accent bar */}
                      <span
                        className="absolute left-0 top-2 bottom-2 w-1"
                        style={{
                          background: 'linear-gradient(to bottom, transparent, #ff9500, transparent)',
                          boxShadow: '0 0 8px rgba(255,149,0,0.8)'
                        }}
                      />

                      {/* Inner glow */}
                      <span
                        className="absolute inset-0 pointer-events-none"
                        style={{
                          background: 'radial-gradient(ellipse at center, rgba(255,149,0,0.15) 0%, transparent 70%)'
                        }}
                      />
                    </>
                  )}

                  <div className="relative z-10 flex flex-col items-center">
                    <PixelFlagIcon power={power} size={24} />
                    <span className="text-[8px] mt-1">{power.slice(0, 3)}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Memory content - gets its own TacticalPanel */}
          <TacticalPanel title="MEMORY" className="flex-1 flex min-h-0" contentClassName="p-3 flex flex-col flex-1 min-h-0 overflow-auto">
            {memoryLoading && (
              <div className="text-[#808080] text-sm">Loading memory...</div>
            )}
            {!memoryLoading && memoryContent && (
              <MemoryViewer content={memoryContent} />
            )}
            {!memoryLoading && !memoryContent && selectedPower && (
              <div className="text-[#808080] text-sm">No memory for {selectedPower}.</div>
            )}
          </TacticalPanel>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#1a1a1a] border border-[#2a2a2a] rounded text-xs text-[#808080]">
        <span className="flex items-center gap-2">
          <strong className="text-[#e0e0e0]">
            {nav.currentPhase && phaseDisplayName(nav.currentPhase)}
          </strong>
          <span className="text-[#666]">
            ({nav.currentIndex + 1} of {phases.length})
          </span>
          {liveEvents.connected && (
            <span className="relative flex h-1.5 w-1.5 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4a7c59] opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-[#4a7c59]" />
            </span>
          )}
        </span>
        <span className="flex items-center gap-3">
          <a
            href={`/api/games/${gameId}/export`}
            download={`${gameId}-replay.json`}
            className="text-[#666] hover:text-[#e0e0e0] transition-colors"
            title="Export replay JSON"
          >
            ↓ Export
          </a>
          <span className="text-[#666]">
            {phases.length} phase{phases.length !== 1 ? "s" : ""}
          </span>
        </span>
      </div>
    </div>
  );
}
