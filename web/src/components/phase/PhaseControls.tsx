"use client";

import { useState, useEffect, useRef } from "react";

interface Props {
  onPrev: () => void;
  onNext: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export default function PhaseControls({ onPrev, onNext, isFirst, isLast }: Props) {
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (playing) {
      intervalRef.current = setInterval(() => {
        onNext();
      }, 2000);
      return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    }
  }, [playing, onNext]);

  useEffect(() => {
    if (isLast && playing) setPlaying(false);
  }, [isLast, playing]);

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
        onClick={() => setPlaying(!playing)}
        className="px-3 py-1 text-sm bg-gray-800 rounded hover:bg-gray-700"
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
