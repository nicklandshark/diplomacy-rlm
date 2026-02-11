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
    <div className="relative w-full h-full flex items-center justify-center" style={{ background: "#000", perspective: "1000px" }}>
      {/* CRT curvature container - 3D transform for barrel distortion */}
      <div
        className="relative w-full h-full flex items-center justify-center"
        style={{
          transformStyle: "preserve-3d",
          transform: "rotateY(0deg) rotateX(0deg) scale(1.02)",
          borderRadius: "12px",
          overflow: "hidden",
        }}
      >
        {/* Map layer - extreme saturation for colorblind-friendly orange monochrome */}
        <div className="relative z-[1]" style={{ filter: "saturate(3.5) contrast(1.4) brightness(1.15)" }}>
          <DiplomacyMap
            svgContent={svgContent}
            state={state}
            orders={orders}
            results={results}
            hoveredOrder={hoveredOrder}
            focusLocation={focusLocation}
            revealedOrderCount={revealedOrderCount}
            showTerrain={false}
          />
        </div>

        {/* CRT overlay effects - positioned absolutely to cover map */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Chromatic Aberration - RGB split effect */}
          <div
            className="absolute inset-0 z-[4]"
            style={{
              backgroundColor: "#ff0000",
              mixBlendMode: "screen",
              opacity: 0.08,
              transform: "translateX(-2px)",
              filter: "blur(0.5px)",
            }}
          />
          <div
            className="absolute inset-0 z-[4]"
            style={{
              backgroundColor: "#0000ff",
              mixBlendMode: "screen",
              opacity: 0.08,
              transform: "translateX(2px)",
              filter: "blur(0.5px)",
            }}
          />

          {/* Orange monochrome filter - reduced opacity for readability */}
          <div
            className="absolute inset-0 z-[5]"
            style={{
              backgroundColor: "#ff9500",
              mixBlendMode: "color",
              opacity: 0.6,
            }}
          />

          {/* Phosphor glow layers - subtle bloom */}
          <div
            className="absolute inset-0 z-[6]"
            style={{
              background: "radial-gradient(ellipse at center, rgba(255,149,0,0.25) 0%, transparent 60%)",
              mixBlendMode: "screen",
              filter: "blur(30px)",
            }}
          />
          <div
            className="absolute inset-0 z-[6]"
            style={{
              background: "radial-gradient(ellipse at center, rgba(255,149,0,0.15) 0%, transparent 50%)",
              mixBlendMode: "screen",
              filter: "blur(15px)",
            }}
          />

          {/* Scanlines - infinite scroll, lighter */}
          <div
            className="crt-scanlines absolute inset-0 opacity-25 z-[7]"
            style={{
              backgroundImage: "repeating-linear-gradient(0deg, rgba(0,0,0,0.6) 0px, transparent 1px, transparent 2px, rgba(0,0,0,0.6) 3px)",
              backgroundSize: "100% 4px",
            }}
          />

          {/* Vignette - lighter */}
          <div
            className="absolute inset-0 z-[8]"
            style={{
              background: "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.5) 100%)",
            }}
          />

          {/* Screen curvature shadow - subtle */}
          <div
            className="absolute inset-0 opacity-30 z-[9]"
            style={{
              boxShadow: "inset 0 0 80px 20px rgba(0,0,0,0.8)",
              borderRadius: "8px",
            }}
          />
        </div>

        {/* WebGL barrel distortion shader for CRT curvature - increased for stronger effect */}
        <CRTDistortion distortion={0.22} />
      </div>

      {/* Global CSS Animation for infinite scanline scroll */}
      <style jsx global>{`
        @keyframes crt-scanline {
          from {
            background-position: 0 0;
          }
          to {
            background-position: 0 4px;
          }
        }
        .crt-scanlines {
          animation: crt-scanline 8s linear infinite;
        }
      `}</style>
    </div>
  );
}
