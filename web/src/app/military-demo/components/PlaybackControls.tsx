"use client";

import { useEffect, useRef } from "react";

interface PlaybackControlsProps {
  playing: boolean;
  currentIndex: number;
  totalOrders: number;
  onToggle: () => void;
  onStep: (direction: number) => void;
  currentOrder: string | null;
}

export function PlaybackControls({
  playing,
  currentIndex,
  totalOrders,
  onToggle,
  onStep,
  currentOrder,
}: PlaybackControlsProps) {
  const progressPercent = totalOrders > 0 ? (currentIndex / totalOrders) * 100 : 0;

  return (
    <div className="bg-[#1a1a1a] border-2 border-[#ff9500] p-3 flex items-center gap-4">
      {/* Playback Buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onStep(-1)}
          disabled={currentIndex <= 0}
          className="w-8 h-8 flex items-center justify-center bg-[#2a2a2a] border border-[#3a3a3a] text-[#e0e0e0] hover:border-[#ff9500] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          ⏮
        </button>
        
        <button
          onClick={onToggle}
          className="w-10 h-8 flex items-center justify-center bg-[#ff9500] border border-[#ff9500] text-[#0a0a0a] hover:bg-[#ffaa20] transition-all"
        >
          {playing ? "⏸" : "▶"}
        </button>
        
        <button
          onClick={() => onStep(1)}
          disabled={currentIndex >= totalOrders}
          className="w-8 h-8 flex items-center justify-center bg-[#2a2a2a] border border-[#3a3a3a] text-[#e0e0e0] hover:border-[#ff9500] disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          ⏭
        </button>
      </div>

      {/* Progress Bar */}
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-[#808080] uppercase tracking-wider">
            Order {currentIndex} of {totalOrders}
          </span>
        </div>
        <div className="h-2 bg-[#2a2a2a] border border-[#3a3a3a]">
          <div
            className="h-full bg-[#ff9500] transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Current Order */}
      {currentOrder && (
        <div className="text-xs text-[#e0e0e0] max-w-[200px] truncate">
          {currentOrder}
        </div>
      )}
    </div>
  );
}
