"use client";

import { useRef, useEffect } from "react";

interface Props {
  phases: string[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

export default function PhaseTimeline({ phases, currentIndex, onSelect }: Props) {
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [currentIndex]);

  return (
    <div
      className="flex gap-1 scroll-fade-x pb-1 px-5"
    >
      {phases.map((phase, i) => (
        <button
          key={phase}
          ref={i === currentIndex ? activeRef : null}
          onClick={() => onSelect(i)}
          className={`
            px-3 py-1.5 text-sm rounded whitespace-nowrap transition-colors flex-shrink-0
            ${i === currentIndex
              ? "bg-blue-600 text-white"
              : "bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
            }
          `}
        >
          {phase}
        </button>
      ))}
    </div>
  );
}
