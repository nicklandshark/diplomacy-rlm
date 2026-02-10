"use client";

import { useRef, useEffect, useState } from "react";
import { MessageBubble } from "@/app/military-ui-kit/components";
import { powerFlag } from "@/lib/power-flags";
import type { Message } from "@/lib/types";

interface MessagePanelProps {
  messages: Message[] | null;
  liveMessages: Message[];
  connected?: boolean;
  livePhase?: string | null;
}

export function MessagePanel({ messages, liveMessages, connected = false, livePhase }: MessagePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [filterPower, setFilterPower] = useState<string | null>(null);

  // Filter messages - ensure messages is an array
  const messageArray = Array.isArray(messages) ? messages : [];

  // Get unique powers involved in conversations
  const involvedPowers = Array.from(
    new Set([
      ...messageArray.map(m => m.sender),
      ...messageArray.map(m => m.recipient),
      ...liveMessages.map(m => m.sender),
      ...liveMessages.map(m => m.recipient),
    ])
  ).sort();

  // Filter messages by selected power
  const filteredMessages = filterPower
    ? messageArray.filter(m => m.sender === filterPower || m.recipient === filterPower)
    : messageArray;

  const filteredLiveMessages = filterPower
    ? liveMessages.filter(m => m.sender === filterPower || m.recipient === filterPower)
    : liveMessages;

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [filteredMessages.length, filteredLiveMessages.length]);

  const hasMessages = messageArray.length > 0 || liveMessages.length > 0;
  const messageCount = filteredMessages.length + filteredLiveMessages.length;

  return (
    <div className="flex flex-col h-full">
      {/* Header with power filters */}
      <div className="flex items-center gap-1.5 px-2 py-1 border-b border-[#2a2a2a]">
        <span className="text-xs text-[#808080] flex-shrink-0">Messages</span>
        {connected ? (
          <>
            <span className="w-2 h-2 rounded-full bg-[#4a7c59] flex-shrink-0" />
            {livePhase && (
              <span className="text-[11px] text-[#4a7c59] font-medium flex-shrink-0">{livePhase}</span>
            )}
          </>
        ) : (
          <>
            <span className="w-2 h-2 rounded-full bg-[#666] flex-shrink-0" />
            <span className="text-[11px] text-[#666] flex-shrink-0">
              {messageArray.length} msg{messageArray.length !== 1 ? "s" : ""}
            </span>
          </>
        )}

        {/* Power filter chips */}
        {involvedPowers.length > 0 && (
          <div className="flex items-center gap-1 ml-auto flex-shrink-0">
            {involvedPowers.map((power) => {
              const isActive = filterPower === power;
              const powerMessages = messageArray.filter(
                m => m.sender === power || m.recipient === power
              ).length + liveMessages.filter(
                m => m.sender === power || m.recipient === power
              ).length;

              return (
                <button
                  key={power}
                  onClick={() => setFilterPower(isActive ? null : power)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] transition-all whitespace-nowrap flex-shrink-0 border ${
                    isActive
                      ? "bg-[#2a2a2a] border-[#ff9500]/60"
                      : "bg-[#1a1a1a] border-[#3a3a3a] hover:bg-[#2a2a2a]"
                  }`}
                  title={`${power}: ${powerMessages} messages`}
                >
                  <span className="text-sm">{powerFlag(power)}</span>
                  <span className="text-[#808080]">{power.slice(0, 3)}</span>
                  <span className="text-[#ff9500]">{powerMessages}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Content */}
      <div ref={scrollRef} className="overflow-auto flex-1 text-xs">
        {!hasMessages ? (
          <div className="flex flex-col items-center justify-center h-32 text-[#808080]">
            <div className="text-2xl mb-2">✉</div>
            <div className="text-sm uppercase tracking-wider">No communications</div>
          </div>
        ) : messageCount === 0 && filterPower ? (
          <div className="flex flex-col items-center justify-center h-32 text-[#808080]">
            <div className="text-sm">No messages from/to {filterPower}</div>
          </div>
        ) : (
          <div className="p-2 space-y-3">
            {filteredMessages.length > 0 && (
              <div className="space-y-2">
                {filteredMessages
                  .sort((a, b) => a.phase.localeCompare(b.phase))
                  .map((msg, idx) => (
                    <MessageBubble
                      key={idx}
                      from={msg.sender}
                      to={msg.recipient}
                      content={msg.message}
                      timestamp={msg.phase}
                    />
                  ))}
              </div>
            )}

            {filteredLiveMessages.length > 0 && (
              <>
                {filteredMessages.length > 0 && (
                  <div className="relative py-2">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-[#ff9500]/30" />
                    </div>
                    <div className="relative flex justify-center">
                      <span className="px-2 bg-[#2a2a2a] text-[10px] text-[#ff9500] uppercase tracking-[0.2em] font-bold">
                        Live
                      </span>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  {filteredLiveMessages.map((msg, idx) => (
                    <MessageBubble
                      key={`live-${idx}`}
                      from={msg.sender}
                      to={msg.recipient}
                      content={msg.message}
                      timestamp="LIVE"
                    />
                  ))}
                </div>
              </>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}
