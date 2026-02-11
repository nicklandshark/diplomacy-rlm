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
    <div className="fixed bottom-0 left-0 right-0 z-50 pointer-events-none">
      {/* Gradient scrim background */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(to bottom, rgba(10, 10, 10, 0) 0%, rgba(10, 10, 10, 0.6) 40%, rgba(10, 10, 10, 0.8) 100%)"
        }}
      />

      {/* Phase banner */}
      <div className="relative flex justify-center pb-6 sm:pb-8 lg:pb-10">
        <div
          className="bg-[#1a1a1a] border-2 border-[#ff9500] px-6 sm:px-8 lg:px-10 py-3 sm:py-4 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300"
          style={{ boxShadow: "0 0 30px rgba(255, 149, 0, 0.4)" }}
        >
          <div className="text-[#ff9500] text-sm sm:text-base lg:text-lg font-bold uppercase tracking-[0.2em] text-center">
            {phaseDisplayName(phase)}
          </div>
          <div className="h-0.5 w-full bg-[#ff9500] mt-2 animate-pulse" />
        </div>
      </div>
    </div>
  );
}
