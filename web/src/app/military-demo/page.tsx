// web/src/app/military-demo/page.tsx
"use client";

import { useState } from "react";
import { usePhases } from "@/hooks/usePhases";
import { usePhaseNavigation } from "@/hooks/usePhaseNavigation";
import { useGameData } from "@/hooks/useGameData";

// Simple panel component for demo structure
function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`border border-[#2a2a2a] bg-[#1a1a1a] rounded ${className}`}>
      <div className="border-b border-[#2a2a2a] bg-[#0f0f0f] px-4 py-2">
        <h2 className="text-xs font-bold tracking-wider text-[#ff9500] uppercase">{title}</h2>
      </div>
      <div className="p-4">
        {children}
      </div>
    </div>
  );
}

export default function MilitaryDemoPage() {
  const DEMO_GAME_ID = "demo";
  const { phases } = usePhases(DEMO_GAME_ID, []);
  const nav = usePhaseNavigation(phases);
  const [dataRefreshKey, setDataRefreshKey] = useState(0);
  const { state, orders, results, loading } = useGameData(DEMO_GAME_ID, nav.currentPhase, dataRefreshKey);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e0e0e0] p-4">
      <div className="max-w-[1920px] mx-auto">
        {/* Top Navigation */}
        <div className="mb-4">
          <Panel title="GAME CONTROL">
            <div className="flex items-center justify-between">
              <div className="text-[#ff9500] font-bold text-lg">GAME: {DEMO_GAME_ID}</div>

              <div className="flex items-center gap-4">
                <button
                  disabled={nav.isFirst}
                  onClick={nav.goPrev}
                  className="px-4 py-2 bg-[#3a3a3a] border-2 border-[#ff9500] text-[#ff9500] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  ◀ PREV
                </button>

                <div className="px-4 py-2 bg-[#1a1a1a] border-2 border-[#3a3a3a] font-mono text-sm">
                  {nav.currentPhase || "Loading..."}
                </div>

                <button
                  disabled={nav.isLast}
                  onClick={nav.goNext}
                  className="px-4 py-2 bg-[#3a3a3a] border-2 border-[#ff9500] text-[#ff9500] disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  NEXT ▶
                </button>
              </div>

              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-xs text-[#808080]">LIVE</span>
              </div>
            </div>

            <div className="mt-4">
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {phases.map((phase: string, idx: number) => {
                  const isCurrent = phase === nav.currentPhase;
                  const isPast = phases.indexOf(nav.currentPhase || "") > idx;

                  return (
                    <div
                      key={phase}
                      className={`relative w-12 h-12 border-2 flex items-center justify-center transition-all cursor-pointer ${
                        isCurrent
                          ? "border-[#ff9500] bg-[#ff9500]/10 text-[#ff9500]"
                          : isPast
                          ? "border-[#4a7c59] bg-[#4a7c59]/5 text-[#4a7c59]"
                          : "border-[#3a3a3a] bg-[#1a1a1a] text-[#808080]"
                      }`}
                      onClick={() => nav.goTo(idx)}
                    >
                      <div className="text-xs font-bold">{phase.slice(0, 6)}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </Panel>
        </div>

        {/* Main 3-Column Layout */}
        <div className="grid grid-cols-[320px_1fr_380px] gap-4">
          {/* Left Sidebar */}
          <div className="space-y-4">
            <Panel title="ORDERS">
              {loading && (
                <div className="text-center text-[#ff9500]">Loading phase data...</div>
              )}
              {state && (
                <div className="space-y-2">
                  {Object.entries(state.units).map(([power, units]) => (
                    <div key={power} className="p-2 bg-[#1a1a1a] border border-[#3a3a3a]">
                      <div className="text-xs text-[#ff9500] font-bold">{power}</div>
                      <div className="text-[10px] text-[#808080]">
                        {units.length} units, {state.centers[power]?.length || 0} centers
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>

          {/* Center Map */}
          <div>
            <Panel title="TACTICAL MAP">
              <div className="aspect-[4/3] flex items-center justify-center">
                <div className="text-sm text-[#808080]">Map Placeholder</div>
              </div>
            </Panel>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            <Panel title="ACTIVITY FEED">
              <div className="text-sm text-[#808080]">Right sidebar placeholder</div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
