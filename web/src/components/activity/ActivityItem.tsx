import type { LiveEvent } from "@/lib/types";

// Event types we know how to render; everything else is skipped.
const RENDERED_TYPES = new Set([
  "phase.start",
  "step.start",
  "agent.repl",
  "agent.prompt",
  "orders.submitted",
  "orders.defaulted",
  "conversation.agent.start",
  "message.flushed",
  "conversation.agent.finish",
  "memory.changed",
  "agent.error",
  "step.timeout",
  "game.halt",
  "game.end",
]);

export function shouldRender(event: LiveEvent): boolean {
  return RENDERED_TYPES.has(event.event_type);
}
