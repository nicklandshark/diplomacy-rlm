"use client";

import { useState, useMemo } from "react";
import type { Message } from "@/lib/types";
import MessageBubble from "./MessageBubble";
import { POWER_DISPLAY_COLORS } from "@/lib/constants";
import { powerFlag } from "@/lib/power-flags";

interface Props {
  messages: Message[];
  liveMessages?: Message[];
}

/** Canonical key for a conversation pair (alphabetical so A→B and B→A share a thread) */
function threadKey(a: string, b: string): string {
  return [a, b].sort().join("↔");
}

interface Thread {
  key: string;
  powers: [string, string];
  messages: (Message & { isLive?: boolean })[];
}

export default function MessageList({ messages, liveMessages }: Props) {
  const [expandedThread, setExpandedThread] = useState<string | null>(null);

  const threads = useMemo(() => {
    const map = new Map<string, Thread>();

    function addMsg(msg: Message, isLive?: boolean) {
      const key = threadKey(msg.sender, msg.recipient);
      if (!map.has(key)) {
        const powers = [msg.sender, msg.recipient].sort() as [string, string];
        map.set(key, { key, powers, messages: [] });
      }
      map.get(key)!.messages.push({ ...msg, isLive });
    }

    for (const msg of messages || []) addMsg(msg);
    for (const msg of liveMessages || []) addMsg(msg, true);

    // Sort threads by most recent message (last message in thread)
    return Array.from(map.values()).sort((a, b) => {
      const aLast = a.messages[a.messages.length - 1];
      const bLast = b.messages[b.messages.length - 1];
      const aLive = aLast.isLive ? 1 : 0;
      const bLive = bLast.isLive ? 1 : 0;
      if (aLive !== bLive) return bLive - aLive; // live threads first
      return 0; // preserve insertion order otherwise
    });
  }, [messages, liveMessages]);

  if (threads.length === 0) {
    return <div className="text-gray-500 text-sm p-4">No messages yet.</div>;
  }

  // If only one thread, show it expanded by default
  const singleThread = threads.length === 1;

  return (
    <div className="font-ui-orders flex flex-col">
      {threads.map(thread => {
        const isExpanded = singleThread || expandedThread === thread.key;
        const [p1, p2] = thread.powers;
        const color1 = POWER_DISPLAY_COLORS[p1] || "#999";
        const color2 = POWER_DISPLAY_COLORS[p2] || "#999";
        const msgCount = thread.messages.length;
        const hasLive = thread.messages.some(m => m.isLive);
        const lastMsg = thread.messages[msgCount - 1];
        const lastPhase = lastMsg.phase;
        const preview = lastMsg.message.length > 60
          ? lastMsg.message.slice(0, 60) + "..."
          : lastMsg.message;

        return (
          <div key={thread.key}>
            {/* Thread header */}
            <button
              onClick={() => setExpandedThread(isExpanded && !singleThread ? null : thread.key)}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 hover:bg-gray-800/50 transition-colors border-b border-gray-800/50"
            >
              <span className="text-sm">{powerFlag(p1)}</span>
              <span className="text-[10px] text-gray-600">&harr;</span>
              <span className="text-sm">{powerFlag(p2)}</span>

              <span className="text-[10px] text-gray-500 ml-1">{msgCount}</span>

              {hasLive && (
                <span className="text-[10px] text-blue-400">LIVE</span>
              )}

              {!isExpanded && (
                <span className="text-[11px] text-gray-500 truncate flex-1 text-left ml-1">
                  {preview}
                </span>
              )}

              {lastPhase && (
                <span className="text-[10px] text-gray-600 ml-auto flex-shrink-0">{lastPhase}</span>
              )}

              <svg
                className={`w-3 h-3 text-gray-600 flex-shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Thread messages */}
            {isExpanded && (
              <div className="flex flex-col gap-1.5 p-2 bg-gray-950/30">
                {thread.messages.map((msg, i) => (
                  <MessageBubble
                    key={i}
                    sender={msg.sender}
                    recipient={msg.recipient}
                    message={msg.message}
                    phase={msg.phase}
                    isLive={msg.isLive}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
