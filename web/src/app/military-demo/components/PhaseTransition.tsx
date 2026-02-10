"use client";

import { useEffect, useState } from "react";
import { phaseDisplayName } from "@/lib/constants";

interface PhaseTransitionProps {
  phase: string | null;
  show: boolean;
}

export function PhaseTransition({ phase, show }: PhaseTransitionProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show && phase) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [show, phase]);

  if (!visible || !phase) return null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
      <div 
        className="bg-[#1a1a1a] border-2 border-[#ff9500] px-6 py-3 shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300"
        style={{ boxShadow: "0 0 30px rgba(255, 149, 0, 0.4)" }}
      >
        <div className="text-[#ff9500] text-sm font-bold uppercase tracking-[0.2em]">
          {phaseDisplayName(phase)}
        </div>
        <div className="h-0.5 w-full bg-[#ff9500] mt-2 animate-pulse" />
      </div>
    </div>
  );
}
