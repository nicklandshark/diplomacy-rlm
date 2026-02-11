"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import CRTScreenOverlay from "./CRTScreenOverlay";

/* ─── Types (mirrored from /api/agents/leaderboard) ─── */
interface LeaderboardEntry {
  rank: number;
  power: string;
  agentKey: string;
  backend: string;
  model: string;
  scs: number;
  units: number;
  delta: number;
  elo: number | null;
  eloGames: number;
  record: { wins: number; draws: number; losses: number };
}

interface LeaderboardResponse {
  gameId: string | null;
  phase: string | null;
  entries: LeaderboardEntry[];
  eloBase: number;
}

/* ─── Sedona Icon (provided SVG) ─── */
const SedonaIcon = ({ size = 20, color = "#c3ae88" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 22 20" fill="none" xmlns="http://www.w3.org/2000/svg">
    <g clipPath="url(#clip0_sedona)">
      <path d="M2.10018 10.9454C2.20396 10.8342 2.23833 10.6822 2.24933 10.5323C2.26032 10.2764 2.25551 10.0219 2.27201 9.76536C2.58748 5.28827 6.58758 1.90596 11.2056 2.2118C12.4833 2.29643 13.6743 2.65425 14.7225 3.2233C15.0407 3.39521 15.0627 3.83033 14.7623 4.03023L13.4902 4.87381L13.4771 4.88247L18.1755 6.76753C18.1721 6.76086 18.1686 6.7542 18.1645 6.74754L20.6876 7.75836C20.801 7.80368 20.9206 7.71105 20.902 7.59445C20.902 7.59311 20.9013 7.59111 20.9013 7.58978L20.8993 7.58045L19.6346 1.05572C19.6133 0.947769 19.4855 0.896462 19.392 0.958431L17.8112 2.00724C17.5432 2.18582 17.1878 2.18049 16.9253 1.99458C15.3548 0.876472 13.4482 0.163495 11.3602 0.0248975C5.49545 -0.363575 0.41698 3.93094 0.0162825 9.6161C0.00253649 9.93194 -0.0744413 10.3997 0.273333 10.555C0.556502 10.6822 0.874723 10.7982 1.16751 10.9194C1.56202 11.0767 1.8067 11.2106 2.10018 10.9454Z" fill={color}/>
      <path d="M20.9768 9.44559C20.6936 9.31832 20.3754 9.20238 20.0826 9.0811C19.6881 8.92385 19.4434 8.78991 19.1499 9.05512C19.0462 9.16639 19.0118 9.31832 19.0008 9.46824C18.9898 9.72412 18.9946 9.97865 18.9781 10.2352C18.6626 14.7123 14.6625 18.0946 10.0446 17.7887C8.76687 17.7041 7.57577 17.3463 6.52764 16.7773C6.20942 16.6053 6.18742 16.1702 6.48778 15.9703L7.75997 15.1267L7.77303 15.1181L3.07463 13.233C3.07807 13.2397 3.08151 13.2464 3.08563 13.253L0.562545 12.2422C0.449141 12.1969 0.32955 12.2895 0.348107 12.4061C0.348107 12.4074 0.348794 12.4094 0.348794 12.4108L0.350856 12.4201L1.61549 18.9448C1.6368 19.0528 1.76464 19.1041 1.85811 19.0421L3.4389 17.9933C3.70695 17.8147 4.06229 17.8201 4.32484 18.006C5.89532 19.1241 7.8019 19.8371 9.88992 19.9757C15.7547 20.3641 20.8331 16.0696 21.2338 10.3845C21.2476 10.0686 21.3246 9.60084 20.9768 9.44559Z" fill={color}/>
      <path d="M10.71 4.90529C10.2639 7.31809 8.63708 9.39172 6.39029 9.84483C6.36555 9.85216 6.33462 9.85882 6.30094 9.86548C6.19166 9.88614 6.18753 10.0374 6.29613 10.0621C8.68244 10.5971 10.4701 12.6967 10.7519 15.3961C10.7828 15.6326 10.798 15.7166 10.8172 15.6479C10.8364 15.7166 10.8516 15.6326 10.8825 15.3961C11.1643 12.6967 12.952 10.5971 15.3383 10.0621C15.4469 10.0374 15.4427 9.88614 15.3335 9.86548C15.2998 9.85882 15.2689 9.85216 15.2441 9.84483C12.9973 9.39172 11.3705 7.31809 10.9244 4.90529C10.9134 4.84799 10.8653 4.82067 10.8179 4.824C10.7698 4.82067 10.7217 4.84799 10.7114 4.90529H10.71Z" fill={color}/>
      <path d="M10.7974 4.14014L10.8049 4.12148C10.8029 4.04752 10.8015 3.97356 10.8015 3.89893C10.8015 3.97955 10.8001 4.06018 10.7974 4.14014Z" fill={color}/>
    </g>
    <defs>
      <clipPath id="clip0_sedona">
        <rect width="21.25" height="20" fill="white"/>
      </clipPath>
    </defs>
  </svg>
);

/* ─── GitHub Icon ─── */
const GitHubIcon = ({ size = 18, color = "#c3ae88" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill={color}>
    <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
  </svg>
);

/* ─── Split-Flap Digit (warm amber palette) ─── */
function FlapDigit({ value, delay = 0 }: { value: number; delay?: number }) {
  const [displayed, setDisplayed] = useState(value);
  const [flipping, setFlipping] = useState(false);
  const prevRef = useRef(value);

  useEffect(() => {
    if (value === prevRef.current) return;
    prevRef.current = value;
    const timer = setTimeout(() => {
      setFlipping(true);
      const mid = setTimeout(() => setDisplayed(value), 200);
      const end = setTimeout(() => setFlipping(false), 400);
      return () => { clearTimeout(mid); clearTimeout(end); };
    }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return (
    <div
      style={{
        width: 24,
        height: 36,
        position: "relative",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        margin: "0 1px",
        borderRadius: 3,
        overflow: "hidden",
        background: "linear-gradient(180deg, #1a1a1a 0%, #111111 48%, #0c0c0c 52%, #141414 100%)",
        boxShadow: "inset 0 1px 3px rgba(0,0,0,0.9), inset 0 -1px 2px rgba(255,255,255,0.03), 0 1px 0 rgba(255,255,255,0.05)",
        border: "1px solid #0a0a0a",
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-ui-activity, 'Courier New', monospace)",
          fontSize: 22,
          fontWeight: 800,
          color: "#ff9500",
          textShadow: "0 0 8px rgba(255,149,0,0.4), 0 0 16px rgba(255,149,0,0.1)",
          lineHeight: 1,
          userSelect: "none",
          transform: flipping ? "scaleY(0.8)" : "scaleY(1)",
          opacity: flipping ? 0.5 : 1,
          transition: "transform 0.2s ease-in-out, opacity 0.2s ease-in-out",
        }}
      >
        {String(displayed)}
      </span>
      {/* Center split line */}
      <div style={{ position: "absolute", left: 0, right: 0, top: "50%", height: 1, background: "rgba(0,0,0,0.9)", boxShadow: "0 1px 0 rgba(255,255,255,0.03)", zIndex: 2 }} />
      {/* Shading */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.25) 100%)", pointerEvents: "none" }} />
      {flipping && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(255,149,0,0.06)", animation: "drumFlash 0.4s ease-out forwards", pointerEvents: "none" }} />
      )}
    </div>
  );
}

/* ─── Multi-digit flap group ─── */
function FlapNumber({ value, digits = 4, baseDelay = 0 }: { value: number; digits?: number; baseDelay?: number }) {
  const str = String(Math.max(0, value)).padStart(digits, "0");
  return (
    <div className="inline-flex items-center">
      {str.split("").map((ch, i) => (
        <FlapDigit key={i} value={parseInt(ch, 10)} delay={baseDelay + i * 80} />
      ))}
    </div>
  );
}

/* ─── Record badge (W-D-L) ─── */
function RecordBadge({ wins, draws, losses }: { wins: number; draws: number; losses: number }) {
  const total = wins + draws + losses;
  if (total === 0) return <span className="text-[10px] text-[#404040] font-mono">&mdash;</span>;
  return (
    <span className="text-[10px] font-mono tracking-wide">
      <span style={{ color: "#d4a85f" }}>{wins}W</span>
      <span className="text-[#404040] mx-0.5">/</span>
      <span style={{ color: "#8a8a80" }}>{draws}D</span>
      <span className="text-[#404040] mx-0.5">/</span>
      <span style={{ color: "#d46866" }}>{losses}L</span>
    </span>
  );
}

/* ─── Format model name for display ─── */
function formatModelName(model: string): { display: string; short: string } {
  const parts = model.split("/");
  const base = parts.length > 1 ? parts[parts.length - 1] : model;
  const display = base.length > 24 ? base.slice(0, 22) + "\u2026" : base;
  const short = parts.length > 1 ? parts[0] : "";
  return { display, short };
}

/* ─── Main Drawer ─── */
interface LeaderboardDrawerProps {
  open: boolean;
  onClose: () => void;
  gameId: string;
  refreshKey?: number;
}

export function LeaderboardDrawer({ open, onClose, gameId, refreshKey = 0 }: LeaderboardDrawerProps) {
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(false);

  // Prefer game-scoped standings; fallback to global rankings if the scoped fetch fails.
  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const controller = new AbortController();
    const gameScopedUrl = `/api/agents/leaderboard?gameId=${encodeURIComponent(gameId)}`;

    fetch(gameScopedUrl, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => {
        if (response.ok) return response.json();
        const fallback = await fetch("/api/agents/leaderboard", {
          signal: controller.signal,
          cache: "no-store",
        });
        return fallback.ok ? fallback.json() : null;
      })
      .then((d) => {
        if (d) setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
    return () => controller.abort();
  }, [open, refreshKey, gameId]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  const isGameScoped = Boolean(data?.gameId);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 transition-all duration-300"
        style={{
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          background: "rgba(0,0,0,0.7)",
          backdropFilter: open ? "blur(3px)" : "none",
        }}
        onClick={handleBackdropClick}
        aria-hidden={!open}
      >
        {/* Drawer panel */}
        <div
          className="absolute top-0 right-0 h-full transition-transform duration-300 ease-out"
          style={{
            width: "min(540px, 92vw)",
            transform: open ? "translateX(0)" : "translateX(100%)",
          }}
          role="dialog"
          aria-label="Top Models by ELO"
          aria-modal="true"
        >
          {/* Outer housing — brushed metal (matches TacticalPanel) */}
          <div
            className="h-full flex flex-col overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #2a2a2a 0%, #252525 50%, #2a2a2a 100%)",
              borderLeft: "4px solid #1a1a1a",
              boxShadow: "-8px 0 30px rgba(0,0,0,0.7), inset 1px 0 0 rgba(255,255,255,0.03)",
            }}
          >
            {/* ─── Header ─── */}
            <div
              className="relative flex-shrink-0 px-5 py-4"
              style={{
                background: "linear-gradient(180deg, #2a2a2a 0%, #222222 50%, #1e1e1e 100%)",
                borderBottom: "3px solid #0a0a0a",
                boxShadow: "inset 0 -1px 0 rgba(255,149,0,0.06)",
              }}
            >
              {/* Title strip — matches TacticalPanel inset title well */}
              <div
                className="inline-flex items-center gap-3 px-4 py-1.5 rounded-sm"
                style={{
                  background: "linear-gradient(180deg, #1a1a1a 0%, #151515 50%, #1a1a1a 100%)",
                  border: "2px solid #0a0a0a",
                  boxShadow: "inset 0 2px 6px rgba(0,0,0,0.8), 0 1px 0 rgba(255,149,0,0.1)",
                }}
              >
                <span className="text-[8px]" style={{ color: "#ff9500", textShadow: "0 0 6px rgba(255,149,0,0.4)" }}>&#9670;</span>
                <span
                  className="text-[13px] font-bold uppercase tracking-[0.2em]"
                  style={{
                    color: "#ff9500",
                    textShadow: "0 0 8px rgba(255,149,0,0.35), 0 1px 2px rgba(0,0,0,0.8)",
                    fontFamily: "var(--font-ui-activity, 'Courier New', monospace)",
                  }}
                >
                  Top Models by ELO
                </span>
                <span className="text-[8px]" style={{ color: "#ff9500", textShadow: "0 0 6px rgba(255,149,0,0.4)" }}>&#9670;</span>
              </div>

              {/* Close + icon buttons (top-right) */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                <a
                  href="https://github.com/anthropics/diplomacy-rlm"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 flex items-center justify-center rounded-sm transition-all hover:brightness-125"
                  style={{
                    background: "linear-gradient(180deg, #363636 0%, #2a2a2a 100%)",
                    border: "1px solid #1a1a1a",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 4px rgba(0,0,0,0.4)",
                  }}
                  title="View on GitHub"
                  aria-label="GitHub repository"
                >
                  <GitHubIcon size={16} color="#c3ae88" />
                </a>
                <a
                  href="https://sedona.fun"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-8 h-8 flex items-center justify-center rounded-sm transition-all hover:brightness-125"
                  style={{
                    background: "linear-gradient(180deg, #363636 0%, #2a2a2a 100%)",
                    border: "1px solid #1a1a1a",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 4px rgba(0,0,0,0.4)",
                  }}
                  title="Visit sedona.fun"
                  aria-label="Sedona"
                >
                  <SedonaIcon size={18} color="#c3ae88" />
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-sm transition-all hover:brightness-125"
                  style={{
                    background: "linear-gradient(180deg, #363636 0%, #2a2a2a 100%)",
                    border: "1px solid #1a1a1a",
                    color: "#808080",
                    boxShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 4px rgba(0,0,0,0.4)",
                  }}
                  aria-label="Close leaderboard"
                >
                  &#10005;
                </button>
              </div>

              {/* Subtitle */}
              <div className="mt-2 font-ui-panel text-[9px] uppercase tracking-[0.25em] text-[#8f8776]">
                {isGameScoped ? `Game Rankings${data?.phase ? ` — ${data.phase}` : ""}` : "Global Rankings — All Games"}
              </div>
            </div>

            {/* ─── Column Headers ─── */}
            <div
              className="flex-shrink-0 grid items-center px-3 py-2 font-ui-panel text-[9px] font-bold uppercase tracking-[0.15em] text-[#606060]"
              style={{
                gridTemplateColumns: "32px 1fr 110px 80px 60px",
                background: "linear-gradient(180deg, #1a1a1a 0%, #151515 100%)",
                borderBottom: "1px solid #222222",
              }}
            >
              <div className="text-center">#</div>
              <div>Model</div>
              <div className="text-center">ELO</div>
              <div className="text-center">Record</div>
              <div className="text-center">Games</div>
            </div>

            {/* ─── Scrollable Rows ─── */}
            <div className="flex-1 overflow-y-auto min-h-0">
              {loading && !data && (
                <div className="flex items-center justify-center h-32 text-[#606060] text-sm">Loading...</div>
              )}

              {data?.entries.map((entry, i) => (
                <ModelRow key={`${entry.agentKey}-${entry.power || i}`} entry={entry} index={i} animDelay={i * 100} />
              ))}

              {data && data.entries.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 text-[#606060]">
                  <div className="text-2xl mb-2 opacity-40">&mdash;</div>
                  <div className="text-[11px] uppercase tracking-wider">No completed games yet</div>
                  <div className="text-[9px] mt-1 text-[#404040]">Finish a game to populate rankings</div>
                </div>
              )}
            </div>

            {/* ─── Footer — Sedona branding ─── */}
            <div
              className="flex-shrink-0 px-5 py-3"
              style={{
                background: "linear-gradient(180deg, #1e1e1e 0%, #151515 100%)",
                borderTop: "2px solid #0a0a0a",
              }}
            >
              <div className="flex items-center justify-between">
                {/* Powered by Sedona */}
                <div className="flex items-center gap-2">
                  <SedonaIcon size={16} color="#8f8776" />
                  <span className="font-ui-panel text-[9px] uppercase tracking-[0.18em] text-[#8f8776]">
                    Powered by{" "}
                    <a
                      href="https://sedona.fun"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#ff9500] hover:text-[#ffb040] transition-colors"
                    >
                      sedona.fun
                    </a>
                  </span>
                </div>

                {/* Full leaderboard button */}
                <a
                  href="https://sedona.fun/leaderboard"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-[9px] font-semibold uppercase tracking-[0.14em] transition-all hover:brightness-125"
                  style={{
                    background: "linear-gradient(180deg, #36322c 0%, #2a2722 100%)",
                    border: "1px solid #2f2a22",
                    color: "#ff9500",
                    boxShadow: "inset 0 1px 0 rgba(255,149,0,0.06), 0 2px 4px rgba(0,0,0,0.4)",
                  }}
                >
                  Full Leaderboard &rarr;
                </a>
              </div>

              {/* Technical footer line */}
              <div className="mt-2 flex items-center justify-between font-ui-panel text-[7px] uppercase tracking-[0.2em] text-[#3a3a3a]">
                <span>RLM-SB MK.2</span>
                <span>ELO BASE {data?.eloBase ?? 1500} / K=24</span>
              </div>
            </div>

            {/* CRT overlay — warm amber to match the rest of the UI */}
            <CRTScreenOverlay color="amber" scanlineOpacity={0.3} intensity={0.35} />
          </div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes drumFlash {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes rowSlideIn {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  );
}

/* ─── Individual Model Row ─── */
function ModelRow({ entry, index, animDelay }: { entry: LeaderboardEntry; index: number; animDelay: number }) {
  const { display, short } = formatModelName(entry.model);
  const stripe = index % 2 === 0 ? "bg-[#0c0c0c]" : "bg-[#111111]";
  const isTop3 = index < 3;

  // Medal colors for top 3
  const medalColors = ["#e8c44a", "#b0b8c4", "#cd7f32"]; // gold, silver, bronze
  const rankColor = isTop3 ? medalColors[index] : "#606060";

  return (
    <div
      className="grid items-center px-3 py-2.5 border-b transition-colors hover:bg-[#1a1a1a]"
      style={{
        gridTemplateColumns: "32px 1fr 110px 80px 60px",
        borderColor: "#1a1a1a",
        animation: `rowSlideIn 0.4s ease-out ${animDelay}ms both`,
      }}
      role="row"
      aria-label={`Rank ${entry.rank}, ${entry.model}, ELO ${entry.elo ?? "unrated"}`}
    >
      {/* Rank */}
      <div
        className="text-center font-mono font-bold text-[15px]"
        style={{ color: rankColor, textShadow: isTop3 ? `0 0 6px ${rankColor}44` : "none" }}
      >
        {entry.rank}
      </div>

      {/* Model name + backend */}
      <div className="min-w-0 pl-1">
        <div
          className="font-ui-panel text-[12px] font-bold tracking-[0.04em] truncate"
          style={{ color: isTop3 ? "#d8c183" : "#c3ae88" }}
          title={entry.agentKey}
        >
          {display}
        </div>
        {short && (
          <div className="text-[9px] text-[#606060] font-ui-panel truncate">
            {short}
          </div>
        )}
      </div>

      {/* ELO flap digits */}
      <div className="flex items-center justify-center">
        {entry.elo !== null ? (
          <FlapNumber value={entry.elo} digits={4} baseDelay={animDelay + 200} />
        ) : (
          <span className="text-[11px] text-[#3a3a3a] font-mono tracking-wider">----</span>
        )}
      </div>

      {/* W/D/L record */}
      <div className="flex items-center justify-center">
        <RecordBadge wins={entry.record.wins} draws={entry.record.draws} losses={entry.record.losses} />
      </div>

      {/* Games played */}
      <div className="text-center font-mono text-[12px] text-[#808080]">
        {entry.eloGames}
      </div>
    </div>
  );
}
