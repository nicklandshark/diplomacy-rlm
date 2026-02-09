"use client";

interface Props {
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
}: Props) {
  return (
    <div className="bg-[#1a1a1a] border-2 border-[#3a3a3a] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#808080]">SPEED:</span>
          {[1, 2, 5].map(s => (
            <button
              key={s}
              onClick={() => onSpeedChange(s)}
              className={`px-3 py-1 text-xs border-2 ${
                speed === s
                  ? "bg-[#ff9500] border-[#ff9500] text-[#0a0a0a]"
                  : "bg-[#3a3a3a] border-[#3a3a3a] text-[#ff9500]"
              }`}
            >
              {s}x
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-[#808080]">TRIGGER:</span>
          <button onClick={onTriggerOrder} className="px-3 py-1 text-xs bg-[#3a3a3a] border-2 border-[#3a3a3a] text-[#ff9500]">
            Order
          </button>
          <button onClick={onTriggerMessage} className="px-3 py-1 text-xs bg-[#3a3a3a] border-2 border-[#3a3a3a] text-[#ff9500]">
            Message
          </button>
          <button onClick={onTriggerMemory} className="px-3 py-1 text-xs bg-[#3a3a3a] border-2 border-[#3a3a3a] text-[#ff9500]">
            Memory
          </button>
          <button onClick={onTriggerPhase} className="px-3 py-1 text-xs bg-[#3a3a3a] border-2 border-[#3a3a3a] text-[#ff9500]">
            Phase
          </button>
        </div>

        <button onClick={onReset} className="px-4 py-1 text-xs bg-[#dc143c] border-2 border-[#dc143c] text-white">
          RESET
        </button>
      </div>
    </div>
  );
}
