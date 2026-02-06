"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import TerritoryOverlay from "./TerritoryOverlay";
import UnitLayer from "./UnitLayer";
import OrderLayer from "./OrderLayer";
import type { GameState } from "@/lib/types";
import { parseOrders } from "@/lib/parse-orders";

const DEFAULT_VIEWBOX = { x: 0, y: 0, w: 1835, h: 1360 };
const MIN_ZOOM = 0.5; // can zoom out to 2x the default view
const MAX_ZOOM = 5; // can zoom in to 5x

interface DiplomacyMapProps {
  svgContent: string;
  state: GameState | null;
  orders?: Record<string, string[]>;
}

export default function DiplomacyMap({
  svgContent,
  state,
  orders,
}: DiplomacyMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewBox, setViewBox] = useState(DEFAULT_VIEWBOX);
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const viewBoxRef = useRef(viewBox);
  viewBoxRef.current = viewBox;

  const parsedOrders = orders ? parseOrders(orders) : [];

  // Only zoom on ctrl+scroll (or pinch on trackpad). Plain scroll passes through.
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      if (!e.ctrlKey && !e.metaKey) return; // let normal scroll pass through
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      const vb = viewBoxRef.current;

      // Enforce zoom bounds
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
    },
    [],
  );

  // Attach wheel listener with passive: false so we can preventDefault on ctrl+scroll
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [handleWheel]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsPanning(true);
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

  // Inject viewBox into the base SVG after render
  useEffect(() => {
    const svg = containerRef.current?.querySelector("svg");
    if (svg) {
      svg.setAttribute(
        "viewBox",
        `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`,
      );
      svg.setAttribute("width", "100%");
      svg.setAttribute("height", "100%");
      svg.style.cursor = isPanning ? "grabbing" : "grab";
    }
  }, [viewBox, isPanning]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-gray-900 rounded-lg border border-gray-800"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onDoubleClick={handleDoubleClick}
    >
      <div dangerouslySetInnerHTML={{ __html: svgContent }} />
      <TerritoryOverlay
        svgContainer={containerRef.current}
        influence={state?.influence || {}}
        centers={state?.centers || {}}
      />
      {state && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`}
          preserveAspectRatio="xMinYMin"
        >
          <UnitLayer units={state.units || {}} />
          <OrderLayer orders={parsedOrders} />
        </svg>
      )}
    </div>
  );
}
