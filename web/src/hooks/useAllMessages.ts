"use client";

import { useState, useEffect } from "react";
import type { Message } from "@/lib/types";

export function useAllMessages(gameId: string, refreshKey: number = 0) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    fetch(`/api/games/${gameId}/messages`, { signal: AbortSignal.timeout(10_000) })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: Message[]) => {
        if (!cancelled) {
          setMessages(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [gameId, refreshKey]);

  return { messages, loading };
}
