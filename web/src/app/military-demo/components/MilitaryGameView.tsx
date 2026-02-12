"use client";

import Link from "next/link";
import { useState, useCallback, useEffect, useMemo, useRef, useId } from "react";
import CRTMap from "./CRTMap";
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
import { parseOrder } from "@/lib/parse-orders";
import type { LiveEvent } from "@/lib/types";
import { soundPhaseComplete, soundOrderSubmitted, soundMessageReceived, soundGameHalted } from "@/lib/sounds";
import { OrderPanel } from "./OrderPanel";
import { MessagePanel } from "./MessagePanel";
import { SummaryPanel } from "./SummaryPanel";
import { PhaseTimeline } from "./PhaseTimeline";
import { PhaseTransition } from "./PhaseTransition";
import { ActivityFeed } from "./ActivityFeed";
import { TacticalPanel, Rivet, TacticalTabGroup, GlassPane } from "@/app/military-ui-kit/components";
import CRTScreenOverlay from "./CRTScreenOverlay";
import { LeaderboardDrawer } from "./LeaderboardDrawer";

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
type ActivitySplitBreakpoint = "compact" | "normal" | "wide";

const MAP_MONITOR_LAYOUT = {
  mapAspect: 1835 / 1360,
  mapTopInsetPx: 10,
  mapSideInsetPx: 20,
  mapActivityGapPx: 0,
  minMapHeightPx: 320,
  minActivityHeightPx: 170,
  minActivityPct: 12,
  maxActivityPct: 52,
} as const;

function getActivitySplitBreakpoint(width: number): ActivitySplitBreakpoint {
  if (width < 900) return "compact";
  if (width < 1320) return "normal";
  return "wide";
}

function fallbackFocusLocation(rawOrder: string): string | null {
  // Accept common display/order formats and pick the most likely destination first.
  const tokens = rawOrder.toUpperCase().match(/[A-Z]{3}/g);
  if (!tokens || tokens.length === 0) return null;
  const ignore = new Set([
    "HLD",
    "HOL",
    "HOLD",
    "SUP",
    "SUPPORT",
    "MTO",
    "VIA",
    "CVY",
    "CONVOY",
    "RTO",
    "BLD",
    "DSB",
    "WAI",
  ]);
  const provinces = tokens.filter((t) => !ignore.has(t));
  if (provinces.length === 0) return null;
  return provinces[provinces.length - 1];
}

