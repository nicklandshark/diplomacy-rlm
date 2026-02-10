"use client";

interface PhaseTimelineProps {
  phases: string[];
  currentPhase: string | null;
  onSelectPhase: (index: number) => void;
}

export function PhaseTimeline({ phases, currentPhase, onSelectPhase }: PhaseTimelineProps) {
  const currentIndex = currentPhase ? phases.indexOf(currentPhase) : -1;

  return (
    <div className="flex items-center gap-1 overflow-x-auto scrollbar-thin scrollbar-thumb-[#3a3a3a] scrollbar-track-transparent">
      {phases.map((phase, idx) => {
        const isCurrent = idx === currentIndex;
        const isPast = idx < currentIndex;
        const year = phase.slice(1, 5);
        const season = phase.slice(0, 1);
        const type = phase.slice(5);

        return (
          <button
            key={phase}
            onClick={() => onSelectPhase(idx)}
            className={`relative flex-shrink-0 w-10 h-10 border flex flex-col items-center justify-center transition-all ${
              isCurrent
                ? "border-[#ff9500] bg-[#ff9500]/10"
                : isPast
                ? "border-[#4a7c59] bg-[#4a7c59]/5"
                : "border-[#3a3a3a] bg-[#1a1a1a] hover:border-[#4a4a4a]"
            }`}
            style={{
              boxShadow: isCurrent
                ? "0 0 10px rgba(255, 149, 0, 0.3)"
                : "none",
            }}
          >
            <span className={`text-[9px] font-bold leading-none ${isCurrent ? "text-[#ff9500]" : isPast ? "text-[#4a7c59]" : "text-[#808080]"}`}>
              {season}{year.slice(2)}
            </span>
            <span className={`text-[7px] uppercase leading-none mt-[2px] ${isCurrent ? "text-[#ff9500]/70" : isPast ? "text-[#4a7c59]/70" : "text-[#808080]/70"}`}>
              {type.charAt(0)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
