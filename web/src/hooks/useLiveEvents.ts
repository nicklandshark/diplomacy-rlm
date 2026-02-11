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

const RECONNECT_DELAY_MS = 2000;
const MAX_RECONNECT_DELAY_MS = 30000;
const MAX_RETRIES = Infinity; // SSE should reconnect as long as the page is open

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
    let retryCount = 0;
    let disposed = false;

    function connect() {
      if (disposed) return;

      es = new EventSource(`/api/games/${gameId}/events?after_id=${lastIdRef.current}`);

      es.onopen = () => {
        retryCount = 0;
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
        es?.close();

        if (disposed) return;

        retryCount += 1;
        if (retryCount > MAX_RETRIES) {
          setState(prev => ({
            ...prev,
            connected: false,
            error: `Connection lost after ${MAX_RETRIES} retries`,
          }));
          return;
        }

        const delay = Math.min(RECONNECT_DELAY_MS * Math.pow(1.5, retryCount - 1), MAX_RECONNECT_DELAY_MS);
        setState(prev => ({ ...prev, connected: false, error: "Reconnecting..." }));
        reconnectTimer = setTimeout(connect, delay);
      };
    }

    connect();

    return () => {
      disposed = true;
      es?.close();
      clearTimeout(reconnectTimer);
    };
  }, [gameId, enabled]);

  return state;
}
