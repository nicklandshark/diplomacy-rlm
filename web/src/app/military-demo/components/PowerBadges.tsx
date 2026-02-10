"use client";

import { usePowerStatus, type PowerStatus } from "@/hooks/usePowerStatus";
import { powerFlag } from "@/lib/power-flags";
import { POWER_DISPLAY_COLORS } from "@/lib/constants";
import type { LiveEvent } from "@/lib/types";
import { Rivet } from "@/app/military-ui-kit/components";

interface PowerBadgesProps {
  powers: string[];
  selectedPower: string | null;
  events: LiveEvent[];
  onSelectPower: (power: string) => void;
}

const STATUS_CONFIG: Record<PowerStatus, { dot: string; animate: boolean; icon?: string; label: string }> = {
  idle: { dot: "", animate: false, label: "IDLE" },
  thinking: { dot: "bg-amber-400", animate: true, label: "THINKING" },
  talking: { dot: "bg-blue-400", animate: true, label: "TALKING" },
  submitted: { dot: "bg-[#4a7c59]", animate: false, icon: "✓", label: "READY" },
  defaulted: { dot: "bg-yellow-500", animate: false, icon: "–", label: "DEFAULT" },
  timeout: { dot: "bg-[#ff9500]", animate: false, icon: "!", label: "TIMEOUT" },
};

export function PowerBadges({ powers, selectedPower, events, onSelectPower }: PowerBadgesProps) {
  const powerStatus = usePowerStatus(events);

  return (
    <div className="grid grid-cols-3 gap-2">
      {powers.map((power) => {
        const status = powerStatus[power] || "idle";
        const config = STATUS_CONFIG[status];
        const color = (POWER_DISPLAY_COLORS as Record<string, string>)[power] || "#808080";
        const isSelected = selectedPower === power;

        return (
          <button
            key={power}
            onClick={() => onSelectPower(power)}
            className={`relative flex flex-col items-center p-2 border-2 transition-all group ${
              isSelected
                ? "border-[#ff9500] bg-[#ff9500]/10"
                : "border-[#3a3a3a] bg-[#1a1a1a] hover:border-[#4a4a4a]"
            }`}
          >
            <Rivet size={3} style={{ left: "4px", top: "4px" }} />
            <Rivet size={3} style={{ right: "4px", top: "4px" }} />
            
            <div className="relative z-10 flex items-center gap-1.5 mb-1">
              <span className="text-lg leading-none">{powerFlag(power)}</span>
              {config.dot && (
                <div className={`w-1.5 h-1.5 rounded-full ${config.dot} ${config.animate ? "animate-pulse" : ""}`} />
              )}
              {config.icon && (
                <span className="text-[10px] text-[#4a7c59]">{config.icon}</span>
              )}
            </div>
            
            <span 
              className="text-[9px] font-bold uppercase tracking-wider truncate w-full text-center"
              style={{ color }}
            >
              {power.slice(0, 4)}
            </span>
            
            <span className="text-[8px] text-[#808080] uppercase tracking-wider">
              {config.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
