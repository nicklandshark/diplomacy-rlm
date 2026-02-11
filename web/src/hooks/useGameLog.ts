"use client";

import { useState, useEffect } from "react";
import type { GameLogEvent } from "@/lib/types";

export function useGameLog(gameId: string, refreshKey: number = 0) {
  const [events, setEvents] = useState<GameLogEvent[]>([]);

  useEffect(() => {
    if (!gameId) return;
    let cancelled = false;

    fetch(`/api/games/${gameId}/log`, { cache: "no-store", signal: AbortSignal.timeout(10_000) })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: GameLogEvent[]) => {
        if (!cancelled) setEvents(data);
      })
      .catch(() => {});

    return () => { cancelled = true; };
  }, [gameId, refreshKey]);

  return events;
}
