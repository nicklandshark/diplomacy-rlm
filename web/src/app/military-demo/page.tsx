// web/src/app/military-demo/page.tsx
"use client";

import { useState, useEffect } from "react";
import { usePhases } from "@/hooks/usePhases";
import { usePhaseNavigation } from "@/hooks/usePhaseNavigation";
import { useGameData, useMemory } from "@/hooks/useGameData";
import { useAllMessages } from "@/hooks/useAllMessages";
import { useGameLog } from "@/hooks/useGameLog";
import { parseOrder, humanizeOrder } from "@/lib/parse-orders";
import MemoryViewer from "@/components/memory/MemoryViewer";
import DiplomacyMap from "@/components/map/DiplomacyMap";
import DemoControls from "./components/DemoControls";

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

type LeftTab = "orders" | "messages" | "summary";

export default function MilitaryDemoPage() {
  const DEMO_GAME_ID = "demo";
  const { phases } = usePhases(DEMO_GAME_ID, []);
  const nav = usePhaseNavigation(phases);
  const [dataRefreshKey, setDataRefreshKey] = useState(0);
  const { state, orders, results, loading } = useGameData(DEMO_GAME_ID, nav.currentPhase, dataRefreshKey);
  const { messages: allMessages } = useAllMessages(DEMO_GAME_ID, dataRefreshKey);
  const gameLog = useGameLog(DEMO_GAME_ID, dataRefreshKey);
  const [leftTab, setLeftTab] = useState<LeftTab>("orders");
  const [selectedPower, setSelectedPower] = useState<string | null>("FRANCE");
  const { content: memoryContent } = useMemory(
    DEMO_GAME_ID,
    selectedPower || "FRANCE",
    nav.currentPhase || undefined
  );
  const [hoveredTerritory, setHoveredTerritory] = useState<string | null>(null);
  const [svgContent, setSvgContent] = useState<string>("");
  const [simSpeed, setSimSpeed] = useState(1);

  useEffect(() => {
    fetch("/diplomacy_map.svg")
      .then(r => r.text())
      .then(setSvgContent);
  }, []);

  const handleReset = () => {
    nav.jumpTo(0);
    setDataRefreshKey(k => k + 1);
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#e0e0e0] p-4">
      <div className="max-w-[1920px] mx-auto">
        {/* Top Navigation */}
        <div className="mb-4">
          <DemoControls
            speed={simSpeed}
            onSpeedChange={setSimSpeed}
            onReset={handleReset}
            onTriggerOrder={() => console.log("Trigger order")}
            onTriggerMessage={() => console.log("Trigger message")}
            onTriggerMemory={() => console.log("Trigger memory")}
            onTriggerPhase={() => console.log("Trigger phase")}
          />
        </div>

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
            <Panel title="INTELLIGENCE">
              <div className="flex gap-2 mb-4">
                {(["orders", "messages", "summary"] as LeftTab[]).map(tab => (
                  <button
                    key={tab}
                    onClick={() => setLeftTab(tab)}
                    className={`flex-1 text-xs py-2 px-3 border-2 uppercase ${
                      leftTab === tab
                        ? "bg-[#ff9500] border-[#ff9500] text-[#0a0a0a]"
                        : "bg-[#3a3a3a] border-[#3a3a3a] text-[#ff9500]"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {loading && (
                <div className="text-center text-[#ff9500]">Loading phase data...</div>
              )}

              {/* Orders Tab */}
              {leftTab === "orders" && orders && (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {Object.entries(orders).flatMap(([power, powerOrders]) =>
                    (powerOrders as string[]).map((order, idx) => {
                      const parsed = parseOrder(order);
                      if (!parsed) return null;
                      const humanized = humanizeOrder(parsed);
                      const result = results?.[order];
                      const status = result?.includes("void") ? "failed" :
                                    result?.includes("bounce") ? "bounced" :
                                    "success";

                      return (
                        <div
                          key={`${power}-${idx}`}
                          className={`p-2 border-2 ${
                            status === "success" ? "border-[#4a7c59] bg-[#4a7c59]/5" :
                            status === "failed" ? "border-[#dc143c] bg-[#dc143c]/5" :
                            "border-[#808080] bg-[#808080]/5"
                          }`}
                        >
                          <div className="text-xs text-[#e0e0e0] font-bold">{parsed.loc}</div>
                          <div className="text-[10px] text-[#808080]">{humanized}</div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Messages Tab */}
              {leftTab === "messages" && (
                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {allMessages && allMessages.length > 0 ? (
                    allMessages
                      .sort((a, b) => a.phase.localeCompare(b.phase))
                      .map((msg, idx) => (
                        <div key={idx} className="p-2 bg-[#1a1a1a] border-2 border-[#3a3a3a]">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-bold text-[#ff9500]">{msg.sender}</span>
                            <span className="text-xs text-[#808080]">→</span>
                            <span className="text-xs font-bold text-[#4a7c59]">{msg.recipient}</span>
                          </div>
                          <p className="text-xs text-[#e0e0e0]">{msg.message}</p>
                          <span className="text-[10px] text-[#808080]">{msg.phase}</span>
                        </div>
                      ))
                  ) : (
                    <div className="text-center text-[#808080] text-sm">No messages</div>
                  )}
                </div>
              )}

              {/* Summary Tab */}
              {leftTab === "summary" && state && (
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
              {svgContent && state ? (
                <DiplomacyMap
                  svgContent={svgContent}
                  state={state}
                  orders={orders || {}}
                  results={results || {}}
                  onTerritoryHover={setHoveredTerritory}
                />
              ) : (
                <div className="aspect-[4/3] flex items-center justify-center">
                  <div className="text-[#808080]">Loading map...</div>
                </div>
              )}
            </Panel>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4">
            <Panel title="ACTIVITY FEED">
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {gameLog.map((entry, idx) => (
                  <div key={idx} className="flex items-start gap-2 py-1 border-b border-[#2a2a2a]">
                    <div className="text-[10px] text-[#808080] min-w-[45px]">T+{idx}</div>
                    <div className="text-xs text-[#e0e0e0]">{entry.event}{entry.phase ? ` (${entry.phase})` : ""}</div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="MEMORY">
              <div className="mb-3">
                <select
                  value={selectedPower || ""}
                  onChange={(e) => setSelectedPower(e.target.value)}
                  className="w-full bg-[#1a1a1a] border-2 border-[#3a3a3a] text-[#e0e0e0] px-3 py-2 text-sm"
                >
                  {state && Object.keys(state.units).map(power => (
                    <option key={power} value={power}>{power}</option>
                  ))}
                </select>
              </div>

              <div className="max-h-[400px] overflow-y-auto">
                <MemoryViewer content={memoryContent || ""} />
              </div>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  );
}
