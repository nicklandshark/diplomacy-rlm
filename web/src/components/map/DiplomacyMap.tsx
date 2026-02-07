"use client";

import { useRef, useState, useCallback, useEffect, useMemo, memo } from "react";
import { createPortal } from "react-dom";
import TerritoryOverlay from "./TerritoryOverlay";
import UnitLayer from "./UnitLayer";
import UnitTransitionLayer from "./UnitTransitionLayer";
import OrderLayer from "./OrderLayer";
import MapTooltip, { unitTooltip, territoryTooltip, type TooltipInfo } from "./MapTooltip";
import { provinceFromSvgId } from "@/lib/locations";
import { Coordinates, SymbolSizes } from "@/lib/map-metadata";
import type { GameState, PhaseResults } from "@/lib/types";
import { parseOrders } from "@/lib/parse-orders";
import { useUnitTransition } from "@/hooks/useUnitTransition";

const DEFAULT_VIEWBOX = { x: 0, y: 0, w: 1835, h: 1360 };
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 5;
const UNIT_HIT_RADIUS = 22;

interface DiplomacyMapProps {
  svgContent: string;
  state: GameState | null;
  orders?: Record<string, string[]>;
  results?: PhaseResults | null;
  hoveredOrder?: string | null;
  focusLocation?: string | null;
  revealedOrderCount?: number; // -1 or undefined = show all; 0+ = step-through count
}

function clientToSvg(
  clientX: number,
  clientY: number,
  svgRect: DOMRect,
  vb: { x: number; y: number; w: number; h: number },
): [number, number] {
  return [
    ((clientX - svgRect.left) / svgRect.width) * vb.w + vb.x,
    ((clientY - svgRect.top) / svgRect.height) * vb.h + vb.y,
  ];
}

/** Memoized base SVG — only re-renders when svgContent changes */
const BaseSvg = memo(function BaseSvg({ html }: { html: string }) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
});

