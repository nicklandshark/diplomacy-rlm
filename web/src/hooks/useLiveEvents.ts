"use client";

import { useState, useEffect, useRef } from "react";
import type { LiveEvent } from "@/lib/types";

interface LiveEventsState {
  events: LiveEvent[];
  connected: boolean;
  error: string | null;
}

interface UseLiveEventsOptions {
  enabled?: boolean;
  onEvent?: (event: LiveEvent) => void;
}

export function useLiveEvents(
  gameId: string,
  options: UseLiveEventsOptions = {},
): LiveEventsState {
  const { enabled = true, onEvent } = options;
  const [state, setState] = useState<LiveEventsState>({
    events: [], connected: false, error: null,
  });
  const lastIdRef = useRef(0);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  useEffect(() => {
    if (!enabled || !gameId) return;

    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      es = new EventSource(`/api/games/${gameId}/events?after_id=${lastIdRef.current}`);

      es.onopen = () => {
        setState(prev => ({ ...prev, connected: true, error: null }));
      };

      es.addEventListener("game_event", (e) => {
        try {
          const event: LiveEvent = JSON.parse(e.data);
          if (event.event_id > lastIdRef.current) {
            lastIdRef.current = event.event_id;
          }
          setState(prev => ({
            ...prev,
            events: [...prev.events.slice(-500), event],
          }));
          onEventRef.current?.(event);
        } catch {
          // ignore parse errors
        }
      });

      es.addEventListener("close", () => {
        setState(prev => ({ ...prev, connected: false }));
        es?.close();
      });

      es.onerror = () => {
        setState(prev => ({ ...prev, connected: false, error: "Connection lost" }));
        es?.close();
        reconnectTimer = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      es?.close();
      clearTimeout(reconnectTimer);
    };
  }, [gameId, enabled]);

  return state;
}
