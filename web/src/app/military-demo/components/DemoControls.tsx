"use client";

import { TacticalPanel, CommandButton } from "@/app/military-ui-kit/components";

interface DemoControlsProps {
  onReset: () => void;
  onTriggerOrder: () => void;
  onTriggerMessage: () => void;
  onTriggerMemory: () => void;
  onTriggerPhase: () => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
}

export default function DemoControls({
  onReset,
  onTriggerOrder,
  onTriggerMessage,
  onTriggerMemory,
  onTriggerPhase,
  speed,
  onSpeedChange,
}: DemoControlsProps) {
  return (
    <TacticalPanel className="!p-3">
      <div className="flex items-center justify-between gap-4">
        {/* Speed Control */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#808080] uppercase tracking-wider font-bold">Sim Speed</span>
          <div className="flex gap-1">
            {[1, 2, 5].map(s => (
              <button
                key={s}
                onClick={() => onSpeedChange(s)}
                className={`px-3 py-1.5 text-xs font-bold border-2 transition-all ${
                  speed === s
                    ? "bg-[#ff9500] border-[#ff9500] text-[#0a0a0a]"
                    : "bg-[#2a2a2a] border-[#3a3a3a] text-[#808080] hover:border-[#4a4a4a]"
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* Event Triggers */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-[#808080] uppercase tracking-wider font-bold">Events</span>
          <div className="flex gap-1">
            <button
              onClick={onTriggerOrder}
              className="px-3 py-1.5 text-xs bg-[#2a2a2a] border-2 border-[#3a3a3a] text-[#e0e0e0] hover:border-[#4a7c59] transition-colors"
            >
              Order
            </button>
            <button
              onClick={onTriggerMessage}
              className="px-3 py-1.5 text-xs bg-[#2a2a2a] border-2 border-[#3a3a3a] text-[#e0e0e0] hover:border-[#4a7c59] transition-colors"
            >
              Message
            </button>
            <button
              onClick={onTriggerMemory}
              className="px-3 py-1.5 text-xs bg-[#2a2a2a] border-2 border-[#3a3a3a] text-[#e0e0e0] hover:border-[#4a7c59] transition-colors"
            >
              Memory
            </button>
            <button
              onClick={onTriggerPhase}
              className="px-3 py-1.5 text-xs bg-[#2a2a2a] border-2 border-[#3a3a3a] text-[#e0e0e0] hover:border-[#4a7c59] transition-colors"
            >
              Phase
            </button>
          </div>
        </div>

        {/* Reset */}
        <CommandButton variant="danger" onClick={onReset} className="!px-4 !py-1.5 !text-xs">
          RESET
        </CommandButton>
      </div>
    </TacticalPanel>
  );
}