export default function DiplomacyMap({
  svgContent,
  state,
  orders,
  results,
  hoveredOrder,
  focusLocation,
  revealedOrderCount,
}: DiplomacyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewBox, setViewBox] = useState(DEFAULT_VIEWBOX);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const viewBoxRef = useRef(viewBox);
  viewBoxRef.current = viewBox;
  const [tooltip, setTooltip] = useState<TooltipInfo | null>(null);
  const hoverRafRef = useRef<number>(0);

  // Unit transition animation
  const { isTransitioning, diffs: unitDiffs } = useUnitTransition(state?.units);

  // Focus-zoom animation state
  const preHoverVBRef = useRef<typeof DEFAULT_VIEWBOX | null>(null);
  const animRafRef = useRef<number>(0);
  const isAnimatingRef = useRef(false);

  // Animate viewBox from current to target over ~300ms using rAF + lerp
  const animateViewBox = useCallback(
    (target: { x: number; y: number; w: number; h: number }) => {
      cancelAnimationFrame(animRafRef.current);
      const start = { ...viewBoxRef.current };
      const duration = 300; // ms
      let startTime: number | null = null;
      isAnimatingRef.current = true;

      function step(ts: number) {
        if (startTime === null) startTime = ts;
        const elapsed = ts - startTime;
        const t = Math.min(elapsed / duration, 1);
        // Ease-out cubic
        const ease = 1 - Math.pow(1 - t, 3);

        const next = {
          x: start.x + (target.x - start.x) * ease,
          y: start.y + (target.y - start.y) * ease,
          w: start.w + (target.w - start.w) * ease,
          h: start.h + (target.h - start.h) * ease,
        };
        setViewBox(next);

        if (t < 1) {
          animRafRef.current = requestAnimationFrame(step);
        } else {
          isAnimatingRef.current = false;
        }
      }

      animRafRef.current = requestAnimationFrame(step);
    },
    [],
  );

  // React to focusLocation changes
  useEffect(() => {
    // Don't fight with manual pan
    if (isPanning) return;

    if (focusLocation) {
      const coord = Coordinates[focusLocation];
      if (!coord) return;
      const size = SymbolSizes.Army;
      const cx = coord.unit[0] + size.width / 2;
      const cy = coord.unit[1] + size.height / 2;

      // Save current viewBox before zooming in (only if not already saved)
      if (!preHoverVBRef.current) {
        preHoverVBRef.current = { ...viewBoxRef.current };
      }

      // Target: ~2x zoom centered on the location
      const zoomW = DEFAULT_VIEWBOX.w / 2;
      const zoomH = DEFAULT_VIEWBOX.h / 2;
      animateViewBox({
        x: cx - zoomW / 2,
        y: cy - zoomH / 2,
        w: zoomW,
        h: zoomH,
      });
    } else if (preHoverVBRef.current) {
      // Restore pre-hover viewBox
      const restore = preHoverVBRef.current;
      preHoverVBRef.current = null;
      animateViewBox(restore);
    }

    return () => {
      cancelAnimationFrame(animRafRef.current);
    };
  }, [focusLocation, isPanning, animateViewBox]);

  // Portal target: a <g> element injected into the base SVG
  const [portalTarget, setPortalTarget] = useState<SVGGElement | null>(null);

  // Memoize parsed orders — only recompute when orders object changes
  const parsedOrders = useMemo(() => (orders ? parseOrders(orders) : []), [orders]);

  // After BaseSvg mounts, find the SVG and inject a <g> for our overlay layers
  useEffect(() => {
    const svg = containerRef.current?.querySelector("svg");
    if (!svg) return;
    // Create or find the overlay group
    let g = svg.querySelector("#overlay-portal") as SVGGElement | null;
    if (!g) {
      g = document.createElementNS("http://www.w3.org/2000/svg", "g");
      g.setAttribute("id", "overlay-portal");
      svg.appendChild(g);
    }
    setPortalTarget(g);
  }, [svgContent]);

  // Build province->power lookup from centers
  const provinceOwnerRef = useRef<Record<string, string>>({});
  useEffect(() => {
    const map: Record<string, string> = {};
    if (state?.centers) {
      for (const [power, locs] of Object.entries(state.centers)) {
        for (const loc of locs) {
          map[loc.toUpperCase().slice(0, 3)] = power;
        }
      }
    }
    provinceOwnerRef.current = map;
  }, [state?.centers]);

  // Build unit position lookup
  const unitPositionsRef = useRef<
    { power: string; unitType: string; loc: string; cx: number; cy: number }[]
  >([]);
  useEffect(() => {
    const positions: typeof unitPositionsRef.current = [];
    if (state?.units) {
      for (const [power, unitList] of Object.entries(state.units)) {
        for (const unit of unitList as string[]) {
          const parts = unit.split(" ");
          if (parts.length < 2) continue;
          const unitType = parts[0];
          const loc = parts.slice(1).join("/");
          const symbol = unitType === "F" ? "Fleet" : "Army";
          const coord = Coordinates[loc];
          const size = SymbolSizes[symbol];
          if (!coord || !size) continue;
          positions.push({
            power,
            unitType,
            loc,
            cx: coord.unit[0] + size.width / 2,
            cy: coord.unit[1] + size.height / 2,
          });
        }
      }
    }
    unitPositionsRef.current = positions;
  }, [state?.units]);

  // Throttled hover via rAF
  const handleHover = useCallback(
    (e: React.MouseEvent) => {
      if (isPanning) return;
      const clientX = e.clientX;
      const clientY = e.clientY;
      const target = e.target;

      cancelAnimationFrame(hoverRafRef.current);
      hoverRafRef.current = requestAnimationFrame(() => {
        const svg = containerRef.current?.querySelector("svg");
        if (!svg) return;
        const svgRect = svg.getBoundingClientRect();
        const vb = viewBoxRef.current;
        const [svgX, svgY] = clientToSvg(clientX, clientY, svgRect, vb);

        // Check proximity to units first
        let closest: (typeof unitPositionsRef.current)[0] | null = null;
        let closestDist = UNIT_HIT_RADIUS;
        for (const u of unitPositionsRef.current) {
          const dx = svgX - u.cx;
          const dy = svgY - u.cy;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < closestDist) {
            closestDist = dist;
            closest = u;
          }
        }

        if (closest) {
          setTooltip(unitTooltip(closest.power, closest.unitType, closest.loc, clientX, clientY));
          return;
        }

        // Walk DOM from event target to find a province id
        let el = target as HTMLElement | SVGElement | null;
        let province: string | null = null;
        const boundary = containerRef.current;
        while (el && el !== boundary) {
          province = provinceFromSvgId(el.id || "");
          if (province) break;
          el = el.parentElement;
        }

        if (province) {
          const owner = provinceOwnerRef.current[province] || null;
          setTooltip(territoryTooltip(province, owner, clientX, clientY));
        } else {
          setTooltip(null);
        }
      });
    },
    [isPanning],
  );

  // Zoom: ctrl+scroll or pinch
  const handleWheel = useCallback((e: WheelEvent) => {
    if (!e.ctrlKey && !e.metaKey) return;
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.1 : 0.9;
    const vb = viewBoxRef.current;

    const nw = Math.max(DEFAULT_VIEWBOX.w / MAX_ZOOM, Math.min(DEFAULT_VIEWBOX.w / MIN_ZOOM, vb.w * factor));
    const nh = Math.max(DEFAULT_VIEWBOX.h / MAX_ZOOM, Math.min(DEFAULT_VIEWBOX.h / MIN_ZOOM, vb.h * factor));
    const actualFactor = nw / vb.w;

    const svg = containerRef.current?.querySelector("svg");
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const mx = ((e.clientX - rect.left) / rect.width) * vb.w + vb.x;
    const my = ((e.clientY - rect.top) / rect.height) * vb.h + vb.y;

    setViewBox({
      x: mx - (mx - vb.x) * actualFactor,
      y: my - (my - vb.y) * actualFactor,
      w: nw,
      h: nh,
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
    setTooltip(null);
    panStartRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isPanning) return;
      const svg = containerRef.current?.querySelector("svg");
      if (!svg) return;
      const rect = svg.getBoundingClientRect();
      const vb = viewBoxRef.current;
      const dx = ((e.clientX - panStartRef.current.x) / rect.width) * vb.w;
      const dy = ((e.clientY - panStartRef.current.y) / rect.height) * vb.h;
      setViewBox((prev) => ({ ...prev, x: prev.x - dx, y: prev.y - dy }));
      panStartRef.current = { x: e.clientX, y: e.clientY };
    },
    [isPanning],
  );

  const handleMouseUp = useCallback(() => setIsPanning(false), []);

  const handleDoubleClick = useCallback(() => {
    setViewBox(DEFAULT_VIEWBOX);
  }, []);

  // Sync viewBox to base SVG via direct DOM mutation (avoids re-render)
  useEffect(() => {
    const svg = containerRef.current?.querySelector("svg");
    if (svg) {
      svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
      svg.setAttribute("width", "100%");
      svg.setAttribute("height", "100%");
      svg.style.cursor = isPanning ? "grabbing" : "grab";
    }
  }, [viewBox, isPanning]);

  return (
    <div
      ref={containerRef}
      className="relative w-full max-h-full overflow-hidden bg-gray-900 rounded-lg border border-gray-800"
      style={{ aspectRatio: `${DEFAULT_VIEWBOX.w} / ${DEFAULT_VIEWBOX.h}` }}
      onMouseDown={handleMouseDown}
      onMouseMove={(e) => {
        handleMouseMove(e);
        handleHover(e);
      }}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        handleMouseUp();
        cancelAnimationFrame(hoverRafRef.current);
        setTooltip(null);
      }}
      onDoubleClick={handleDoubleClick}
    >
      <BaseSvg html={svgContent} />
      <TerritoryOverlay
        svgContainer={containerRef.current}
        influence={state?.influence || {}}
        centers={state?.centers || {}}
      />
      {/* Render units + orders inside the base SVG via portal — shares symbol defs & viewBox */}
      {portalTarget && state && createPortal(
        <>
          {isTransitioning ? (
            <UnitTransitionLayer diffs={unitDiffs} animating={isTransitioning} />
          ) : (
            <UnitLayer units={state.units || {}} />
          )}
          <OrderLayer orders={parsedOrders} hoveredOrder={hoveredOrder} revealedCount={revealedOrderCount} results={results} />
        </>,
        portalTarget,
      )}
      <MapTooltip info={tooltip} containerRef={containerRef} />
    </div>
  );
}
