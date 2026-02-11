"use client";

import { useState, useEffect } from "react";
import type { GameState, PhaseOrders, PhaseResults, PhaseMessages } from "@/lib/types";

interface PhaseData {
  state: GameState | null;
  orders: PhaseOrders | null;
  results: PhaseResults | null;
  messages: PhaseMessages | null;
  loading: boolean;
  error: string | null;
}

export function useGameData(gameId: string, phase: string | null, refreshKey: number = 0): PhaseData {
  const [data, setData] = useState<PhaseData>({
    state: null, orders: null, results: null, messages: null,
    loading: true, error: null,
  });

  useEffect(() => {
    if (!gameId || !phase) {
      setData(prev => ({ ...prev, loading: false }));
      return;
    }

    let cancelled = false;
    setData(prev => ({ ...prev, loading: true, error: null }));

    const base = `/api/games/${gameId}/phases/${phase}`;
    const opts = { signal: AbortSignal.timeout(10_000) };
    Promise.all([
      fetch(`${base}/state`, opts).then(r => r.ok ? r.json() : null),
      fetch(`${base}/orders`, opts).then(r => r.ok ? r.json() : null),
      fetch(`${base}/results`, opts).then(r => r.ok ? r.json() : null),
      fetch(`${base}/messages`, opts).then(r => r.ok ? r.json() : null),
    ]).then(([state, orders, results, messages]) => {
      if (!cancelled) {
        setData({ state, orders, results, messages, loading: false, error: null });
      }
    }).catch(err => {
      if (!cancelled) {
        setData(prev => ({ ...prev, loading: false, error: err.message }));
      }
    });

    return () => { cancelled = true; };
  }, [gameId, phase, refreshKey]);

  return data;
}

export function useMemory(gameId: string, power: string, phase?: string, refreshKey: number = 0) {
  const [content, setContent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!gameId || !power) return;
    setLoading(true);
    const url = `/api/games/${gameId}/memory/${power}${phase ? `?phase=${phase}` : ""}`;
    fetch(url, { signal: AbortSignal.timeout(10_000) })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        setContent(data?.content || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [gameId, power, phase, refreshKey]);

  return { content, loading };
}
