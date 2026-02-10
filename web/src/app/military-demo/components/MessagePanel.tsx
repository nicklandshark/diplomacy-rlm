"use client";

import { useRef, useEffect } from "react";
import { MessageBubble } from "@/app/military-ui-kit/components";
import type { Message } from "@/lib/types";

interface MessagePanelProps {
  messages: Message[] | null;
  liveMessages: Message[];
}

export function MessagePanel({ messages, liveMessages }: MessagePanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Filter messages - ensure messages is an array
  const messageArray = Array.isArray(messages) ? messages : [];

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messageArray, liveMessages]);

  const hasMessages = messageArray.length > 0 || liveMessages.length > 0;

  if (!hasMessages) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-[#808080]">
        <div className="text-2xl mb-2">✉</div>
        <div className="text-sm uppercase tracking-wider">No communications</div>
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="p-2 space-y-3" style={{ scrollbarWidth: 'thin', scrollbarColor: '#3a3a3a transparent' }}>
      {messageArray.length > 0 && (
        <div className="space-y-2">
          {messageArray
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

      {liveMessages.length > 0 && (
        <>
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

          <div className="space-y-2">
            {liveMessages.map((msg, idx) => (
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
    </div>
  );
}
