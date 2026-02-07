"use client";

import { useState, useEffect, useRef } from "react";
import { phaseDisplayName } from "@/lib/constants";

interface Props {
  phase: string | null;
}

export default function PhaseTransitionOverlay({ phase }: Props) {
  const [visible, setVisible] = useState(false);
  const [displayPhase, setDisplayPhase] = useState<string | null>(null);
  const prevPhaseRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!phase || phase === prevPhaseRef.current) return;

    // Don't show on initial mount
    if (prevPhaseRef.current !== null) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setDisplayPhase(phase);
      setVisible(true);
      timerRef.current = setTimeout(() => setVisible(false), 1200);
    }

    prevPhaseRef.current = phase;

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [phase]);

  if (!displayPhase) return null;

  return (
    <div
      className={`absolute inset-0 flex items-center justify-center pointer-events-none z-10 transition-opacity duration-300 ${
        visible ? "opacity-100" : "opacity-0"
      }`}
    >
      <div className="bg-gray-950/80 backdrop-blur-sm rounded-lg px-6 py-3 border border-gray-700/50">
        <div className="text-lg font-semibold text-white text-center">
          {phaseDisplayName(displayPhase)}
        </div>
        <div className="text-xs text-gray-400 text-center mt-0.5">
          {displayPhase}
        </div>
      </div>
    </div>
  );
}
