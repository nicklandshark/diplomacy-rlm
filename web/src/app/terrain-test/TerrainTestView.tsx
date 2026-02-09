"use client";

import { useRef, useState, useCallback, useEffect, memo } from "react";
import TerrainCanvas from "@/components/map/TerrainCanvas";
import { generateTerrainMask } from "@/lib/generate-terrain-mask";
import {
  TERRAIN_DEFAULTS,
  TERRAIN_PRESETS,
  TERRAIN_PARAMS,
  type TerrainConfig,
} from "@/lib/terrain-config";

const MAP_W = 1835;
const MAP_H = 1360;
const DEFAULT_VB = { x: 0, y: 0, w: MAP_W, h: MAP_H };
const MAX_ZOOM = 5;

type DebugMode = "both" | "svg-only" | "terrain-only" | "mask";

/** Memoized base SVG overlay */
const BaseSvg = memo(function BaseSvg({
  html,
  className,
}: {
  html: string;
  className?: string;
}) {
  return (
    <div className={className} dangerouslySetInnerHTML={{ __html: html }} />
  );
});

export default function TerrainTestView({
  svgContent,
}: {
  svgContent: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [config, setConfig] = useState<TerrainConfig>({ ...TERRAIN_DEFAULTS });
  const [viewBox, setViewBox] = useState(DEFAULT_VB);
  const viewBoxRef = useRef(viewBox);
  viewBoxRef.current = viewBox;
  const [isPanning, setIsPanning] = useState(false);
  const panStartRef = useRef({ x: 0, y: 0 });
  const [debug, setDebug] = useState<DebugMode>("both");
  const [terrainReady, setTerrainReady] = useState(false);
  const [maskUrl, setMaskUrl] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Generate debug mask overlay image
  useEffect(() => {
    if (!svgContent) return;
    generateTerrainMask(svgContent).then((canvas) => {
      setMaskUrl(canvas.toDataURL());
    });
  }, [svgContent]);

  // ---- Zoom / Pan (mirrors DiplomacyMap logic) ----
  const clampVB = useCallback(
    (vb: { x: number; y: number; w: number; h: number }) => {
      const w = Math.min(vb.w, MAP_W);
      const h = Math.min(vb.h, MAP_H);
      return {
        x: Math.max(0, Math.min(MAP_W - w, vb.x)),
        y: Math.max(0, Math.min(MAP_H - h, vb.y)),
        w,
        h,
      };
    },
    [],
  );

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 1.1 : 0.9;
      const vb = viewBoxRef.current;
      const nw = Math.max(
        MAP_W / MAX_ZOOM,
        Math.min(MAP_W, vb.w * factor),
      );
      const nh = Math.max(
        MAP_H / MAX_ZOOM,
        Math.min(MAP_H, vb.h * factor),
      );
      const af = nw / vb.w;
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const mx = ((e.clientX - rect.left) / rect.width) * vb.w + vb.x;
      const my = ((e.clientY - rect.top) / rect.height) * vb.h + vb.y;
      setViewBox(
        clampVB({ x: mx - (mx - vb.x) * af, y: my - (my - vb.y) * af, w: nw, h: nh }),
      );
    },
    [clampVB],
  );

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
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vb = viewBoxRef.current;
      const dx = ((e.clientX - panStartRef.current.x) / rect.width) * vb.w;
      const dy = ((e.clientY - panStartRef.current.y) / rect.height) * vb.h;
      setViewBox((prev) => clampVB({ ...prev, x: prev.x - dx, y: prev.y - dy }));
      panStartRef.current = { x: e.clientX, y: e.clientY };
    },
    [isPanning, clampVB],
  );

  const handleMouseUp = useCallback(() => setIsPanning(false), []);
  const handleDoubleClick = useCallback(() => setViewBox(DEFAULT_VB), []);

  // Sync SVG viewBox via DOM
  useEffect(() => {
    const svg = containerRef.current?.querySelector("svg");
    if (!svg) return;
    svg.setAttribute("viewBox", `${viewBox.x} ${viewBox.y} ${viewBox.w} ${viewBox.h}`);
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
    svg.setAttribute("preserveAspectRatio", "none");
    svg.style.cursor = isPanning ? "grabbing" : "grab";
    if (terrainReady) {
      svg.style.background = "transparent";
      const bgRect = svg.querySelector("#MapLayer > rect");
      if (bgRect) {
        bgRect.setAttribute("fill", "transparent");
        bgRect.setAttribute("fill-opacity", "0");
      }
    }
  }, [viewBox, isPanning, terrainReady]);

  // ---- Config update helper ----
  const updateParam = useCallback((key: keyof TerrainConfig, value: number) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }, []);

  const applyPreset = useCallback((name: string) => {
    const preset = TERRAIN_PRESETS[name];
    if (preset) setConfig({ ...preset });
  }, []);

  // Group params by group label
  const groups: Record<string, typeof TERRAIN_PARAMS> = {};
  for (const p of TERRAIN_PARAMS) {
    (groups[p.group] ||= []).push(p);
  }

  const showTerrain = debug !== "svg-only";
  const showSvg = debug !== "terrain-only";

  return (
    <div className="flex h-[calc(100vh-64px)] gap-0">
      {/* ---- Map viewport ---- */}
      <div className="flex-1 bg-gray-950 relative overflow-hidden">
        <div
          ref={containerRef}
          className={`absolute inset-0 overflow-hidden ${terrainReady ? "terrain-active" : "bg-gray-900"}`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onDoubleClick={handleDoubleClick}
        >
          {showTerrain && (
            <TerrainCanvas
              config={config}
              viewBox={viewBox}
              svgContent={svgContent}
              onReady={() => setTerrainReady(true)}
            />
          )}
          {showSvg && (
            <BaseSvg
              html={svgContent}
              className={terrainReady ? "terrain-svg-layer" : undefined}
            />
          )}
          {debug === "mask" && maskUrl && (
            <img
              src={maskUrl}
              alt="Terrain mask debug"
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ zIndex: 10, opacity: 0.5, objectFit: "fill" }}
            />
          )}
        </div>

        {/* Toggle sidebar button */}
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          className="absolute top-3 right-3 z-20 px-2 py-1 bg-gray-800 rounded text-xs text-gray-300 hover:bg-gray-700"
        >
          {sidebarOpen ? "Hide Controls" : "Show Controls"}
        </button>

        {/* Zoom info */}
        <div className="absolute bottom-3 left-3 z-20 text-xs text-gray-500">
          {(MAP_W / viewBox.w).toFixed(1)}x zoom — double-click to reset
        </div>
      </div>

      {/* ---- Right sidebar ---- */}
      {sidebarOpen && (
        <div className="w-72 border-l border-gray-800 bg-gray-900 overflow-y-auto flex-shrink-0">
          <div className="p-4 space-y-5">
            <h2 className="text-sm font-semibold text-gray-300 uppercase tracking-wider">
              Terrain Controls
            </h2>

            {/* Debug toggles */}
            <fieldset className="space-y-1">
              <legend className="text-xs font-medium text-gray-400 mb-1">
                Display Mode
              </legend>
              {(["both", "terrain-only", "svg-only", "mask"] as DebugMode[]).map(
                (mode) => (
                  <label key={mode} className="flex items-center gap-2 text-xs text-gray-300 cursor-pointer">
                    <input
                      type="radio"
                      name="debug"
                      checked={debug === mode}
                      onChange={() => setDebug(mode)}
                      className="accent-blue-500"
                    />
                    {mode === "both" ? "Terrain + SVG"
                      : mode === "terrain-only" ? "Terrain only"
                      : mode === "svg-only" ? "SVG only"
                      : "Mask overlay (50%)"}
                  </label>
                ),
              )}
            </fieldset>

            {/* Presets */}
            <div>
              <div className="text-xs font-medium text-gray-400 mb-1">Presets</div>
              <div className="flex flex-wrap gap-1">
                {Object.keys(TERRAIN_PRESETS).map((name) => (
                  <button
                    key={name}
                    onClick={() => applyPreset(name)}
                    className="px-2 py-0.5 bg-gray-800 rounded text-xs text-gray-300 hover:bg-gray-700 capitalize"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            {/* Parameter sliders grouped */}
            {Object.entries(groups).map(([group, params]) => (
              <div key={group}>
                <div className="text-xs font-medium text-gray-400 mb-2 border-b border-gray-800 pb-1">
                  {group}
                </div>
                <div className="space-y-2">
                  {params.map((p) => (
                    <div key={p.key}>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>{p.label}</span>
                        <span className="text-gray-500 tabular-nums">
                          {config[p.key].toFixed(p.step < 0.1 ? 2 : p.step < 1 ? 1 : 0)}
                        </span>
                      </div>
                      <input
                        type="range"
                        min={p.min}
                        max={p.max}
                        step={p.step}
                        value={config[p.key]}
                        onChange={(e) => updateParam(p.key, parseFloat(e.target.value))}
                        className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
