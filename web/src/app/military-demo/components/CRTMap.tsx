"use client";

import DiplomacyMap from "@/components/map/DiplomacyMap";
import CRTDistortion from "./CRTDistortion";
import type { GameState, PhaseOrders, PhaseResults } from "@/lib/types";

interface Props {
  svgContent: string;
  state: GameState | null;
  orders?: PhaseOrders;
  results?: PhaseResults;
  hoveredOrder?: string | null;
  focusLocation?: string | null;
  revealedOrderCount?: number;
}

export default function CRTMap({ svgContent, state, orders, results, hoveredOrder, focusLocation, revealedOrderCount }: Props) {
  return (
    <div className="relative w-full h-full" style={{ background: "#000", perspective: "1000px" }}>
      {/* CRT curvature container */}
      <div
        className="relative w-full h-full"
        style={{
          transformStyle: "preserve-3d",
          transform: "rotateY(0deg) rotateX(0deg) scale(1.02)",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        {/* Map layer */}
        <div className="absolute inset-0 z-[1]" style={{ filter: "saturate(2.21) contrast(1.09) brightness(1.01)" }}>
          <DiplomacyMap
            svgContent={svgContent}
            state={state}
            orders={orders}
            results={results}
            hoveredOrder={hoveredOrder}
            focusLocation={focusLocation}
            revealedOrderCount={revealedOrderCount}
            showTerrain={false}
            fitMode="cover"
          />
        </div>

        {/* CRT overlay effects */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-[2]">
          {/* Chromatic Aberration — edge-weighted, stronger at periphery like real CRT convergence errors */}
          <div
            className="absolute inset-0 z-[4]"
            style={{
              background: "radial-gradient(ellipse at center, transparent 30%, rgba(255,0,0,0.12) 70%, rgba(255,0,0,0.2) 100%)",
              mixBlendMode: "screen",
              transform: "translateX(-2.5px) translateY(-0.5px)",
              filter: "blur(0.8px)",
            }}
          />
          <div
            className="absolute inset-0 z-[4]"
            style={{
              background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,255,0.1) 70%, rgba(0,0,255,0.18) 100%)",
              mixBlendMode: "screen",
              transform: "translateX(2.5px) translateY(0.5px)",
              filter: "blur(0.8px)",
            }}
          />
          {/* Green channel stays centered — the "anchor" in real RGB convergence */}
          <div
            className="absolute inset-0 z-[4]"
            style={{
              background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,255,0,0.04) 75%, rgba(0,255,0,0.08) 100%)",
              mixBlendMode: "screen",
              filter: "blur(0.4px)",
            }}
          />

          {/* Amber tint — radial from center */}
          <div
            className="absolute inset-0 z-[5]"
            style={{
              background: "radial-gradient(ellipse 85% 79.9% at center, rgba(255,149,0,0.38) 0%, rgba(255,149,0,0.37) 35%, rgba(255,149,0,0.16) 60%, transparent 85%)",
              mixBlendMode: "color",
            }}
          />

          {/* Phosphor glow — additive bloom */}
          <div
            className="absolute inset-0 z-[6]"
            style={{
              background: "radial-gradient(ellipse at center, rgba(255,149,0,0.14) 0%, rgba(255,140,40,0.056) 35%, transparent 37%)",
              mixBlendMode: "screen",
              filter: "blur(25px)",
            }}
          />
          <div
            className="absolute inset-0 z-[6]"
            style={{
              background: "radial-gradient(ellipse at center, rgba(255,160,60,0.084) 0%, transparent 27.75%)",
              mixBlendMode: "screen",
              filter: "blur(12px)",
            }}
          />

          {/* Scanlines */}
          <div
            className="crt-scanlines absolute inset-0 z-[7]"
            style={{
              opacity: 0.31,
              backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.6) 0px, transparent 1px, transparent 2px, rgba(0,0,0,0.6) 3px)",
              backgroundSize: "100% 4px",
            }}
          />

          {/* Vignette */}
          <div
            className="absolute inset-0 z-[8]"
            style={{
              background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.16) 42%, rgba(0,0,0,0.4) 58%, rgba(0,0,0,0.66) 76%, rgba(0,0,0,0.92) 100%)",
            }}
          />

          {/* Curvature shadow */}
          <div
            className="absolute inset-0 z-[9]"
            style={{
              opacity: 0.27,
              boxShadow: "inset 0 0 70px 17.5px rgba(0,0,0,0.8)",
              borderRadius: "8px",
            }}
          />
        </div>

        {/* WebGL barrel distortion — visible CRT curvature */}
        <CRTDistortion distortion={0.2} />
      </div>

      {/* Scanline animation */}
      <style jsx global>{`
        @keyframes crt-scanline {
          from { background-position: 0 0; }
          to { background-position: 0 4px; }
        }
        .crt-scanlines {
          animation: crt-scanline 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
