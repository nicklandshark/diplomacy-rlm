"use client";

import { useMemo } from "react";
import type { LiveEvent } from "@/lib/types";

export interface LiveOrders {
  /** Power name -> accepted order strings (empty array if observe_repl is off). */
  pending: Record<string, string[]>;
  /** Phase string these orders belong to, or null if no phase seen yet. */
  phase: string | null;
}

/**
 * Collect `orders.submitted` events into a pending orders map.
 *
 * Tracks the current phase from the latest `phase.start` event.
 * Orders are cleared whenever the phase changes.
 *
 * The `orders.submitted` event carries:
 *   - event.power        — the power name
 *   - payload.accepted    — string[] of order strings (may be absent)
 *   - payload.summary     — "accepted=N rejected=M" string
 */
export function useLiveOrders(events: LiveEvent[]): LiveOrders {
  return useMemo(() => {
    const pending: Record<string, string[]> = {};
    let phase: string | null = null;

    for (const ev of events) {
      if (ev.event_type === "phase.start") {
        // New phase — reset all pending orders.
        const newPhase = (ev.payload.phase as string) ?? ev.phase;
        if (newPhase && newPhase !== phase) {
          phase = newPhase;
          // Clear any orders from the previous phase.
          for (const key of Object.keys(pending)) {
            delete pending[key];
          }
        }
        continue;
      }

      if (ev.event_type === "orders.submitted" && ev.power) {
        const accepted = ev.payload.accepted as string[] | undefined;
        pending[ev.power] = accepted ?? [];
      }
    }

    return { pending, phase };
  }, [events]);
}
