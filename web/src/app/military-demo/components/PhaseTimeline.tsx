"use client";

import { useRef, useEffect, useCallback, useState } from "react";

interface PhaseTimelineProps {
  phases: string[];
  currentPhase: string | null;
  onSelectPhase: (index: number) => void;
}

const SEASON_NAMES: Record<string, string> = {
  S: "Spring",
  F: "Fall",
  W: "Winter",
};

const TYPE_NAMES: Record<string, string> = {
  M: "Movement",
  R: "Retreat",
  A: "Adjustment",
};

export function PhaseTimeline({ phases, currentPhase, onSelectPhase }: PhaseTimelineProps) {
  const currentIndex = currentPhase ? phases.indexOf(currentPhase) : -1;
  const activeRef = useRef<HTMLButtonElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Auto-scroll to keep active phase comfortably centered.
  const scrollToActive = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (activeRef.current) {
      const button = activeRef.current;
      const container = button.parentElement?.parentElement;

      if (container) {
        const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
        const centered = button.offsetLeft - (container.clientWidth - button.offsetWidth) / 2;
        const targetPosition = Math.max(0, Math.min(maxScroll, centered));

        container.scrollTo({
          left: targetPosition,
          behavior
        });
      }
    }
  }, []);

  useEffect(() => {
    scrollToActive("smooth");
  }, [currentIndex, scrollToActive]);

  // Re-position active button when window resizes (breakpoint changes)
  useEffect(() => {
    let resizeTimeout: NodeJS.Timeout;

    const handleResize = () => {
      // Clear previous timeout
      clearTimeout(resizeTimeout);

      // Wait longer for layout to settle after breakpoint changes
      resizeTimeout = setTimeout(() => {
        if (activeRef.current) {
          const button = activeRef.current;
          const container = button.parentElement?.parentElement;

          if (container) {
            const maxScroll = Math.max(0, container.scrollWidth - container.clientWidth);
            const centered = button.offsetLeft - (container.clientWidth - button.offsetWidth) / 2;
            const targetPosition = Math.max(0, Math.min(maxScroll, centered));

            container.scrollTo({
              left: targetPosition,
              behavior: "auto"
            });
          }
        }
      }, 250);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimeout);
    };
  }, []); // Empty deps - resize listener doesn't need to recreate

  return (
    <div className="flex items-center gap-1.5 h-full px-3">
      {phases.map((phase, idx) => {
        const isCurrent = idx === currentIndex;
        const isPast = idx < currentIndex;
        const isHovered = hoveredIndex === idx;
        const year = phase.slice(1, 5);
        const season = phase.slice(0, 1);
        const type = phase.slice(5);
        const seasonName = SEASON_NAMES[season] || season;
        const typeName = TYPE_NAMES[type] || type;

        const borderColor = isCurrent
          ? (isHovered ? "#dba72e" : "#c8951f")
          : isPast
          ? (isHovered ? "#4b463f" : "#2f2b27")
          : (isHovered ? "#4b463f" : "#2a2723");

        const textColor = isCurrent
          ? (isHovered ? "#e7c66f" : "#dcb34d")
          : isPast
          ? (isHovered ? "#9d907d" : "#7f7466")
          : (isHovered ? "#b3a793" : "#7a726a");

        const background = isCurrent
          ? (isHovered
            ? "linear-gradient(180deg, #3c352e 0%, #2e2a24 100%)"
            : "linear-gradient(180deg, #35302a 0%, #2a2621 100%)")
          : isPast
          ? (isHovered
            ? "linear-gradient(180deg, #36322d 0%, #2b2824 100%)"
            : "linear-gradient(180deg, #302d29 0%, #25221f 100%)")
          : (isHovered
            ? "linear-gradient(180deg, #39342f 0%, #2d2925 100%)"
            : "linear-gradient(180deg, #302d29 0%, #25221f 100%)");

        const boxShadow = isCurrent
          ? "inset 0 1px 0 rgba(255,220,140,0.15), 0 0 12px rgba(200,149,31,0.25)"
          : isHovered
          ? "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.42), 0 4px 12px rgba(0,0,0,0.35)"
          : "inset 0 1px 0 rgba(255,255,255,0.05), inset 0 -1px 0 rgba(0,0,0,0.4)";

        return (
          <button
            key={phase}
            ref={isCurrent ? activeRef : null}
            onClick={() => onSelectPhase(idx)}
            onMouseEnter={() => setHoveredIndex(idx)}
            onMouseLeave={() => setHoveredIndex((prev) => (prev === idx ? null : prev))}
            className="relative flex-shrink-0 px-4 sm:px-5 lg:px-6 h-11 border flex items-center justify-center gap-1 transition-all whitespace-nowrap rounded-[6px] cursor-pointer"
            style={{
              borderColor,
              color: textColor,
              background,
              boxShadow,
              transform: isHovered && !isCurrent ? "translateY(-1px)" : "none",
            }}
          >
            {/* Compact: S01 M */}
            <span
              className="lg:hidden text-[12px] font-bold leading-none"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {season}{year.slice(2)} {type.charAt(0)}
            </span>

            {/* Expanded: Spring 1901 Movement */}
            <span
              className="hidden lg:block text-[14px] font-bold leading-none"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {seasonName} {year} {typeName}
            </span>
          </button>
        );
      })}
    </div>
  );
}
