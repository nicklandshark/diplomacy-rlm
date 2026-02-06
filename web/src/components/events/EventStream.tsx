"use client";

import { useRef, useEffect } from "react";
import type { LiveEvent } from "@/lib/types";
import EventCard from "./EventCard";

interface Props {
  events: LiveEvent[];
  connected: boolean;
}

export default function EventStream({ events, connected }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [events.length]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-2 py-1 border-b border-gray-800">
        <span className="text-xs text-gray-400">Live Events</span>
        <span className={`w-2 h-2 rounded-full ${connected ? "bg-green-500" : "bg-red-500"}`} />
      </div>
      <div className="overflow-auto flex-1">
        {events.length === 0 && (
          <div className="text-gray-500 text-xs p-4">
            {connected ? "Waiting for events..." : "Not connected to live game."}
          </div>
        )}
        {events.map((event) => (
          <EventCard key={event.event_id} event={event} />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
