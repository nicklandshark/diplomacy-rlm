"use client";

import { Rivet } from "@/app/military-ui-kit/components";
import { POWER_DISPLAY_COLORS } from "@/lib/constants";
import type { GameState } from "@/lib/types";

interface SummaryPanelProps {
  state: GameState | null;
}

export function SummaryPanel({ state }: SummaryPanelProps) {
  if (!state) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-[#808080]">
        <div className="text-2xl mb-2">◈</div>
        <div className="text-sm uppercase tracking-wider">Loading...</div>
      </div>
    );
  }

  const powers = Object.entries(state.units)
    .filter(([, units]) => (units as string[]).length > 0)
    .map(([power]) => power);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {powers.map((power) => {
          const unitCount = state.units[power]?.length || 0;
          const centerCount = state.centers[power]?.length || 0;
          const color = (POWER_DISPLAY_COLORS as Record<string, string>)[power] || "#808080";
          
          return (
            <div
              key={power}
              className="relative bg-[#1a1a1a] border-2 border-[#3a3a3a] p-3 overflow-hidden group hover:border-[#4a4a4a] transition-colors"
            >
              <Rivet size={4} style={{ left: "6px", top: "6px" }} />
              <Rivet size={4} style={{ right: "6px", top: "6px" }} />
              <Rivet size={4} style={{ left: "6px", bottom: "6px" }} />
              <Rivet size={4} style={{ right: "6px", bottom: "6px" }} />
              
              <div className="relative z-10">
                <div 
                  className="text-xs font-bold uppercase tracking-[0.15em] mb-2"
                  style={{ color }}
                >
                  {power}
                </div>
                
                <div className="flex items-center justify-between text-[10px] text-[#808080]">
                  <span>UNITS</span>
                  <span className="text-[#e0e0e0] font-mono">{unitCount}</span>
                </div>
                
                <div className="flex items-center justify-between text-[10px] text-[#808080]">
                  <span>CENTERS</span>
                  <span className="text-[#ff9500] font-mono">{centerCount}</span>
                </div>
              </div>
              
              {/* Power color indicator strip */}
              <div 
                className="absolute bottom-0 left-0 right-0 h-1"
                style={{ background: color, opacity: 0.6 }}
              />
            </div>
          );
        })}
      </div>
      
      {/* Total stats */}
      <div className="relative bg-[#1a1a1a] border-2 border-[#3a3a3a] p-3">
        <Rivet size={4} style={{ left: "6px", top: "6px" }} />
        <Rivet size={4} style={{ right: "6px", top: "6px" }} />
        
        <div className="relative z-10 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#808080] uppercase tracking-wider">Active Powers</span>
            <span className="text-[#e0e0e0] font-mono font-bold">{powers.length}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#808080] uppercase tracking-wider">Total Units</span>
            <span className="text-[#e0e0e0] font-mono font-bold">
              {powers.reduce((sum, p) => sum + (state.units[p]?.length || 0), 0)}
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#808080] uppercase tracking-wider">Supply Centers</span>
            <span className="text-[#ff9500] font-mono font-bold">
              {powers.reduce((sum, p) => sum + (state.centers[p]?.length || 0), 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
