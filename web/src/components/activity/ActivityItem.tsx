"use client";

import { useState } from "react";
import PowerBadge from "../power/PowerBadge";
import { phaseDisplayName } from "@/lib/constants";
import { parseOrder, humanizeOrder } from "@/lib/parse-orders";
import type { LiveEvent } from "@/lib/types";

interface Props {
  event: LiveEvent;
}

// Event types we know how to render; everything else is skipped
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
]);

export function shouldRender(event: LiveEvent): boolean {
  return RENDERED_TYPES.has(event.event_type);
}

export default function ActivityItem({ event }: Props) {
  const [expanded, setExpanded] = useState(false);
  const p = event.payload as Record<string, unknown>;

  switch (event.event_type) {
    case "phase.start": {
      const label = event.phase
        ? `${event.phase} ${phaseDisplayName(event.phase).split(" ").pop()}`
        : "New Phase";
      return (
        <div className="text-center text-gray-500 text-xs py-2 border-b border-gray-800/50">
          --- {label} ---
        </div>
      );
    }

    case "step.start": {
      const stepLabels: Record<string, string> = {
        strategize: "Strategizing...",
        converse: "Conversing...",
        decide: "Deciding...",
      };
      const label = stepLabels[event.step || ""] || (p.summary as string) || event.step || "Processing...";
      return (
        <div className="px-2 py-1 text-xs text-gray-400 italic">
          {label}
        </div>
      );
    }

    case "agent.repl": {
      const text = (p.text as string) || (p.summary as string) || "";
      // Detect model failure pattern: writing markdown plans instead of executing code
      const hasMarkdownHeadings = /^#{1,3}\s/m.test(text);
      const hasCodeBlocks = /```python/i.test(text);
      const isMalformed = hasMarkdownHeadings && hasCodeBlocks;
      // Extract first meaningful line for preview
      const firstLine = text.split("\n").find(l => l.trim().length > 0)?.trim() || "REPL output";
      const preview = firstLine.length > 60 ? firstLine.slice(0, 60) + "..." : firstLine;
      return (
        <div className="px-2 py-1.5 text-xs">
          <div
            className="flex items-center gap-1.5 cursor-pointer hover:bg-gray-800/30 rounded px-1 -mx-1 py-0.5"
            onClick={() => setExpanded(!expanded)}
          >
            {event.power && <PowerBadge power={event.power} size="sm" />}
            <span className={isMalformed ? "text-red-400" : "text-gray-500"}>
              {isMalformed ? "REPL (malformed)" : "REPL"}
            </span>
            <span className="text-gray-600 truncate flex-1">{preview}</span>
            <span className="text-gray-600 text-[10px]">{expanded ? "▾" : "▸"}</span>
          </div>
          {expanded && (
            <pre className={`mt-1 border rounded px-2 py-1.5 font-mono text-[11px] whitespace-pre-wrap overflow-x-auto max-h-60 overflow-y-auto ${
              isMalformed
                ? "bg-red-950/30 border-red-900/50 text-red-200"
                : "bg-gray-900 border-gray-800 text-gray-300"
            }`}>
              {text}
            </pre>
          )}
        </div>
      );
    }

    case "agent.prompt": {
      const text = (p.text as string) || (p.summary as string) || "";
      const preview = text.length > 120 ? text.slice(0, 120) + "..." : text;
      return (
        <div className="px-2 py-1.5 text-xs">
          <div className="flex items-center gap-1.5 mb-1">
            {event.power && <PowerBadge power={event.power} size="sm" />}
            <span className="text-gray-500">prompt</span>
          </div>
          <div
            className="text-gray-400 cursor-pointer hover:text-gray-300"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? (
              <pre className="whitespace-pre-wrap font-mono text-[11px] bg-gray-900 border border-gray-800 rounded px-2 py-1.5 max-h-60 overflow-y-auto">
                {text}
              </pre>
            ) : (
              <span className="truncate block">{preview}</span>
            )}
          </div>
        </div>
      );
    }

    case "orders.submitted": {
      const orders = (p.orders as string[]) || [];
      const summary = (p.summary as string) || "";
      return (
        <div className="px-2 py-1.5 text-xs">
          <div className="flex items-center gap-1.5 mb-1">
            {event.power && <PowerBadge power={event.power} size="sm" />}
            <span className="text-green-400">orders submitted</span>
          </div>
          {orders.length > 0 ? (
            <ul className="pl-4 text-gray-300 text-[11px] list-disc">
              {orders.map((o, i) => {
                const parsed = parseOrder(o);
                return (
                  <li key={i} title={o}>
                    {parsed ? humanizeOrder(parsed) : o}
                  </li>
                );
              })}
            </ul>
          ) : (
            summary && <div className="text-gray-400 pl-2">{summary}</div>
          )}
        </div>
      );
    }

    case "orders.defaulted": {
      const summary = (p.summary as string) || "default: hold/disband/waive";
      return (
        <div className="px-2 py-1.5 text-xs">
          <div className="flex items-center gap-1.5">
            {event.power && <PowerBadge power={event.power} size="sm" />}
            <span className="text-yellow-500">{summary}</span>
          </div>
        </div>
      );
    }

    case "conversation.agent.start": {
      const partners = (p.partners as string[]) || [];
      const summary = (p.summary as string) || "";
      const label =
        event.power && partners.length > 0
          ? `${event.power} negotiating with ${partners.join(", ")}`
          : summary || "Conversation started";
      return (
        <div className="px-2 py-1.5 text-xs text-blue-300">
          {label}
        </div>
      );
    }

    case "message.flushed": {
      const sender = (p.sender as string) || event.power || "?";
      const recipient = (p.recipient as string) || "?";
      const content = (p.message as string) || (p.summary as string) || "";
      const preview = content.length > 80 ? content.slice(0, 80) + "..." : content;
      return (
        <div className="px-2 py-1.5 text-xs">
          <div className="flex items-center gap-1.5">
            <PowerBadge power={sender} size="sm" />
            <span className="text-gray-500">&rarr;</span>
            <PowerBadge power={recipient} size="sm" />
          </div>
          <div className="ml-4 mt-0.5 text-gray-400 italic truncate">{preview}</div>
        </div>
      );
    }

    case "conversation.agent.finish": {
      const summary = (p.summary as string) || "Conversation complete";
      return (
        <div className="px-2 py-1.5 text-xs text-gray-400">
          {summary}
        </div>
      );
    }

    case "memory.changed": {
      return (
        <div className="px-2 py-1.5 text-xs">
          <div className="flex items-center gap-1.5">
            {event.power && <PowerBadge power={event.power} size="sm" />}
            <span className="text-purple-400">memory updated</span>
          </div>
        </div>
      );
    }

    case "agent.error": {
      const message = (p.error as string) || (p.summary as string) || "Unknown error";
      return (
        <div className="px-2 py-1.5 text-xs">
          <div className="flex items-center gap-1.5 mb-1">
            {event.power && <PowerBadge power={event.power} size="sm" />}
            <span className="text-red-400 font-medium">error</span>
          </div>
          <div className="text-red-400 pl-2">{message}</div>
        </div>
      );
    }

    case "step.timeout": {
      const summary = (p.summary as string) || "Step timed out";
      return (
        <div className="px-2 py-1.5 text-xs">
          <div className="flex items-center gap-1.5">
            {event.power && <PowerBadge power={event.power} size="sm" />}
            <span className="text-orange-400 font-medium">{summary}</span>
          </div>
        </div>
      );
    }

    default:
      return null;
  }
}