export default function MilitaryGameView({ gameId, initialPhases, svgContent }: Props) {
  const phaseTimelineLabelId = useId();
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
  const [hoveredFactionTab, setHoveredFactionTab] = useState<string | null>(null);
  const [hoveredTopButton, setHoveredTopButton] = useState<"leaderboard" | "cancel" | null>(null);
  const [gameMeta, setGameMeta] = useState<{ backend: string | null; model: string | null } | null>(null);
  const [pressedTopButton, setPressedTopButton] = useState<"leaderboard" | "cancel" | null>(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [activityHeightPct, setActivityHeightPct] = useState(24);
  const centerColumnRef = useRef<HTMLDivElement>(null);
  const userResizedActivityRef = useRef(false);
  const splitBreakpointRef = useRef<ActivitySplitBreakpoint>("wide");

  // Fetch game meta for footer model display
  useEffect(() => {
    fetch(`/api/games/${gameId}/meta`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setGameMeta({ backend: d.backend, model: d.model }); })
      .catch(() => {});
  }, [gameId]);

  // Playback state
  const [playing, setPlaying] = useState(false);
  const [revealedOrderCount, setRevealedOrderCount] = useState(-1);
  const playTimerRef = useRef<NodeJS.Timeout | null>(null);
  const activeOrderRef = useRef<HTMLDivElement>(null);

  // Live data
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
    return parsed?.dest || parsed?.loc || fallbackFocusLocation(hoveredOrder);
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

  const memoryLastUpdated = useMemo(() => {
    for (let i = liveEvents.events.length - 1; i >= 0; i--) {
      const ev = liveEvents.events[i];
      if (ev.event_type === "memory.changed" && ev.power === selectedPower) {
        return ev.ts_wall;
      }
    }
    return undefined;
  }, [liveEvents.events, selectedPower]);

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

  const handleCancelPlayback = useCallback(() => {
    setPlaying(false);
    setRevealedOrderCount(-1);
    setHoveredOrder(null);
    if (playTimerRef.current) clearTimeout(playTimerRef.current);
  }, []);

  const handleCancelGame = useCallback(async () => {
    handleCancelPlayback();
    if (!confirm("Stop this game? The process will be terminated.")) return;
    try {
      const res = await fetch(`/api/games/${gameId}/stop`, { method: "POST", signal: AbortSignal.timeout(10_000) });
      const data = await res.json();
      if (!res.ok) alert(data.error || "Failed to stop game");
    } catch {
      alert("Failed to stop game");
    }
  }, [gameId, handleCancelPlayback]);

  const startActivityResize = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    e.stopPropagation();
    userResizedActivityRef.current = true;

    const startY = e.clientY;
    const startPct = activityHeightPct;
    document.body.style.cursor = "ns-resize";
    document.body.style.userSelect = "none";

    const onMove = (ev: MouseEvent) => {
      const host = centerColumnRef.current;
      if (!host) return;
      const rect = host.getBoundingClientRect();
      if (rect.height <= 0) return;
      const maxByMapHeight =
        100 -
        ((MAP_MONITOR_LAYOUT.minMapHeightPx +
          MAP_MONITOR_LAYOUT.mapTopInsetPx +
          MAP_MONITOR_LAYOUT.mapActivityGapPx) /
          rect.height) *
          100;
      const maxAllowed = Math.max(
        MAP_MONITOR_LAYOUT.minActivityPct,
        Math.min(MAP_MONITOR_LAYOUT.maxActivityPct, maxByMapHeight),
      );
      // Reverse drag direction: dragging up increases activity height.
      const deltaPct = ((startY - ev.clientY) / rect.height) * 100;
      const next = Math.max(MAP_MONITOR_LAYOUT.minActivityPct, Math.min(maxAllowed, startPct + deltaPct));
      setActivityHeightPct(next);
    };

    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, [activityHeightPct]);

  const getActivitySplitBounds = useCallback((hostHeight: number) => {
    const minPctByActivity = (MAP_MONITOR_LAYOUT.minActivityHeightPx / hostHeight) * 100;
    const maxPctByMap =
      100 -
      ((MAP_MONITOR_LAYOUT.minMapHeightPx +
        MAP_MONITOR_LAYOUT.mapTopInsetPx +
        MAP_MONITOR_LAYOUT.mapActivityGapPx) /
        hostHeight) *
        100;
    const minPct = Math.max(MAP_MONITOR_LAYOUT.minActivityPct, minPctByActivity);
    const maxPct = Math.min(MAP_MONITOR_LAYOUT.maxActivityPct, maxPctByMap);
    return { minPct, maxPct: Math.max(minPct, maxPct) };
  }, []);

  // Auto-tune default CRT/activity split to preserve map framing across viewport sizes.
  const applyDefaultActivitySplit = useCallback((force = false) => {
    const host = centerColumnRef.current;
    if (!host) return;

    const rect = host.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const { minPct, maxPct } = getActivitySplitBounds(rect.height);
    if (!force && userResizedActivityRef.current) {
      setActivityHeightPct((prev) => Math.min(Math.max(prev, minPct), maxPct));
      return;
    }

    const usableMapWidth = Math.max(0, rect.width - MAP_MONITOR_LAYOUT.mapSideInsetPx);
    const desiredMapHeight = usableMapWidth / MAP_MONITOR_LAYOUT.mapAspect;
    const desiredActivityHeight =
      rect.height -
      MAP_MONITOR_LAYOUT.mapTopInsetPx -
      MAP_MONITOR_LAYOUT.mapActivityGapPx -
      desiredMapHeight;
    const desiredPct = (desiredActivityHeight / rect.height) * 100;
    const safePct = Math.min(Math.max(desiredPct, minPct), Math.max(minPct, maxPct));

    setActivityHeightPct(safePct);
  }, [getActivitySplitBounds]);

  useEffect(() => {
    const host = centerColumnRef.current;
    if (!host || typeof ResizeObserver === "undefined") return;

    const syncActivitySplit = () => {
      const rect = host.getBoundingClientRect();
      const nextBreakpoint = getActivitySplitBreakpoint(rect.width);
      if (splitBreakpointRef.current !== nextBreakpoint) {
        splitBreakpointRef.current = nextBreakpoint;
        userResizedActivityRef.current = false;
        applyDefaultActivitySplit(true);
        return;
      }
      applyDefaultActivitySplit();
    };

    syncActivitySplit();
    const observer = new ResizeObserver(syncActivitySplit);
    observer.observe(host);
    return () => observer.disconnect();
  }, [applyDefaultActivitySplit]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === " ") {
        e.preventDefault();
        handlePlayToggle();
      } else if (e.key === "Escape") {
        if (playing) {
          handleCancelPlayback();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handlePlayToggle, handleCancelPlayback, playing]);

  return (
    <main className="flex flex-col gap-2 h-[calc(100vh-80px)] bg-[#0a0a0a]" aria-label="Diplomacy military game viewer">
      <PhaseTransition phase={nav.currentPhase} show={!!nav.currentPhase} />

      {/* Top title plate */}
      <div className="relative w-full h-[64px] px-3 pt-1.5 pb-0.5" role="banner" aria-label="Viewer title plate">
        <div
          className="relative h-full w-full rounded-[8px] border px-4 py-2 overflow-hidden"
          style={{
            borderColor: "#2b2926",
            background:
              "repeating-linear-gradient(90deg, transparent 0px, transparent 1px, rgba(255,255,255,0.01) 1px, rgba(255,255,255,0.01) 2px), linear-gradient(180deg, #403b34 0%, #2f2b26 52%, #25221f 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.45), 0 4px 10px rgba(0,0,0,0.35)",
          }}
        >
          <Rivet size={8} style={{ left: "8px", top: "8px", opacity: 0.62 }} />
          <Rivet size={8} style={{ right: "8px", top: "8px", opacity: 0.62 }} />
          <Rivet size={8} style={{ left: "8px", bottom: "8px", opacity: 0.62 }} />
          <Rivet size={8} style={{ right: "8px", bottom: "8px", opacity: 0.62 }} />
          <div className="absolute left-0 right-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.16),transparent)]" />
          <Link
            href="/"
            className="inline-block rounded-[4px] px-1 -ml-1 focus:outline-none focus-visible:ring-1 focus-visible:ring-[#d8c183]/60"
            title="Go home"
            aria-label="Go to home page"
          >
            <div className="font-ui-title text-[11px] leading-none tracking-[0.22em] font-semibold text-[#ceb97f]">
              DIPLOMACY RLM
            </div>
            <div className="font-ui-title text-[25px] leading-[21px] font-black tracking-[0.08em] text-[#d8c183]">
              VIEWER
            </div>
          </Link>
          <div className="font-ui-panel absolute right-4 top-2 text-[8px] leading-none uppercase tracking-[0.2em] text-[#8f8776]">
            CASE-MK.IV
          </div>
          <div className="font-ui-panel absolute right-4 bottom-2 text-[9px] leading-none uppercase tracking-[0.18em] text-[#cdb786]">
            {gameId.toUpperCase()}
          </div>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLeaderboardOpen(true)}
              onMouseEnter={() => setHoveredTopButton("leaderboard")}
              onMouseLeave={() => {
                setHoveredTopButton((prev) => (prev === "leaderboard" ? null : prev));
                setPressedTopButton((prev) => (prev === "leaderboard" ? null : prev));
              }}
              onMouseDown={() => setPressedTopButton("leaderboard")}
              onMouseUp={() => setPressedTopButton((prev) => (prev === "leaderboard" ? null : prev))}
              className="h-9 px-3 rounded-[7px] border text-[10px] leading-none flex items-center justify-center transition-all font-semibold tracking-[0.14em] flex-shrink-0"
              style={{
                borderColor: hoveredTopButton === "leaderboard" ? "#4a4130" : "#2f2a22",
                background:
                  pressedTopButton === "leaderboard"
                    ? "linear-gradient(180deg, #3e3a34 0%, #312d28 52%, #26231f 100%)"
                    : hoveredTopButton === "leaderboard"
                    ? "linear-gradient(180deg, #5a5348 0%, #443d34 52%, #342f29 100%)"
                    : "linear-gradient(180deg, #4a453d 0%, #36322c 52%, #2a2722 100%)",
                color: hoveredTopButton === "leaderboard" ? "#e2cca0" : "#d1be92",
                boxShadow:
                  pressedTopButton === "leaderboard"
                    ? "inset 0 2px 4px rgba(0,0,0,0.42), 0 1px 0 #16130f"
                    : hoveredTopButton === "leaderboard"
                    ? "inset 0 1px 0 rgba(255,255,255,0.14), inset 0 -1px 0 rgba(0,0,0,0.35), 0 2px 0 #16130f, 0 0 8px rgba(209,190,146,0.2)"
                    : "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.35), 0 2px 0 #16130f",
              }}
              title="Leaderboard"
              aria-label="Open leaderboard summary"
              onBlur={() => {
                setHoveredTopButton((prev) => (prev === "leaderboard" ? null : prev));
                setPressedTopButton((prev) => (prev === "leaderboard" ? null : prev));
              }}
            >
              LEADERBOARD
            </button>

            <button
              type="button"
              onClick={handleCancelGame}
              onMouseEnter={() => setHoveredTopButton("cancel")}
              onMouseLeave={() => {
                setHoveredTopButton((prev) => (prev === "cancel" ? null : prev));
                setPressedTopButton((prev) => (prev === "cancel" ? null : prev));
              }}
              onMouseDown={() => setPressedTopButton("cancel")}
              onMouseUp={() => setPressedTopButton((prev) => (prev === "cancel" ? null : prev))}
              className="h-9 px-3 rounded-[7px] border text-[10px] leading-none flex items-center justify-center transition-all font-semibold tracking-[0.14em] flex-shrink-0"
              style={{
                borderColor: hoveredTopButton === "cancel" ? "#5b3a3b" : "#3b2b2b",
                background:
                  pressedTopButton === "cancel"
                    ? "linear-gradient(180deg, #3e3132 0%, #2f2425 50%, #241c1d 100%)"
                    : hoveredTopButton === "cancel"
                    ? "linear-gradient(180deg, #5a4243 0%, #443234 50%, #332628 100%)"
                    : "linear-gradient(180deg, #4a3939 0%, #35292a 50%, #2a2021 100%)",
                color: hoveredTopButton === "cancel" ? "#e0a9aa" : "#c89292",
                boxShadow:
                  pressedTopButton === "cancel"
                    ? "inset 0 2px 4px rgba(0,0,0,0.45), 0 1px 0 #1b1313"
                    : hoveredTopButton === "cancel"
                    ? "inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.35), 0 2px 0 #1b1313, 0 0 8px rgba(200,146,146,0.2)"
                    : "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.35), 0 2px 0 #1b1313",
              }}
              title="Cancel game"
              aria-label="Cancel current game playback"
              onBlur={() => {
                setHoveredTopButton((prev) => (prev === "cancel" ? null : prev));
                setPressedTopButton((prev) => (prev === "cancel" ? null : prev));
              }}
            >
              CANCEL GAME
            </button>
          </div>
        </div>
      </div>

      {/* Top nav bar - controls rail */}
      <div
        className="relative w-full h-[72px] rounded-[10px] border px-3 py-2 flex items-center gap-3 min-w-0 overflow-hidden"
        role="navigation"
        aria-labelledby={phaseTimelineLabelId}
        style={{
          borderColor: "#2f2c28",
          background:
            "repeating-linear-gradient(90deg, transparent 0px, transparent 0.5px, rgba(255,255,255,0.012) 0.5px, rgba(255,255,255,0.012) 1px), linear-gradient(180deg, #4a4540 0%, #3b3833 16%, #2f2c28 48%, #23211e 100%)",
          boxShadow:
            "0 10px 22px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -2px 0 rgba(0,0,0,0.45)",
        }}
      >
        <div
          className="absolute left-3 right-3 top-[3px] h-px pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)" }}
        />
        <Rivet size={8} style={{ left: "10px", top: "10px", opacity: 0.65 }} />
        <Rivet size={8} style={{ right: "10px", top: "10px", opacity: 0.65 }} />
        <Rivet size={8} style={{ left: "10px", bottom: "10px", opacity: 0.65 }} />
        <Rivet size={8} style={{ right: "10px", bottom: "10px", opacity: 0.65 }} />

        {/* Transport controls */}
        <div
          className="flex items-center gap-2 rounded-[8px] p-1.5 flex-shrink-0 border border-[#171512]"
          style={{
            background: "linear-gradient(180deg, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0.28) 100%)",
            boxShadow: "inset 0 2px 6px rgba(0,0,0,0.62), inset 0 -1px 0 rgba(255,255,255,0.02)",
          }}
        >
          <button
            type="button"
            onClick={nav.goPrev}
            disabled={nav.isFirst}
            className="h-10 w-10 rounded-[7px] border text-[21px] leading-none flex items-center justify-center transition-all"
            style={{
              borderColor: nav.isFirst ? "#2f2c28" : "#2a2622",
              background: "linear-gradient(180deg, #4e4943 0%, #3d3933 40%, #2f2c27 100%)",
              color: nav.isFirst ? "#5d5851" : "#8e8881",
              boxShadow: nav.isFirst
                ? "inset 0 2px 5px rgba(0,0,0,0.5)"
                : "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.35), 0 2px 0 #171512",
              cursor: nav.isFirst ? "not-allowed" : "pointer",
              opacity: nav.isFirst ? 0.55 : 1,
            }}
            aria-label="Previous phase"
            aria-disabled={nav.isFirst}
            aria-controls="operations-map"
          >
            ◀
          </button>
          <button
            type="button"
            onClick={handlePlayToggle}
            className="h-10 w-10 rounded-[7px] border text-[21px] leading-none flex items-center justify-center transition-all"
            style={{
              borderColor: "#2a2622",
              background: playing
                ? "linear-gradient(180deg, #debb4e 0%, #bf8b15 48%, #7d5a12 100%)"
                : "linear-gradient(180deg, #4e4943 0%, #3d3933 40%, #2f2c27 100%)",
              color: playing ? "#241809" : "#8e8881",
              boxShadow: playing
                ? "inset 0 1px 0 rgba(255,232,158,0.34), inset 0 -1px 0 rgba(80,56,10,0.35), 0 2px 0 #4d370d"
                : "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.35), 0 2px 0 #171512",
            }}
            aria-label={playing ? "Pause autoplay" : "Start autoplay"}
            aria-pressed={playing}
            aria-controls="operations-map"
          >
            {playing ? "⏸" : "▶"}
          </button>
          <button
            type="button"
            onClick={nav.goNext}
            disabled={nav.isLast}
            className="h-10 w-10 rounded-[7px] border text-[21px] leading-none flex items-center justify-center transition-all"
            style={{
              borderColor: nav.isLast ? "#2f2c28" : "#2a2622",
              background: "linear-gradient(180deg, #4e4943 0%, #3d3933 40%, #2f2c27 100%)",
              color: nav.isLast ? "#5d5851" : "#8e8881",
              boxShadow: nav.isLast
                ? "inset 0 2px 5px rgba(0,0,0,0.5)"
                : "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.35), 0 2px 0 #171512",
              cursor: nav.isLast ? "not-allowed" : "pointer",
              opacity: nav.isLast ? 0.55 : 1,
            }}
            aria-label="Next phase"
            aria-disabled={nav.isLast}
            aria-controls="operations-map"
          >
            ▶
          </button>
        </div>

        {/* Phase timeline with glass */}
        <GlassPane
          className="relative flex-1 min-w-0 h-[58px] overflow-hidden rounded-[8px] border border-[#181613]"
          distortion={0.56}
          gloss={0.42}
          edgeTint={[0.66, 0.62, 0.54]}
          style={{
            boxShadow: "inset 0 1px 6px rgba(0,0,0,0.9), inset 0 0 0 1px rgba(255,255,255,0.03)",
            background: "linear-gradient(180deg, rgba(12,12,12,0.88) 0%, rgba(7,7,7,0.92) 100%)",
          }}
        >
          <span id={phaseTimelineLabelId} className="sr-only">
            Phase timeline and navigation
          </span>
          <div
            className="h-full overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden"
            aria-label="Game phases"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
            }}
          >
            <PhaseTimeline
              phases={phases}
              currentPhase={nav.currentPhase}
              onSelectPhase={nav.goTo}
            />
          </div>
          <div
            className="absolute left-0 top-0 bottom-0 w-5 sm:w-6 pointer-events-none"
            style={{
              background: "linear-gradient(to right, rgba(7,7,7,0.72) 0%, rgba(7,7,7,0) 100%)",
            }}
          />
          <div
            className="absolute right-0 top-0 bottom-0 w-5 sm:w-6 pointer-events-none"
            style={{
              background: "linear-gradient(to left, rgba(7,7,7,0.72) 0%, rgba(7,7,7,0) 100%)",
            }}
          />
        </GlassPane>

        {/* Live indicator pill */}
        <div
          className="flex items-center gap-2 rounded-[8px] px-5 py-2.5 flex-shrink-0 border border-[#171512]"
          role="status"
          aria-live="polite"
          aria-label={liveEvents.connected ? "Live connection active" : "Live connection offline"}
          style={{
            background: "linear-gradient(180deg, rgba(0,0,0,0.44) 0%, rgba(0,0,0,0.3) 100%)",
            boxShadow: "inset 0 2px 6px rgba(0,0,0,0.55), 0 1px 0 rgba(255,255,255,0.03)",
          }}
        >
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ade80] opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-[#4ade80]" />
          </span>
          <span className="text-[10px] sm:text-[11px] leading-none tracking-[0.26em] font-semibold text-[#4ade80]" style={{ fontFamily: "'IBM Plex Mono', monospace" }}>
            {liveEvents.connected ? "LIVE" : "OFF"}
          </span>
        </div>

      </div>

      {/* Main content */}
      <div className="flex gap-2 flex-1 min-h-0">
        {/* Left sidebar - flexible width to reduce activity feed height */}
        <div id="intel-panel" className="min-w-64 lg:min-w-80 flex-1 max-w-[600px] flex flex-col min-h-0">
        <TacticalPanel title="INTELLIGENCE" className="flex-1 flex flex-col min-h-0" contentClassName="p-2 flex flex-col flex-1 min-h-0">
          <TacticalTabGroup
            tabs={["orders", "messages", "summary"]}
            activeTab={leftTab}
            onTabChange={(tab) => setLeftTab(tab as LeftTab)}
            badge={{ messages: unreadCount }}
          />
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
                connected={liveEvents.connected}
                livePhase={livePhase}
              />
            )}
            {leftTab === "summary" && (
              <SummaryPanel
                gameId={gameId}
                currentPhase={nav.currentPhase || undefined}
                refreshKey={dataRefreshKey}
                isLive={liveEvents.connected && nav.isLast}
              />
            )}
          </div>
        </TacticalPanel>
        </div>

        {/* Center: monitor fills column; map itself remains AR-safe in viewport */}
        <div ref={centerColumnRef} className="flex-[2] min-w-0 relative min-h-0 overflow-hidden" id="operations-map">
          <div
            className="relative rounded-[16px] border border-[#1a1a1a] shadow-[0_14px_30px_rgba(0,0,0,0.45)] overflow-hidden w-full h-full"
            style={{
              background: "linear-gradient(180deg, #323232 0%, #222 35%, #171717 100%)",
            }}
          >
              <div
                className="absolute left-[10px] right-[10px] top-[10px] rounded-[10px] border border-[#0f0f0f] bg-[#050505] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.03),inset_0_12px_30px_rgba(0,0,0,0.7)] overflow-hidden"
                style={{
                  containerType: "size",
                  bottom: `calc(${activityHeightPct}% + ${MAP_MONITOR_LAYOUT.mapActivityGapPx}px)`,
                }}
              >
                {loading ? (
                  <div className="flex items-center justify-center h-full text-[#808080]">
                    Loading phase data...
                  </div>
                ) : (
                  <CRTMap
                    svgContent={svgContent}
                    state={state}
                    orders={displayOrders || undefined}
                    results={results || undefined}
                    hoveredOrder={hoveredOrder}
                    focusLocation={focusLocation}
                    revealedOrderCount={playing ? revealedOrderCount : -1}
                  />
                )}
              </div>

              <Rivet size={8} style={{ left: "8px", top: "8px", opacity: 0.7 }} />
              <Rivet size={8} style={{ right: "8px", top: "8px", opacity: 0.7 }} />
              <Rivet size={8} style={{ left: "8px", bottom: "8px", opacity: 0.7 }} />
              <Rivet size={8} style={{ right: "8px", bottom: "8px", opacity: 0.7 }} />

            <div
              className="absolute left-0 right-0 bottom-0 z-30 min-h-0"
              style={{ height: `${activityHeightPct}%` }}
            >
              <button
                type="button"
                onMouseDown={startActivityResize}
                onDoubleClick={() => {
                  userResizedActivityRef.current = false;
                  applyDefaultActivitySplit(true);
                }}
                className="absolute left-1/2 -translate-x-1/2 -top-3 h-6 w-14 rounded-t-[10px] border border-[#2e2a26] bg-[#24211d] flex items-center justify-center cursor-ns-resize"
                style={{
                  boxShadow: "0 2px 6px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.08)",
                }}
                title="Drag to resize activity monitor. Double-click to reset default."
                aria-label="Resize activity panel"
                aria-controls="activity-feed-panel"
              >
                <span className="text-[#8b8070] tracking-[0.2em] text-[10px] font-bold">⋮⋮</span>
              </button>

              <TacticalPanel className="h-full min-h-[88px] flex flex-col" contentClassName="p-0 flex flex-col flex-1 min-h-0">
                <ActivityFeed
                  id="activity-feed-panel"
                  events={liveEvents.events}
                  connected={liveEvents.connected}
                  connectionError={liveEvents.error}
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
          </div>
        </div>

        {/* Right sidebar: notebook memory with glass faction buttons */}
        <div className="w-64 lg:w-80 xl:w-96 max-w-[400px] flex-shrink-0 min-h-0 flex gap-2">
          <div
            className="w-16 flex-shrink-0 min-h-0 rounded-[10px] border overflow-hidden"
            style={{
              borderColor: "#2b2f33",
              background:
                "repeating-linear-gradient(90deg, transparent 0px, transparent 1px, rgba(255,255,255,0.01) 1px, rgba(255,255,255,0.01) 2px), linear-gradient(180deg, #51565d 0%, #42474f 8%, #383d44 24%, #2d3238 55%, #23272c 100%)",
              boxShadow:
                "inset 0 1px 0 rgba(255,255,255,0.1), inset 0 -1px 0 rgba(0,0,0,0.45), 0 8px 16px rgba(0,0,0,0.35)",
            }}
          >
            <div
              className="h-full py-2 px-1.5 overflow-y-auto no-scrollbar"
              style={{
                background: "linear-gradient(180deg, rgba(0,0,0,0.28) 0%, rgba(0,0,0,0.18) 100%)",
                boxShadow: "inset 0 2px 8px rgba(0,0,0,0.45)",
              }}
            >
              <div className="flex flex-col gap-2">
                {activePowers.map((power) => {
                  const isActive = selectedPower === power;
                  const isHovered = hoveredFactionTab === power;
                  const powerColor = POWER_DISPLAY_COLORS[power] || "#9aa3ad";
                  return (
                    <button
                      type="button"
                      key={power}
                      onClick={() => setSelectedPower(power)}
                      onMouseEnter={() => setHoveredFactionTab(power)}
                      onMouseLeave={() => setHoveredFactionTab((prev) => (prev === power ? null : prev))}
                      className="relative h-14 w-full rounded-[12px] border transition-all overflow-hidden"
                      style={{
                        borderColor: isActive ? `${powerColor}aa` : isHovered ? `${powerColor}77` : "#424a47",
                        background: isActive
                          ? "linear-gradient(180deg, #49524f 0%, #363f3c 52%, #262d2b 100%)"
                          : isHovered
                          ? "linear-gradient(180deg, #454f4b 0%, #343d39 52%, #262c2a 100%)"
                          : "linear-gradient(180deg, #3d4643 0%, #2f3633 52%, #242a28 100%)",
                        boxShadow: isActive
                          ? `inset 0 1px 0 rgba(255,255,255,0.09), inset 0 -1px 0 rgba(0,0,0,0.45), 0 0 10px ${powerColor}55`
                          : isHovered
                          ? `inset 0 1px 0 rgba(255,255,255,0.12), inset 0 -1px 0 rgba(0,0,0,0.45), 0 0 9px ${powerColor}33`
                          : "inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.45), 0 2px 6px rgba(0,0,0,0.3)",
                      }}
                      title={power}
                      aria-label={`Select ${power} memory`}
                      aria-pressed={isActive}
                    >
                      <span
                        className="pointer-events-none absolute inset-[1px] rounded-[11px]"
                        style={{
                          background:
                            isHovered
                              ? "linear-gradient(180deg, rgba(255,255,255,0.26) 0%, rgba(255,255,255,0.1) 30%, rgba(255,255,255,0.03) 45%, rgba(0,0,0,0.18) 100%)"
                              : "linear-gradient(180deg, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0.08) 26%, rgba(255,255,255,0.02) 42%, rgba(0,0,0,0.16) 100%)",
                        }}
                      />
                      <span
                        className="pointer-events-none absolute left-1 right-1 top-1 h-px"
                        style={{
                          background: isHovered
                            ? "linear-gradient(90deg, transparent, rgba(255,255,255,0.5), transparent)"
                            : "linear-gradient(90deg, transparent, rgba(255,255,255,0.36), transparent)",
                        }}
                      />
                      <span
                        className="pointer-events-none absolute left-0 top-2 bottom-2 w-[2px]"
                        style={{
                          background: isActive ? powerColor : isHovered ? `${powerColor}bb` : "#64706b",
                        }}
                      />
                      <div className="relative z-10 flex h-full flex-col items-center justify-center gap-[2px]">
                        <PixelFlagIcon power={power} size={16} />
                        <span
                          className="h-[3px] w-6 rounded-full"
                          style={{
                            background: powerColor,
                            boxShadow: `0 0 6px ${powerColor}aa`,
                          }}
                          aria-hidden
                        />
                        <span className={`text-[8px] font-bold tracking-[0.14em] ${isActive ? "text-[#dce6e1]" : isHovered ? "text-[#cfd8d3]" : "text-[#b7c0bb]"}`}>
                          {power.slice(0, 3)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div
            className="flex-1 min-h-0 border rounded-[10px] overflow-hidden"
            style={{
              borderColor: "#2b3034",
              background:
                "repeating-linear-gradient(90deg, transparent 0px, transparent 1px, rgba(255,255,255,0.008) 1px, rgba(255,255,255,0.008) 2px), linear-gradient(180deg, #4b5158 0%, #3c424a 8%, #323841 28%, #272d34 64%, #1f242a 100%)",
              boxShadow:
                "0 10px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.45)",
            }}
          >
            <div
              className="relative h-14 border-b overflow-hidden"
              style={{
                borderColor: "#383f46",
                background:
                  "repeating-linear-gradient(90deg, transparent 0px, transparent 1px, rgba(255,255,255,0.008) 1px, rgba(255,255,255,0.008) 2px), linear-gradient(180deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.22) 100%)",
              }}
            >
              <Rivet size={6} style={{ left: "8px", top: "8px", opacity: 0.62 }} />
              <Rivet size={6} style={{ right: "8px", top: "8px", opacity: 0.62 }} />
              <Rivet size={6} style={{ left: "8px", bottom: "8px", opacity: 0.62 }} />
              <Rivet size={6} style={{ right: "8px", bottom: "8px", opacity: 0.62 }} />

              <div
                className="absolute left-3 right-3 top-2 bottom-2 rounded-[3px] border flex items-center justify-between px-3"
                style={{
                  borderColor: "#131210",
                  background: "linear-gradient(180deg, #161514 0%, #11100f 50%, #141311 100%)",
                  boxShadow: "inset 0 2px 6px rgba(0,0,0,0.8), inset 0 -1px 0 rgba(255,255,255,0.03), 0 1px 0 rgba(255,255,255,0.04)",
                }}
              >
                <span
                  className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#c5ccd4]"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  Memory
                </span>
                <span
                  className="text-[8px] uppercase tracking-[0.16em] text-[#8d96a1]"
                  style={{ fontFamily: "'IBM Plex Mono', monospace" }}
                >
                  Microfiche
                </span>
              </div>
            </div>

            <div className="relative h-[calc(100%-56px)] overflow-hidden">
              <div className="absolute inset-2 rounded-[8px] border border-[#11161c] bg-[#030708] shadow-[inset_0_2px_10px_rgba(0,0,0,0.78),inset_0_0_0_1px_rgba(102,138,164,0.12)] overflow-hidden">
                <CRTScreenOverlay color="cyan" />
                <div className="h-full overflow-hidden px-4 py-2.5 relative z-10">
                  {memoryLoading && (
                    <div className="text-[#6d8e79] text-sm">Loading memory...</div>
                  )}
                  {!memoryLoading && memoryContent && (
                    <MemoryViewer
                      content={memoryContent}
                      variant="microfiche"
                      lastUpdated={memoryLastUpdated}
                      className="memory-fiche h-full bg-transparent border-0 rounded-none shadow-none"
                    />
                  )}
                  {!memoryLoading && !memoryContent && selectedPower && (
                    <div className="text-[#6d8e79] text-sm">No memory for {selectedPower}.</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer status bar */}
      <div
        className="flex items-center justify-between px-5 py-2"
        style={{
          background: "linear-gradient(180deg, #1e1e1e 0%, #151515 100%)",
          borderTop: "2px solid #0a0a0a",
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.02)",
        }}
      >
        {/* Left: Sedona branding + GitHub */}
        <div className="flex items-center gap-4">
          <a
            href="https://sedona.fun"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 transition-opacity hover:opacity-80"
            title="Powered by Sedona"
          >
            <svg width={16} height={15} viewBox="0 0 22 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <g clipPath="url(#clip0_footer)">
                <path d="M2.10018 10.9454C2.20396 10.8342 2.23833 10.6822 2.24933 10.5323C2.26032 10.2764 2.25551 10.0219 2.27201 9.76536C2.58748 5.28827 6.58758 1.90596 11.2056 2.2118C12.4833 2.29643 13.6743 2.65425 14.7225 3.2233C15.0407 3.39521 15.0627 3.83033 14.7623 4.03023L13.4902 4.87381L13.4771 4.88247L18.1755 6.76753C18.1721 6.76086 18.1686 6.7542 18.1645 6.74754L20.6876 7.75836C20.801 7.80368 20.9206 7.71105 20.902 7.59445C20.902 7.59311 20.9013 7.59111 20.9013 7.58978L20.8993 7.58045L19.6346 1.05572C19.6133 0.947769 19.4855 0.896462 19.392 0.958431L17.8112 2.00724C17.5432 2.18582 17.1878 2.18049 16.9253 1.99458C15.3548 0.876472 13.4482 0.163495 11.3602 0.0248975C5.49545 -0.363575 0.41698 3.93094 0.0162825 9.6161C0.00253649 9.93194 -0.0744413 10.3997 0.273333 10.555C0.556502 10.6822 0.874723 10.7982 1.16751 10.9194C1.56202 11.0767 1.8067 11.2106 2.10018 10.9454Z" fill="#8f8776"/>
                <path d="M20.9768 9.44559C20.6936 9.31832 20.3754 9.20238 20.0826 9.0811C19.6881 8.92385 19.4434 8.78991 19.1499 9.05512C19.0462 9.16639 19.0118 9.31832 19.0008 9.46824C18.9898 9.72412 18.9946 9.97865 18.9781 10.2352C18.6626 14.7123 14.6625 18.0946 10.0446 17.7887C8.76687 17.7041 7.57577 17.3463 6.52764 16.7773C6.20942 16.6053 6.18742 16.1702 6.48778 15.9703L7.75997 15.1267L7.77303 15.1181L3.07463 13.233C3.07807 13.2397 3.08151 13.2464 3.08563 13.253L0.562545 12.2422C0.449141 12.1969 0.32955 12.2895 0.348107 12.4061C0.348107 12.4074 0.348794 12.4094 0.348794 12.4108L0.350856 12.4201L1.61549 18.9448C1.6368 19.0528 1.76464 19.1041 1.85811 19.0421L3.4389 17.9933C3.70695 17.8147 4.06229 17.8201 4.32484 18.006C5.89532 19.1241 7.8019 19.8371 9.88992 19.9757C15.7547 20.3641 20.8331 16.0696 21.2338 10.3845C21.2476 10.0686 21.3246 9.60084 20.9768 9.44559Z" fill="#8f8776"/>
                <path d="M10.71 4.90529C10.2639 7.31809 8.63708 9.39172 6.39029 9.84483C6.36555 9.85216 6.33462 9.85882 6.30094 9.86548C6.19166 9.88614 6.18753 10.0374 6.29613 10.0621C8.68244 10.5971 10.4701 12.6967 10.7519 15.3961C10.7828 15.6326 10.798 15.7166 10.8172 15.6479C10.8364 15.7166 10.8516 15.6326 10.8825 15.3961C11.1643 12.6967 12.952 10.5971 15.3383 10.0621C15.4469 10.0374 15.4427 9.88614 15.3335 9.86548C15.2998 9.85882 15.2689 9.85216 15.2441 9.84483C12.9973 9.39172 11.3705 7.31809 10.9244 4.90529C10.9134 4.84799 10.8653 4.82067 10.8179 4.824C10.7698 4.82067 10.7217 4.84799 10.7114 4.90529H10.71Z" fill="#8f8776"/>
              </g>
              <defs><clipPath id="clip0_footer"><rect width="21.25" height="20" fill="white"/></clipPath></defs>
            </svg>
            <span className="font-ui-panel text-[11px] uppercase tracking-[0.14em] text-[#8f8776]">
              Powered by <span className="text-[#ff9500]">sedona.fun</span>
            </span>
          </a>
          <span className="text-[#2a2a2a]">|</span>
          <a
            href="https://github.com/anthropics/diplomacy-rlm"
            target="_blank"
            rel="noopener noreferrer"
            className="font-ui-panel text-[11px] uppercase tracking-[0.1em] text-[#606060] hover:text-[#c3ae88] transition-colors"
          >
            GitHub
          </a>
        </div>

        {/* Center: Model badge (prominent) + phase info */}
        <div className="flex items-center gap-3">
          {gameMeta?.model && (
            <span
              className="font-ui-panel text-[11px] font-semibold uppercase tracking-[0.08em] px-3 py-1 rounded-sm"
              style={{
                background: "linear-gradient(180deg, #2a2518 0%, #1e1b14 100%)",
                border: "1px solid #3a3020",
                color: "#ff9500",
                boxShadow: "inset 0 1px 0 rgba(255,149,0,0.06), 0 1px 3px rgba(0,0,0,0.3)",
                textShadow: "0 0 6px rgba(255,149,0,0.25)",
              }}
              title={`Backend: ${gameMeta.backend || "unknown"} | Model: ${gameMeta.model}`}
            >
              {gameMeta.model}
            </span>
          )}
          <span className="font-ui-panel text-[11px] font-semibold tracking-[0.08em] text-[#c3ae88]">
            {nav.currentPhase && phaseDisplayName(nav.currentPhase)}
          </span>
          <span className="font-ui-panel text-[10px] text-[#606060]">
            {nav.currentIndex + 1}/{phases.length}
          </span>
          {liveEvents.connected && (
            <span className="relative flex h-2 w-2 ml-0.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4a7c59] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4a7c59]" />
            </span>
          )}
        </div>

        {/* Right: Export + phase count */}
        <div className="flex items-center gap-4">
          <a
            href={`/api/games/${gameId}/export`}
            download={`${gameId}-replay.json`}
            className="font-ui-panel text-[11px] uppercase tracking-[0.1em] text-[#606060] hover:text-[#c3ae88] transition-colors"
            title="Export replay JSON"
          >
            &#8595; Export
          </a>
          <span className="font-ui-panel text-[10px] text-[#505050]">
            {phases.length} phase{phases.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>

      {/* Leaderboard drawer */}
      <LeaderboardDrawer
        open={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
        gameId={gameId}
        refreshKey={dataRefreshKey}
      />
    </main>
  );
}
