"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  onPrev: () => void;
  onNext: () => void;
  isFirst: boolean;
  isLast: boolean;
  playing: boolean;
  onPlayToggle: () => void;
}

export default function PhaseControls({ onPrev, onNext, isFirst, isLast, playing, onPlayToggle }: Props) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onPrev}
        disabled={isFirst}
        className="px-2 py-1 text-sm bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        &#9664;
      </button>
      <button
        onClick={onPlayToggle}
        className={`px-3 py-1 text-sm rounded transition-colors ${
          playing ? "bg-blue-600 hover:bg-blue-500 text-white" : "bg-gray-800 hover:bg-gray-700"
        }`}
      >
        {playing ? "\u23F8" : "\u25B6"}
      </button>
      <button
        onClick={onNext}
        disabled={isLast}
        className="px-2 py-1 text-sm bg-gray-800 rounded hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed"
      >
        &#9654;
      </button>
    </div>
  );
}
