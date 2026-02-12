"use client";

import { useRef, useState, useMemo, useId } from "react";
import { powerFlag } from "@/lib/power-flags";
import type { Message } from "@/lib/types";
import { buildMessageThreadRows } from "./intel/fsb-utils";

interface MessagePanelProps {
  messages: Message[] | null;
  liveMessages: Message[];
  connected?: boolean;
  livePhase?: string | null;
}

export function MessagePanel({ messages, liveMessages, connected = false, livePhase }: MessagePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const panelId = useId();
  // Track collapsed threads — threads are open by default
  const [collapsedThreads, setCollapsedThreads] = useState<Set<string>>(new Set());

  // Filter messages - ensure messages is an array
  const messageArray = Array.isArray(messages) ? messages : [];

  const threads = useMemo(() => {
    return buildMessageThreadRows(messageArray, liveMessages);
  }, [messageArray, liveMessages]);

  const hasMessages = threads.length > 0;
  const statusStyles = {
    live: "text-[#4a7c59] border-[#4a7c59]/50 bg-[#4a7c59]/12",
    archive: "text-[#808080] border-[#808080]/40 bg-[#808080]/10",
  } as const;

  return (
    <div className="flex flex-col h-full" role="region" aria-label="Messages panel">
      <div ref={scrollRef} className="overflow-auto flex-1 text-xs" role="log" aria-live="polite" aria-relevant="additions text">
        {!hasMessages ? (
          <div className="flex flex-col items-center justify-center h-32 text-[#808080]">
            <div className="text-2xl mb-2">✉</div>
            <div className="text-sm uppercase tracking-wider">No communications</div>
          </div>
        ) : (
          <div className="border border-[#3a3a3a] bg-[#0f0f0f]" role="table" aria-label="Message thread matrix">
            <div className="flex items-center justify-between border-b border-[#3a3a3a] bg-[#181818] px-2 py-1.5 text-[10px] uppercase tracking-wider text-[#808080]">
              <span>Channel Matrix</span>
              <span className={connected ? "text-[#4a7c59]" : "text-[#666]"}>
                {connected ? `Live ${livePhase ?? ""}`.trim() : "Offline"}
              </span>
            </div>

            <div className="grid grid-cols-[1.8fr_0.6fr_1.8fr_0.8fr] border-b border-[#3a3a3a] bg-[#141414] text-[10px] font-bold uppercase tracking-wider text-[#808080]" role="row">
              <div className="px-2 py-1.5" role="columnheader">Thread</div>
              <div className="px-2 py-1.5" role="columnheader">Msgs</div>
              <div className="px-2 py-1.5" role="columnheader">Last Transmission</div>
              <div className="px-2 py-1.5" role="columnheader">Status</div>
            </div>

            {threads.map((thread) => {
              const isExpanded = !collapsedThreads.has(thread.key);
              const [p1, p2] = thread.powers;
              const rowStatus = statusStyles[thread.status];
              const detailsId = `${panelId}-${thread.key.replace(/[^a-zA-Z0-9_-]/g, "_")}`;

              return (
                <div key={thread.key} className="border-b border-[#2a2a2a] last:border-b-0" role="rowgroup">
                  <button
                    onClick={() => setCollapsedThreads((prev) => {
                      const next = new Set(prev);
                      if (isExpanded) next.add(thread.key);
                      else next.delete(thread.key);
                      return next;
                    })}
                    className="w-full grid grid-cols-[1.8fr_0.6fr_1.8fr_0.8fr] items-center text-left hover:bg-[#1b1b1b] transition-colors"
                    role="row"
                    aria-expanded={isExpanded}
                    aria-controls={detailsId}
                    aria-label={`${p1} to ${p2}, ${thread.count} messages, status ${thread.status}`}
                  >
                    <div className="px-2 py-1.5 flex items-center gap-2 min-w-0" role="cell">
                      <span className="text-base">{powerFlag(p1)}</span>
                      <span className="text-[#4a4a4a]">↔</span>
                      <span className="text-base">{powerFlag(p2)}</span>
                      <span className="text-[10px] text-[#666] font-mono truncate">
                        {p1.slice(0, 3)}-{p2.slice(0, 3)}
                      </span>
                    </div>
                    <div className="px-2 py-1.5 text-[#b0b0b0] font-mono" role="cell">{thread.count}</div>
                    <div className="px-2 py-1.5 text-[#d0d0d0] truncate" role="cell">
                      {isExpanded ? `${thread.messages[thread.messages.length - 1]?.sender ?? ""} > ${thread.messages[thread.messages.length - 1]?.recipient ?? ""}` : thread.preview}
                    </div>
                    <div className="px-2 py-1.5" role="cell">
                      <span className={`inline-flex min-w-[58px] justify-center rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${rowStatus}`}>
                        {thread.status}
                      </span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div id={detailsId} className="bg-[#101010] border-t border-[#2a2a2a]" role="table" aria-label={`Messages for ${p1} and ${p2}`}>
                      <div className="grid grid-cols-[1.2fr_2.2fr_0.8fr] border-b border-[#2a2a2a] bg-[#151515] text-[10px] font-semibold uppercase tracking-wide text-[#666]" role="row">
                        <div className="px-2 py-1" role="columnheader">Route</div>
                        <div className="px-2 py-1" role="columnheader">Message</div>
                        <div className="px-2 py-1" role="columnheader">Time</div>
                      </div>
                      {thread.messages.map((msg, i) => (
                        <div key={`${thread.key}-message-${i}`} className="grid grid-cols-[1.2fr_2.2fr_0.8fr] border-b border-[#1f1f1f] text-[11px] last:border-b-0" role="row">
                          <div className="px-2 py-1.5 text-[#c0c0c0] font-mono" role="cell">
                            {msg.sender.slice(0, 3)}→{msg.recipient.slice(0, 3)}
                          </div>
                          <div className="px-2 py-1.5 text-[#dcdcdc]" role="cell">{msg.message}</div>
                          <div className={`px-2 py-1.5 font-mono ${msg.isLive ? "text-[#4a7c59]" : "text-[#888]"}`} role="cell">
                            {msg.isLive ? "LIVE" : msg.phase}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
