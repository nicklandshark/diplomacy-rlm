"use client";

import { useMemo } from "react";
import type { LiveEvent } from "@/lib/types";

export type PowerStatus =
  | "idle"
  | "thinking"
  | "talking"
  | "submitted"
  | "defaulted"
  | "timeout";

/**
 * Reduce an SSE LiveEvent stream into a per-power status map.
 *
 * State machine per power:
 *   idle       — default; reset on `phase.start`
 *   thinking   — `step.start` where step is STRATEGIZE or DECIDE
 *   talking    — `step.start` where step is CONVERSE, or `conversation.agent.start`
 *   submitted  — `orders.submitted` for that power
 *   defaulted  — `orders.defaulted` for that power
 *   timeout    — `step.timeout` where payload.powers includes that power
 *
 * Iterates events backwards so we find the latest relevant event per power
 * without scanning the entire array for powers whose status is already resolved.
 */
export function usePowerStatus(
  events: LiveEvent[],
): Record<string, PowerStatus> {
  return useMemo(() => {
    const status: Record<string, PowerStatus> = {};
    const resolved = new Set<string>();

    for (let i = events.length - 1; i >= 0; i--) {
      const ev = events[i];

      // Once we hit a phase.start, every power not yet resolved is idle.
      if (ev.event_type === "phase.start") {
        break;
      }

      const power = ev.power ?? null;

      switch (ev.event_type) {
        case "orders.submitted": {
          if (power && !resolved.has(power)) {
            status[power] = "submitted";
            resolved.add(power);
          }
          break;
        }
        case "orders.defaulted": {
          if (power && !resolved.has(power)) {
            status[power] = "defaulted";
            resolved.add(power);
          }
          break;
        }
        case "step.timeout": {
          const powers = ev.payload.powers as string[] | undefined;
          if (powers) {
            for (const p of powers) {
              if (!resolved.has(p)) {
                status[p] = "timeout";
                resolved.add(p);
              }
            }
          }
          break;
        }
        case "conversation.agent.start": {
          if (power && !resolved.has(power)) {
            status[power] = "talking";
            resolved.add(power);
          }
          break;
        }
        case "step.start": {
          const step = (ev.payload.step as string) ?? ev.step;
          if (step === "CONVERSE") {
            // All powers enter talking on CONVERSE step start.
            // Only set for powers not already resolved.
            if (power && !resolved.has(power)) {
              status[power] = "talking";
              resolved.add(power);
            }
          } else if (step === "STRATEGIZE" || step === "DECIDE") {
            if (power && !resolved.has(power)) {
              status[power] = "thinking";
              resolved.add(power);
            }
          }
          break;
        }
        default:
          break;
      }
    }

    return status;
  }, [events]);
}
