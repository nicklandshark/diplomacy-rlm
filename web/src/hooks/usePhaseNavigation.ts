"use client";

import { useState, useCallback, useEffect, useRef } from "react";

interface PhaseNav {
  phases: string[];
  currentIndex: number;
  currentPhase: string | null;
  goTo: (index: number) => void;
  goNext: () => void;
  goPrev: () => void;
  goFirst: () => void;
  goLast: () => void;
  isFirst: boolean;
  isLast: boolean;
  following: boolean;
}

export function usePhaseNavigation(phases: string[]): PhaseNav {
  const [currentIndex, setCurrentIndex] = useState(phases.length > 0 ? phases.length - 1 : 0);
  const [following, setFollowing] = useState(true);
  const prevLengthRef = useRef(phases.length);

  // When phases grow and we're in following mode, jump to the new last phase
  useEffect(() => {
    if (phases.length > prevLengthRef.current && following) {
      setCurrentIndex(phases.length - 1);
    }
    prevLengthRef.current = phases.length;
  }, [phases.length, following]);

  const goTo = useCallback((idx: number) => {
    const clamped = Math.max(0, Math.min(idx, phases.length - 1));
    setCurrentIndex(clamped);
    // Manual navigation to anything other than the last phase disables following
    if (clamped < phases.length - 1) {
      setFollowing(false);
    }
  }, [phases.length]);

  const goNext = useCallback(() => {
    setCurrentIndex(prev => {
      const next = Math.min(prev + 1, phases.length - 1);
      if (next < phases.length - 1) {
        setFollowing(false);
      }
      return next;
    });
  }, [phases.length]);

  const goPrev = useCallback(() => {
    setCurrentIndex(prev => {
      const next = Math.max(prev - 1, 0);
      setFollowing(false);
      return next;
    });
  }, []);

  const goFirst = useCallback(() => {
    setCurrentIndex(0);
    setFollowing(false);
  }, []);

  const goLast = useCallback(() => {
    setCurrentIndex(phases.length - 1);
    setFollowing(true);
  }, [phases.length]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "l") goNext();
      else if (e.key === "ArrowLeft" || e.key === "h") goPrev();
      else if (e.key === "Home") goFirst();
      else if (e.key === "End") goLast();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev, goFirst, goLast]);

  return {
    phases,
    currentIndex,
    currentPhase: phases[currentIndex] || null,
    goTo, goNext, goPrev, goFirst, goLast,
    isFirst: currentIndex === 0,
    isLast: currentIndex === phases.length - 1,
    following,
  };
}
