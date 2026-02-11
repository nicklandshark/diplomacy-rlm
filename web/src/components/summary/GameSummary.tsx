"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import ReactMarkdown from "react-markdown";
import { POWER_DISPLAY_COLORS, phaseDisplayName } from "@/lib/constants";
import { powerFlag } from "@/lib/power-flags";

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

interface Props {
  gameId: string;
  currentPhase?: string;
  refreshKey?: number;
  isLive?: boolean;
}

export default function GameSummary({ gameId, currentPhase, refreshKey = 0, isLive = false }: Props) {
  const [data, setData] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiCached, setAiCached] = useState(false);
  const [aiPhase, setAiPhase] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/games/${gameId}/summary`, { cache: "no-store", signal: AbortSignal.timeout(10_000) })
      .then(r => r.ok ? r.json() : null)
      .then(d => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [gameId, refreshKey]);

  // Auto-generate AI summary when phase changes (returns cached if available)
  useEffect(() => {
    if (!currentPhase) return;
    let cancelled = false;
    setAiError(null);
    setAiLoading(true);
    fetch(`/api/games/${gameId}/ai-summary?phase=${encodeURIComponent(currentPhase)}`, { signal: AbortSignal.timeout(30_000) })
      .then(r => {
        if (!r.ok) return r.json().then(e => { throw new Error(e.error || "Failed"); });
        return r.json();
      })
      .then(d => {
        if (cancelled) return;
        setAiSummary(d.summary);
        setAiCached(d.cached);
        setAiPhase(d.phase);
        setAiLoading(false);
      })
      .catch(err => {
        if (cancelled) return;
        setAiError(err.message || "Failed to generate summary");
        setAiLoading(false);
      });
    return () => { cancelled = true; };
  }, [gameId, currentPhase]);

  const generateSummary = useCallback((force = false) => {
    if (!currentPhase || aiLoading) return;
    setAiLoading(true);
    setAiError(null);
    const forceParam = force ? "&force=true" : "";
    fetch(`/api/games/${gameId}/ai-summary?phase=${encodeURIComponent(currentPhase)}${forceParam}`, { signal: AbortSignal.timeout(30_000) })
      .then(r => {
        if (!r.ok) return r.json().then(e => { throw new Error(e.error || "Failed"); });
        return r.json();
      })
      .then(d => {
        setAiSummary(d.summary);
        setAiCached(d.cached);
        setAiPhase(d.phase);
        setAiLoading(false);
      })
      .catch(err => {
        setAiError(err.message || "Failed to generate summary");
        setAiLoading(false);
      });
  }, [gameId, currentPhase, aiLoading]);

  // Deterministic win odds from SC data (must be before early returns)
  const winOdds = useMemo(() => {
    if (!data) return [];
    const { phases, scHistory } = data;
    const idx = currentPhase ? phases.indexOf(currentPhase) : phases.length - 1;
    return computeWinOdds(scHistory, idx >= 0 ? idx : phases.length - 1);
  }, [data, currentPhase]);

  if (loading) return <div className="text-gray-500 text-xs p-4">Loading summary...</div>;
  if (!data) return <div className="text-gray-500 text-xs p-4">No summary available.</div>;

  const { phases, scHistory, finalStandings, eliminated } = data;
  const winner = finalStandings.find(s => s.scs >= 18);
  const maxSC = Math.max(...finalStandings.map(s => s.scs));
  const inProgress = isLive;

  return (
    <div className="p-3 text-sm space-y-4">
      {/* Result header */}
      <div className="text-center">
        {winner ? (
          <div>
            <span className="text-lg">{powerFlag(winner.power)}</span>
            <div className="text-base font-semibold mt-1" style={{ color: POWER_DISPLAY_COLORS[winner.power] }}>
              {winner.power} Victory
            </div>
            <div className="text-xs text-gray-500">{winner.scs} supply centers</div>
          </div>
        ) : inProgress ? (
          <div>
            <div className="text-base font-semibold text-blue-400">In Progress</div>
            <div className="text-xs text-gray-500">{phases.length} phases so far</div>
          </div>
        ) : (
          <div>
            <div className="text-base font-semibold text-gray-300">Game Over</div>
            <div className="text-xs text-gray-500">{phases.length} phases played</div>
          </div>
        )}
      </div>

      {/* Final standings */}
      <div>
        <div className="text-xs text-gray-500 font-medium mb-1.5">{inProgress ? "Current Standings" : "Final Standings"}</div>
        <div className="space-y-1">
          {finalStandings.map((s, i) => {
            const barWidth = maxSC > 0 ? (s.scs / maxSC) * 100 : 0;
            const color = POWER_DISPLAY_COLORS[s.power] || "#999";
            const isEliminated = s.scs === 0;
            return (
              <div key={s.power} className="flex items-center gap-2">
                <span className="text-xs text-gray-600 w-3 text-right">{i + 1}</span>
                <span className="text-sm flex-shrink-0">{powerFlag(s.power)}</span>
                <span className={`text-xs w-14 truncate ${isEliminated ? "text-gray-600 line-through" : "text-gray-300"}`}>
                  {s.power.slice(0, 7)}
                </span>
                <div className="flex-1 h-3 bg-gray-800 rounded overflow-hidden">
                  <div
                    className="h-full rounded transition-all"
                    style={{ width: `${barWidth}%`, backgroundColor: color }}
                  />
                </div>
                <span className={`text-xs w-6 text-right font-mono ${isEliminated ? "text-gray-600" : "text-gray-300"}`}>
                  {s.scs}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* SC History sparklines */}
      {phases.length >= 2 && (
        <div>
          <div className="text-xs text-gray-500 font-medium mb-1.5">SC Progression</div>
          <div className="space-y-1">
            {finalStandings.filter(s => scHistory[s.power]?.some(c => c > 0)).map(s => {
              const counts = scHistory[s.power] || [];
              const color = POWER_DISPLAY_COLORS[s.power] || "#999";
              const max = Math.max(...Object.values(scHistory).flat());
              // Mini sparkline
              const W = 120;
              const H = 16;
              const points = counts.map((v, i) =>
                `${(i / (counts.length - 1)) * W},${H - (v / max) * H}`
              ).join(" ");
              return (
                <div key={s.power} className="flex items-center gap-2">
                  <span className="text-sm flex-shrink-0">{powerFlag(s.power)}</span>
                  <svg viewBox={`0 0 ${W} ${H}`} className="flex-1 h-4" preserveAspectRatio="none">
                    <polyline
                      points={points}
                      fill="none"
                      stroke={color}
                      strokeWidth={1.5}
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="text-[10px] text-gray-500 w-4 text-right">{counts[counts.length - 1]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Eliminations */}
      {eliminated.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 font-medium mb-1.5">Eliminated</div>
          <div className="space-y-0.5">
            {eliminated.map(e => (
              <div key={e.power} className="flex items-center gap-1.5 text-xs text-gray-500">
                <span>{powerFlag(e.power)}</span>
                <span className="text-gray-600">{e.power}</span>
                <span className="text-gray-700 ml-auto">{e.phase}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Analysis */}
      <div className="border-t border-gray-800 pt-3">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs text-gray-500 font-medium">AI Analysis</div>
          {aiSummary && aiPhase === currentPhase && !aiLoading && (
            <button
              onClick={() => generateSummary(true)}
              className="text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
            >
              Regenerate
            </button>
          )}
        </div>

        {aiLoading && (
          <div className="flex items-center gap-2 text-xs text-gray-500 py-2">
            <span className="inline-block w-3 h-3 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            Analyzing game state...
          </div>
        )}

        {aiError && (
          <div className="text-xs text-red-400/80 bg-red-900/20 rounded px-2 py-1.5">
            {aiError}
          </div>
        )}

        {aiSummary && aiPhase === currentPhase && !aiLoading && (
          <div className="text-xs text-gray-300 leading-relaxed prose-summary">
            <ReactMarkdown>{aiSummary}</ReactMarkdown>
          </div>
        )}
      </div>

      {/* Win Odds */}
      {!winner && winOdds.length > 0 && winOdds.some(o => o.pct > 0) && (
        <div className="border-t border-gray-800 pt-3">
          <div className="text-xs text-gray-500 font-medium mb-2">Win Probability</div>
          <div className="space-y-1">
            {winOdds.filter(o => o.pct > 0).map(({ power, pct }) => {
              const color = POWER_DISPLAY_COLORS[power] || "#999";
              return (
                <div key={power} className="flex items-center gap-1.5">
                  <span className="text-sm flex-shrink-0">{powerFlag(power)}</span>
                  <div className="flex-1 h-4 bg-gray-800 rounded overflow-hidden relative">
                    <div
                      className="h-full rounded transition-all duration-500"
                      style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.7 }}
                    />
                    <span className="absolute inset-0 flex items-center px-1.5 text-[10px] font-mono text-gray-200">
                      {power.slice(0, 3)} {pct}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="text-[10px] text-gray-700 mt-1.5 italic">
            Based on SC count + momentum
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="text-[10px] text-gray-600 pt-2 border-t border-gray-800">
        {phases.length} phases &middot; {finalStandings.filter(s => s.scs > 0).length} surviving powers
      </div>
    </div>
  );
}
