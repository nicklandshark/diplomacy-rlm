"use client";

import { useMemo } from "react";
import type { LiveEvent } from "@/lib/types";
import type { Message } from "@/lib/types";

/**
 * Collect `message.flushed` events into a live messages array.
 *
 * Each `message.flushed` event carries:
 *   - payload.sender     — power name
 *   - payload.recipient  — power name
 *   - payload.content    — message text (when observe_messages is on)
 *   - payload.summary    — fallback text when content is absent
 *   - payload.phase      — phase string
 *
 * Messages are reset whenever a `phase.start` event is encountered,
 * so only the current phase's messages are returned.
 */
export function useLiveMessages(events: LiveEvent[]): Message[] {
  return useMemo(() => {
    let messages: Message[] = [];

    for (const ev of events) {
      if (ev.event_type === "phase.start") {
        messages = [];
        continue;
      }

      if (ev.event_type === "message.flushed") {
        const sender = ev.payload.sender as string | undefined;
        const recipient = ev.payload.recipient as string | undefined;
        const content = ev.payload.content as string | undefined;
        const summary = ev.payload.summary as string | undefined;
        const phase =
          (ev.payload.phase as string | undefined) ?? ev.phase ?? "";

        if (sender && recipient) {
          messages.push({
            sender,
            recipient,
            phase,
            message: content ?? summary ?? "",
          });
        }
      }
    }

    return messages;
  }, [events]);
}
