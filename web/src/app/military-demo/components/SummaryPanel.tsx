"use client";

import { useState, useEffect, useMemo } from "react";
import { POWER_DISPLAY_COLORS } from "@/lib/constants";
import { powerFlag } from "@/lib/power-flags";
import { buildSummaryMetricRows } from "./intel/fsb-utils";

/** Deterministic win probability from SC count + momentum. */
function computeWinOdds(
  scHistory: Record<string, number[]>,
  phaseIndex: number,
): { power: string; pct: number }[] {
  const entries = Object.entries(scHistory);
  if (entries.length === 0 || phaseIndex < 0) return [];

  const scores: { power: string; raw: number }[] = [];

  for (const [power, counts] of entries) {
    const current = counts[phaseIndex] ?? 0;
    if (current === 0) {
      scores.push({ power, raw: 0 });
      continue;
    }

    // Momentum: average SC change over the last 3 recorded phases
    const lookback = Math.min(3, phaseIndex);
    let delta = 0;
    if (lookback > 0) {
      delta = (current - (counts[phaseIndex - lookback] ?? current)) / lookback;
    }
    // Clamp momentum factor to ±50%
    const momentumFactor = 1 + Math.max(-0.5, Math.min(0.5, delta / 3));

    // SC share with power-law scaling (compounding advantage)
    const raw = Math.pow(current, 1.5) * momentumFactor;
    scores.push({ power, raw: Math.max(0, raw) });
  }

  const total = scores.reduce((s, e) => s + e.raw, 0);
  if (total === 0) return scores.map(s => ({ power: s.power, pct: 0 }));

  return scores
    .map(s => ({ power: s.power, pct: Math.round((s.raw / total) * 100) }))
    .sort((a, b) => b.pct - a.pct);
}

interface Standing {
  power: string;
  scs: number;
  units: number;
}

interface Eliminated {
  power: string;
  phase: string;
}

interface SummaryData {
  phases: string[];
  scHistory: Record<string, number[]>;
  finalStandings: Standing[];
  eliminated: Eliminated[];
  gameOver: boolean;
}

interface SummaryPanelProps {
  gameId: string;
  currentPhase?: string;
  refreshKey?: number;
  isLive?: boolean;
}

