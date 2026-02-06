"use client";

import { useState, useCallback } from "react";
import DiplomacyMap from "@/components/map/DiplomacyMap";
import MapLegend from "@/components/map/MapLegend";
import PhaseTimeline from "@/components/phase/PhaseTimeline";
import PhaseControls from "@/components/phase/PhaseControls";
import PowerPanel from "@/components/power/PowerPanel";
import MemoryViewer from "@/components/memory/MemoryViewer";
import MessageList from "@/components/messages/MessageList";
import ActivityFeed from "@/components/activity/ActivityFeed";
import { useGameData, useMemory } from "@/hooks/useGameData";
import { usePhaseNavigation } from "@/hooks/usePhaseNavigation";
import { usePhases } from "@/hooks/usePhases";
import { useLiveEvents } from "@/hooks/useLiveEvents";
import { useAllMessages } from "@/hooks/useAllMessages";
import { phaseDisplayName } from "@/lib/constants";
import type { LiveEvent } from "@/lib/types";

interface Props {
  gameId: string;
  initialPhases: string[];
  svgContent: string;
}

type SidebarTab = "orders" | "messages" | "memory" | "activity";

export default function GameView({ gameId, initialPhases, svgContent }: Props) {
  const { phases, refresh: refreshPhases } = usePhases(gameId, initialPhases);
  const nav = usePhaseNavigation(phases);
  const [dataRefreshKey, setDataRefreshKey] = useState(0);
  const { state, orders, loading } = useGameData(gameId, nav.currentPhase, dataRefreshKey);
  const { messages: allMessages } = useAllMessages(gameId, dataRefreshKey);
  const [selectedPower, setSelectedPower] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<SidebarTab>("orders");
  const { content: memoryContent, loading: memoryLoading } = useMemory(
    gameId,
    selectedPower || "FRANCE",
    nav.currentPhase || undefined
  );

  const onEvent = useCallback((event: LiveEvent) => {
    if (event.event_type === "snapshot.saved") {
      refreshPhases();
      setDataRefreshKey(k => k + 1);
    } else if (event.event_type === "phase.end") {
      refreshPhases();
      setDataRefreshKey(k => k + 1);
    }
  }, [refreshPhases]);

  const liveEvents = useLiveEvents(gameId, { onEvent });

  const activePowers = state
    ? Object.entries(state.units || {})
        .filter(([, units]) => (units as string[]).length > 0)
        .map(([power]) => power)
    : [];

  return (
    <div className="flex flex-col gap-3 h-[calc(100vh-120px)]">
      {/* Phase timeline */}
      <div className="flex items-center gap-4">
        <PhaseControls
          onPrev={nav.goPrev}
          onNext={nav.goNext}
          isFirst={nav.isFirst}
          isLast={nav.isLast}
        />
        <PhaseTimeline
          phases={phases}
          currentIndex={nav.currentIndex}
          onSelect={nav.goTo}
        />
      </div>

      {/* Main content: map + sidebar */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Map area */}
        <div className="flex-1 min-w-0 flex flex-col gap-2">
          <div className="flex-1 min-h-0">
            {loading ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                Loading phase data...
              </div>
            ) : (
              <DiplomacyMap
                svgContent={svgContent}
                state={state}
                orders={orders || undefined}
              />
            )}
          </div>
          <MapLegend />
        </div>

        {/* Sidebar */}
        <div className="w-80 flex-shrink-0 flex flex-col gap-3 min-h-0">
          {/* Power panels */}
          <div className="flex flex-col gap-1">
            {activePowers.map((power) => (
              <PowerPanel
                key={power}
                power={power}
                units={(state?.units?.[power] as string[]) || []}
                centers={(state?.centers?.[power]) || []}
                isActive={selectedPower === power}
                onClick={() => setSelectedPower(selectedPower === power ? null : power)}
              />
            ))}
          </div>

          {/* Tab bar */}
          <div className="flex border-b border-gray-800">
            {(["orders", "messages", "memory", "activity"] as SidebarTab[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`
                  px-3 py-1.5 text-xs font-medium capitalize transition-colors
                  ${activeTab === tab
                    ? "text-blue-400 border-b-2 border-blue-400"
                    : "text-gray-500 hover:text-gray-300"
                  }
                `}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="flex-1 overflow-auto min-h-0">
            {activeTab === "orders" && (
              <div className="p-2 text-sm">
                {orders && Object.entries(orders).map(([power, orderList]) => {
                  if (!(orderList as string[]).length) return null;
                  return (
                    <div key={power} className="mb-3">
                      <div className="text-gray-400 text-xs font-medium mb-1">{power}</div>
                      {(orderList as string[]).map((order, i) => (
                        <div key={i} className="text-gray-300 text-xs font-mono pl-2">
                          {order}
                        </div>
                      ))}
                    </div>
                  );
                })}
                {(!orders || Object.values(orders).every((v) => !(v as string[]).length)) && (
                  <div className="text-gray-500 text-xs">No orders this phase.</div>
                )}
              </div>
            )}

            {activeTab === "messages" && <MessageList messages={allMessages} />}

            {activeTab === "memory" && (
              <div>
                {!selectedPower && (
                  <div className="text-gray-500 text-sm p-4">
                    Select a power to view memory.
                  </div>
                )}
                {selectedPower && memoryLoading && (
                  <div className="text-gray-500 text-sm p-4">Loading memory...</div>
                )}
                {selectedPower && !memoryLoading && memoryContent && (
                  <MemoryViewer content={memoryContent} />
                )}
                {selectedPower && !memoryLoading && !memoryContent && (
                  <div className="text-gray-500 text-sm p-4">No memory for {selectedPower}.</div>
                )}
              </div>
            )}

            {activeTab === "activity" && (
              <ActivityFeed events={liveEvents.events} connected={liveEvents.connected} />
            )}
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-gray-900 border border-gray-800 rounded text-xs text-gray-400">
        <span className="flex items-center gap-2">
          {liveEvents.connected && nav.following && (
            <span className="flex items-center gap-1">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              <span className="text-green-400 font-semibold">LIVE</span>
            </span>
          )}
          Phase: {nav.currentPhase || "\u2013"} {nav.currentPhase && `(${phaseDisplayName(nav.currentPhase)})`}
        </span>
        <span>
          {activePowers.length} active powers
        </span>
        <span>
          {nav.currentIndex + 1} / {phases.length} phases
        </span>
      </div>
    </div>
  );
}
