"use client";

import { useState, useCallback } from "react";

interface UsePhasesResult {
  phases: string[];
  refresh: () => Promise<void>;
}

export function usePhases(gameId: string, initialPhases: string[]): UsePhasesResult {
  const [phases, setPhases] = useState<string[]>(initialPhases);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch(`/api/games/${gameId}/phases?t=${Date.now()}`);
      if (res.ok) {
        const data: string[] = await res.json();
        setPhases(data);
      }
    } catch {
      // ignore fetch errors -- will retry on next event
    }
  }, [gameId]);

  return { phases, refresh };
}