export function SummaryPanel({ gameId, currentPhase, refreshKey = 0, isLive = false }: SummaryPanelProps) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/games/${gameId}/summary`, { cache: "no-store" })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [gameId, refreshKey]);

  // Win odds calculation
  const winOdds = useMemo(() => {
    if (!data) return [];
    const { phases, scHistory } = data;
    const idx = currentPhase ? phases.indexOf(currentPhase) : phases.length - 1;
    return computeWinOdds(scHistory, idx >= 0 ? idx : phases.length - 1);
  }, [data, currentPhase]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-[#808080]">
        <div className="text-2xl mb-2">◈</div>
        <div className="text-sm uppercase tracking-wider">Loading...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-32 text-[#808080]">
        <div className="text-2xl mb-2">◈</div>
        <div className="text-sm uppercase tracking-wider">No Data</div>
      </div>
    );
  }

  const { phases, scHistory, finalStandings, eliminated } = data;
  const winner = finalStandings.find(s => s.scs >= 18);
  const oddsByPower = new Map(winOdds.map((entry) => [entry.power, entry.pct]));
  const metricRows = buildSummaryMetricRows({
    phases,
    finalStandings,
    eliminated,
    winOdds,
    isLive,
  });

  const toneStyles = {
    ok: "text-[#4a7c59]",
    warn: "text-[#ff9500]",
    neutral: "text-[#808080]",
    accent: "text-[#ff9500]",
  } as const;

  return (
    <div className="space-y-3 text-xs" role="region" aria-label="Summary panel">
      <div className="border border-[#3a3a3a] bg-[#0f0f0f]" role="table" aria-label="Operational snapshot">
        <div className="flex items-center justify-between border-b border-[#3a3a3a] bg-[#181818] px-2 py-1.5">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#808080]">Operational Snapshot</span>
          {winner ? (
            <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: POWER_DISPLAY_COLORS[winner.power] }}>
              {winner.power} Victory
            </span>
          ) : (
            <span className={`text-[10px] font-bold uppercase tracking-wider ${isLive ? "text-[#4a7c59]" : "text-[#808080]"}`}>
              {isLive ? "In Progress" : "Game Over"}
            </span>
          )}
        </div>
        <div className="divide-y divide-[#252525]" role="rowgroup">
          {metricRows.map((row) => (
            <div key={row.key} className="grid grid-cols-[1fr_1fr] items-center px-2 py-1.5" role="row">
              <span className="text-[10px] uppercase tracking-wider text-[#808080]" role="cell">{row.metric}</span>
              <span className={`text-right font-mono font-semibold ${toneStyles[row.tone]}`} role="cell">{row.value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-[#3a3a3a] bg-[#0f0f0f]" role="table" aria-label={isLive ? "Current standings" : "Final standings"}>
        <div className="border-b border-[#3a3a3a] bg-[#181818] px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#808080]">
          {isLive ? "Current Standings" : "Final Standings"}
        </div>
        <div className="grid grid-cols-[1.3fr_0.6fr_0.7fr_0.7fr_0.8fr] border-b border-[#3a3a3a] bg-[#141414] text-[10px] font-bold uppercase tracking-wider text-[#808080]" role="row">
          <div className="px-2 py-1.5" role="columnheader">Power</div>
          <div className="px-2 py-1.5" role="columnheader">Rank</div>
          <div className="px-2 py-1.5" role="columnheader">SC</div>
          <div className="px-2 py-1.5" role="columnheader">Units</div>
          <div className="px-2 py-1.5" role="columnheader">Odds</div>
        </div>
        <div className="divide-y divide-[#252525]" role="rowgroup">
          {finalStandings.map((s, i) => {
            const color = POWER_DISPLAY_COLORS[s.power] || "#808080";
            const isEliminated = s.scs === 0;
            const odds = oddsByPower.get(s.power) ?? 0;
            return (
              <div key={s.power} className="grid grid-cols-[1.3fr_0.6fr_0.7fr_0.7fr_0.8fr] items-center text-[11px]" role="row" aria-label={`${s.power} rank ${i + 1}, ${s.scs} supply centers, ${s.units} units, ${odds} percent odds`}>
                <div className="px-2 py-1.5 flex items-center gap-1.5 min-w-0" role="cell">
                  <span className="text-base">{powerFlag(s.power)}</span>
                  <span
                    className={`font-semibold truncate ${isEliminated ? "line-through text-[#666]" : ""}`}
                    style={{ color: isEliminated ? "#666" : color }}
                    title={s.power}
                  >
                    {s.power}
                  </span>
                </div>
                <div className="px-2 py-1.5 text-[#888] font-mono" role="cell">{i + 1}</div>
                <div className={`px-2 py-1.5 font-mono font-semibold ${isEliminated ? "text-[#666]" : "text-[#ff9500]"}`} role="cell">{s.scs}</div>
                <div className={`px-2 py-1.5 font-mono ${isEliminated ? "text-[#666]" : "text-[#c0c0c0]"}`} role="cell">{s.units}</div>
                <div className={`px-2 py-1.5 font-mono ${odds > 0 ? "text-[#4a7c59]" : "text-[#666]"}`} role="cell">{odds}%</div>
              </div>
            );
          })}
        </div>
      </div>

      {eliminated.length > 0 && (
        <div className="border border-[#3a3a3a] bg-[#0f0f0f]" role="table" aria-label="Eliminated powers">
          <div className="border-b border-[#3a3a3a] bg-[#181818] px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#808080]">
            Eliminated Powers
          </div>
          <div className="grid grid-cols-[1.4fr_1fr] border-b border-[#2a2a2a] bg-[#141414] text-[10px] font-bold uppercase tracking-wider text-[#808080]" role="row">
            <div className="px-2 py-1.5" role="columnheader">Power</div>
            <div className="px-2 py-1.5" role="columnheader">Phase</div>
          </div>
          <div className="divide-y divide-[#252525]" role="rowgroup">
            {eliminated.map((entry) => (
              <div key={entry.power} className="grid grid-cols-[1.4fr_1fr] items-center text-[11px]" role="row">
                <div className="px-2 py-1.5 flex items-center gap-1.5 text-[#888]" role="cell">
                  <span className="text-base">{powerFlag(entry.power)}</span>
                  <span className="font-semibold">{entry.power}</span>
                </div>
                <div className="px-2 py-1.5 font-mono text-[#666]" role="cell">{entry.phase}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!winner && winOdds.length > 0 && winOdds.some(o => o.pct > 0) && (
        <div className="border border-[#3a3a3a] bg-[#0f0f0f]" role="table" aria-label="Win probability">
          <div className="border-b border-[#3a3a3a] bg-[#181818] px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#808080]">
            Win Probability
          </div>
          <div className="grid grid-cols-[1.2fr_0.8fr] border-b border-[#2a2a2a] bg-[#141414] text-[10px] font-bold uppercase tracking-wider text-[#808080]" role="row">
            <div className="px-2 py-1.5" role="columnheader">Power</div>
            <div className="px-2 py-1.5" role="columnheader">Chance</div>
          </div>
          <div className="divide-y divide-[#252525]" role="rowgroup">
            {winOdds.filter(o => o.pct > 0).map(({ power, pct }) => {
              const color = POWER_DISPLAY_COLORS[power] || "#808080";
              return (
                <div key={power} className="grid grid-cols-[1.2fr_0.8fr] items-center text-[11px]" role="row">
                  <div className="px-2 py-1.5 flex items-center gap-1.5" role="cell">
                    <span className="text-base">{powerFlag(power)}</span>
                    <span className="font-semibold" style={{ color }}>{power}</span>
                  </div>
                  <div className="px-2 py-1.5 font-mono font-semibold text-[#ff9500]" role="cell">{pct}%</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {phases.length >= 2 && (
        <div className="border border-[#3a3a3a] bg-[#0f0f0f]" role="table" aria-label="Supply center delta latest phase">
          <div className="border-b border-[#3a3a3a] bg-[#181818] px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#808080]">
            SC Delta (Latest)
          </div>
          <div className="grid grid-cols-[1.2fr_0.8fr_0.8fr] border-b border-[#2a2a2a] bg-[#141414] text-[10px] font-bold uppercase tracking-wider text-[#808080]" role="row">
            <div className="px-2 py-1.5" role="columnheader">Power</div>
            <div className="px-2 py-1.5" role="columnheader">Current</div>
            <div className="px-2 py-1.5" role="columnheader">Delta</div>
          </div>
          <div className="divide-y divide-[#252525]" role="rowgroup">
            {finalStandings.map((standing) => {
              const counts = scHistory[standing.power] || [];
              const current = counts[counts.length - 1] ?? 0;
              const prev = counts[counts.length - 2] ?? current;
              const delta = current - prev;
              const deltaColor = delta > 0 ? "text-[#4a7c59]" : (delta < 0 ? "text-[#dc143c]" : "text-[#808080]");
              return (
                <div key={`${standing.power}-delta`} className="grid grid-cols-[1.2fr_0.8fr_0.8fr] items-center text-[11px]" role="row">
                  <div className="px-2 py-1.5 flex items-center gap-1.5" role="cell">
                    <span className="text-base">{powerFlag(standing.power)}</span>
                    <span className="text-[#c0c0c0]">{standing.power}</span>
                  </div>
                  <div className="px-2 py-1.5 font-mono text-[#ff9500]" role="cell">{current}</div>
                  <div className={`px-2 py-1.5 font-mono ${deltaColor}`} role="cell">{delta > 0 ? `+${delta}` : `${delta}`}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
