import fs from "fs";
import path from "path";
import Link from "next/link";
import { listGames } from "@/lib/game-data";
import { POWER_DISPLAY_COLORS, phaseDisplayName } from "@/lib/constants";
import GameLauncher from "@/components/launcher/GameLauncher";
import { Rivet } from "@/app/military-ui-kit/components";
import MiniMap from "@/components/map/MiniMap";

export const dynamic = "force-dynamic";

// Load SVG once for thumbnails
let _svgCache: string | null = null;
function getSvgContent(): string {
  if (!_svgCache) {
    const svgPath = path.join(process.cwd(), "public", "standard-base.svg");
    try {
      _svgCache = fs.readFileSync(svgPath, "utf-8");
    } catch {
      _svgCache = "";
    }
  }
  return _svgCache;
}

function formatModelShort(model: string): string {
  // "claude-opus-4-6" → "Opus 4.6"
  // "gpt-4o" → "GPT-4o"
  // "anthropic/claude-sonnet-4-5" → "Sonnet 4.5"
  const base = model.includes("/") ? model.split("/").pop()! : model;
  if (base.includes("opus")) return base.replace(/claude-?/i, "").replace(/-/g, " ").replace(/opus\s*/i, "Opus ").trim();
  if (base.includes("sonnet")) return base.replace(/claude-?/i, "").replace(/-/g, " ").replace(/sonnet\s*/i, "Sonnet ").trim();
  if (base.includes("haiku")) return base.replace(/claude-?/i, "").replace(/-/g, " ").replace(/haiku\s*/i, "Haiku ").trim();
  return base;
}

export default function HomePage() {
  const games = listGames();
  const svgContent = getSvgContent();

  // Split into active (not finished) and completed
  const activeGames = games.filter(g => !g.gameOver);
  const completedGames = games.filter(g => g.gameOver);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0a0a0a] px-3 py-4 sm:px-6 sm:py-6">
      {/* Warm metallic grid overlay */}
      <div className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(rgba(80,68,42,0.22)_1px,transparent_1px),linear-gradient(90deg,rgba(80,68,42,0.18)_1px,transparent_1px)] [background-size:44px_44px,44px_44px]" />
      {/* Warm amber radial gradient */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(85%_70%_at_50%_0%,rgba(255,149,0,0.07)_0%,rgba(10,10,10,0.92)_58%,#0a0a0a_100%)]" />

      {/* Main container — riveted panel */}
      <div
        className="relative mx-auto w-full max-w-[1360px] border-4 p-4 sm:p-6 overflow-hidden"
        style={{
          borderColor: "#1a1a1a",
          background: "linear-gradient(135deg, #2a2a2a 0%, #252525 50%, #2a2a2a 100%)",
          boxShadow: "inset 0 2px 6px rgba(0,0,0,0.6), inset 0 -1px 3px rgba(255,255,255,0.05), 0 24px 46px rgba(0,0,0,0.45)",
        }}
      >
        {/* Corner rivets */}
        <Rivet size={8} style={{ left: "10px", top: "10px", opacity: 0.7 }} />
        <Rivet size={8} style={{ right: "10px", top: "10px", opacity: 0.7 }} />
        <Rivet size={8} style={{ left: "10px", bottom: "10px", opacity: 0.7 }} />
        <Rivet size={8} style={{ right: "10px", bottom: "10px", opacity: 0.7 }} />

        {/* Title plate */}
        <div
          className="relative mb-5 rounded-[4px] border px-4 py-3 overflow-hidden"
          style={{
            borderColor: "#2b2926",
            background:
              "repeating-linear-gradient(90deg, transparent 0px, transparent 1px, rgba(255,255,255,0.01) 1px, rgba(255,255,255,0.01) 2px), linear-gradient(180deg, #403b34 0%, #2f2b26 52%, #25221f 100%)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.45), 0 4px 10px rgba(0,0,0,0.35)",
          }}
        >
          <div className="absolute left-0 right-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,255,255,0.16),transparent)]" />
          <Rivet size={6} style={{ left: "8px", top: "8px", opacity: 0.55 }} />
          <Rivet size={6} style={{ right: "8px", top: "8px", opacity: 0.55 }} />
          <Rivet size={6} style={{ left: "8px", bottom: "8px", opacity: 0.55 }} />
          <Rivet size={6} style={{ right: "8px", bottom: "8px", opacity: 0.55 }} />

          <div>
            <div className="font-ui-title text-[11px] leading-none tracking-[0.22em] font-semibold text-[#ceb97f]">
              DIPLOMACY RLM
            </div>
            <div className="font-ui-title text-[28px] leading-[24px] font-black tracking-[0.08em] text-[#d8c183]">
              TACTICAL GRID
            </div>
          </div>
          <div className="font-ui-panel absolute right-4 top-2 text-[8px] leading-none uppercase tracking-[0.2em] text-[#8f8776]">
            CASE-MK.IV
          </div>
        </div>

        {/* Initiate New Sequence section */}
        <section>
          <div className="mb-3 flex items-center gap-3">
            <span className="h-px w-8 bg-[#ff9500]" />
            <h2
              className="text-[12px] uppercase tracking-[0.2em] font-bold text-[#ff9500]"
              style={{ textShadow: "0 0 8px rgba(255,149,0,0.3)" }}
            >
              Initiate New Sequence
            </h2>
            <span className="h-px flex-1 bg-[#3a3a3a]" />
          </div>
          <GameLauncher />
        </section>

        {/* Active Simulations section */}
        <section className="mt-6">
          <div className="mb-3 flex items-center gap-3">
            <span className="h-px w-8 bg-[#ff9500]" />
            <h2
              className="text-[12px] uppercase tracking-[0.2em] font-bold text-[#ff9500]"
              style={{ textShadow: "0 0 8px rgba(255,149,0,0.3)" }}
            >
              Active Simulations
            </h2>
            <span className="relative flex h-2 w-2 ml-1">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4a7c59] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4a7c59]" />
            </span>
            <span className="h-px flex-1 bg-[#3a3a3a]" />
          </div>
          {activeGames.length === 0 ? (
            <div
              className="border-2 px-4 py-8 text-center"
              style={{
                borderColor: "#3a3a3a",
                background: "linear-gradient(135deg, #1a1a1a 0%, #151515 50%, #1a1a1a 100%)",
                boxShadow: "inset 0 2px 4px rgba(0,0,0,0.6)",
              }}
            >
              <p className="text-sm text-[#808080]">No active simulations detected.</p>
              <p className="mt-1 text-xs text-[#5a5a5a]">
                Start a sequence above or point <code className="text-[#ff9500]/60">GAMES_DIR</code> to your run directory.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {activeGames.map((game) => (
                <GameCard key={game.id} game={game} svgContent={svgContent} />
              ))}
            </div>
          )}
        </section>

        {/* Completed Games section */}
        {completedGames.length > 0 && (
          <section className="mt-6">
            <div className="mb-3 flex items-center gap-3">
              <span className="h-px w-8 bg-[#808080]" />
              <h2
                className="text-[12px] uppercase tracking-[0.2em] font-bold text-[#808080]"
              >
                Completed Simulations
              </h2>
              <span className="text-[10px] uppercase tracking-[0.1em] text-[#505050]">
                {completedGames.length}
              </span>
              <span className="h-px flex-1 bg-[#2a2a2a]" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {completedGames.map((game) => (
                <GameCard key={game.id} game={game} svgContent={svgContent} />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function GameCard({ game, svgContent }: { game: ReturnType<typeof listGames>[number]; svgContent: string }) {
  const hasMapData = Object.keys(game.finalCenters).length > 0;
  const leader = game.finalStandings[0];
  const leaderColor = leader ? (POWER_DISPLAY_COLORS[leader.power] || "#808080") : "#808080";

  return (
    <Link
      href={`/military-demo?gameId=${game.id}`}
      className="group relative border-2 transition-all overflow-hidden block"
      style={{
        borderColor: game.gameOver ? "#3a3a3a" : "#4a4530",
        background: "linear-gradient(145deg, #1a1a1a 0%, #151515 50%, #1a1a1a 100%)",
        boxShadow: game.gameOver
          ? "inset 0 2px 4px rgba(0,0,0,0.6), 0 4px 8px rgba(0,0,0,0.3)"
          : "inset 0 2px 4px rgba(0,0,0,0.6), 0 4px 8px rgba(0,0,0,0.3), 0 0 12px rgba(255,149,0,0.08)",
      }}
    >
      {/* Card corner rivets */}
      <Rivet size={5} style={{ left: "6px", top: "6px", opacity: 0.5 }} />
      <Rivet size={5} style={{ right: "6px", top: "6px", opacity: 0.5 }} />
      <Rivet size={5} style={{ left: "6px", bottom: "6px", opacity: 0.5 }} />
      <Rivet size={5} style={{ right: "6px", bottom: "6px", opacity: 0.5 }} />

      {/* Map thumbnail — vintage photograph treatment */}
      {hasMapData && (
        <div
          className="relative w-full overflow-hidden border-b"
          style={{
            height: 160,
            borderColor: "#2a2a2a",
            background: "#0c0c0c",
          }}
        >
          {/* Hover zoom wrapper — scale up on group hover */}
          <div
            className="absolute inset-0 transition-transform duration-500 ease-out group-hover:scale-110"
            style={{ transformOrigin: "center center" }}
          >
          {/* Inline SVG filter definitions for this card */}
          <svg className="absolute" width="0" height="0" aria-hidden="true">
            <defs>
              <filter id={`vintage-${game.id}`} colorInterpolationFilters="sRGB">
                {/* Desaturate + warm shift */}
                <feColorMatrix type="matrix" values="
                  0.45 0.35 0.15 0 0.03
                  0.25 0.45 0.15 0 0.01
                  0.15 0.25 0.35 0 0.0
                  0    0    0    1 0
                " />
                <feComponentTransfer>
                  <feFuncR type="linear" slope="1.1" intercept="0.02" />
                  <feFuncG type="linear" slope="0.95" intercept="0.01" />
                  <feFuncB type="linear" slope="0.8" intercept="0" />
                </feComponentTransfer>
              </filter>
              <filter id={`grain-${game.id}`} x="0%" y="0%" width="100%" height="100%">
                <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch" result="noise" />
                <feColorMatrix type="saturate" values="0" in="noise" result="grayNoise" />
              </filter>
            </defs>
          </svg>

          {/* Base map with vintage color matrix */}
          <div
            className="absolute inset-0"
            style={{ filter: `url(#vintage-${game.id}) contrast(1.15) brightness(0.9)` }}
          >
            <MiniMap
              svgContent={svgContent}
              centers={game.finalCenters}
              influence={game.finalInfluence}
              className="w-full h-full"
            />
          </div>

          {/* Halftone dot pattern — visible on dark backgrounds using screen blend */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              mixBlendMode: "soft-light",
              opacity: 0.45,
              backgroundImage: `
                radial-gradient(circle 1.2px, rgba(0,220,220,0.7) 0%, transparent 100%),
                radial-gradient(circle 1.2px, rgba(220,0,220,0.6) 0%, transparent 100%),
                radial-gradient(circle 1px, rgba(220,220,0,0.5) 0%, transparent 100%),
                radial-gradient(circle 0.8px, rgba(40,40,40,0.8) 0%, transparent 100%)
              `,
              backgroundSize: "5px 5px, 5px 5px, 4px 4px, 6px 6px",
              backgroundPosition: "0 0, 2px 2px, 1px 3px, 3px 1px",
            }}
          />

          {/* Film grain — rendered noise texture */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              filter: `url(#grain-${game.id})`,
              mixBlendMode: "overlay",
              opacity: 0.3,
            }}
          />

          {/* Warm amber photo toning */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "linear-gradient(135deg, rgba(180,120,40,0.12) 0%, rgba(120,80,20,0.08) 100%)",
              mixBlendMode: "color",
            }}
          />

          {/* Dirt, dust spots, and film scratches */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              opacity: 0.2,
              backgroundImage: `
                radial-gradient(ellipse 4px 12px at 12% 30%, rgba(200,180,140,0.6) 0%, transparent 100%),
                radial-gradient(ellipse 3px 3px at 75% 15%, rgba(180,160,120,0.5) 0%, transparent 100%),
                radial-gradient(ellipse 6px 2px at 50% 85%, rgba(220,200,160,0.3) 0%, transparent 100%),
                radial-gradient(ellipse 2px 8px at 90% 55%, rgba(180,160,120,0.4) 0%, transparent 100%),
                radial-gradient(ellipse 1.5px 20px at 28% 50%, rgba(255,240,200,0.15) 0%, transparent 100%),
                radial-gradient(ellipse 1px 30px at 65% 40%, rgba(255,240,200,0.1) 0%, transparent 100%)
              `,
            }}
          />

          </div>{/* end hover zoom wrapper */}

          {/* Vignette — heavy dark corners */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background: "radial-gradient(ellipse 75% 65% at 50% 45%, transparent 30%, rgba(0,0,0,0.7) 100%)",
            }}
          />

          {/* Bottom fade into card body */}
          <div
            className="absolute inset-x-0 bottom-0 h-12 pointer-events-none"
            style={{ background: "linear-gradient(to top, #151515, transparent)" }}
          />
          {/* Status badge overlay — tactical indicator */}
          {game.gameOver ? (
            <span
              className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1"
              style={{
                fontFamily: "'Courier New', monospace",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                background: "linear-gradient(180deg, rgba(20,20,20,0.9) 0%, rgba(10,10,10,0.95) 100%)",
                borderTop: "1px solid #3a3a3a",
                borderBottom: "1px solid #222",
                borderLeft: "1px solid #2a2a2a",
                borderRight: "1px solid #2a2a2a",
                color: "#606060",
                backdropFilter: "blur(6px)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.6)",
              }}
            >
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#3a3a3a", display: "inline-block" }} />
              Ended
            </span>
          ) : (
            <span
              className="absolute top-2.5 right-2.5 flex items-center gap-1.5 px-2.5 py-1"
              style={{
                fontFamily: "'Courier New', monospace",
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                background: "linear-gradient(180deg, rgba(20,18,12,0.92) 0%, rgba(10,10,8,0.95) 100%)",
                borderTop: "1px solid #4a4530",
                borderBottom: "1px solid #2a2018",
                borderLeft: "1px solid #3a3020",
                borderRight: "1px solid #3a3020",
                color: "#ff9500",
                backdropFilter: "blur(6px)",
                boxShadow: "0 2px 8px rgba(0,0,0,0.6), 0 0 8px rgba(255,149,0,0.1)",
                textShadow: "0 0 6px rgba(255,149,0,0.3)",
              }}
            >
              <span className="relative flex" style={{ width: 6, height: 6 }}>
                <span
                  className="animate-ping absolute inline-flex rounded-full"
                  style={{ width: 6, height: 6, background: "#4a7c59", opacity: 0.7 }}
                />
                <span
                  className="relative inline-flex rounded-full"
                  style={{ width: 6, height: 6, background: "#4a7c59", boxShadow: "0 0 4px rgba(74,124,89,0.8)" }}
                />
              </span>
              Live
            </span>
          )}
        </div>
      )}

      {/* Card body */}
      <div className="relative p-4">
        {/* Game ID + phase info */}
        <div className="flex items-start justify-between gap-2">
          <h3
            className="text-[22px] leading-none font-bold tracking-[0.03em] font-ui-panel group-hover:text-[#ff9500] transition-colors"
            style={{ color: game.gameOver ? "#b0b0b0" : "#e0e0e0" }}
          >
            {game.id}
          </h3>
          <span
            className="flex-shrink-0 text-[10px] uppercase tracking-[0.1em] font-mono mt-0.5"
            style={{ color: "#606060" }}
          >
            {game.phases.length} ph
          </span>
        </div>

        {/* Phase + last phase info */}
        <p className="mt-1.5 text-[11px] tracking-[0.06em] text-[#808080]">
          {phaseDisplayName(game.lastPhase)}
        </p>

        {/* Model badge — shown for all games with meta */}
        {game.meta?.model && (
          <div
            className="mt-2 inline-flex items-center gap-1.5 px-2 py-1 rounded-sm text-[10px] uppercase tracking-[0.08em] font-bold"
            style={{
              background: "linear-gradient(180deg, #2a2518 0%, #1e1b14 100%)",
              border: "1px solid #3a3020",
              color: "#ff9500",
              boxShadow: "inset 0 1px 0 rgba(255,149,0,0.06)",
              textShadow: "0 0 6px rgba(255,149,0,0.25)",
            }}
          >
            {formatModelShort(game.meta.model)}
          </div>
        )}

        {/* Standings for finished games */}
        {game.gameOver && game.finalStandings.length > 0 && (
          <div className="mt-2.5 flex items-center gap-2">
            {/* Winner */}
            <div className="flex items-center gap-1.5">
              <span className="text-[9px] uppercase tracking-[0.12em] text-[#606060]">Winner:</span>
              <span
                className="text-[11px] font-bold uppercase tracking-[0.06em]"
                style={{ color: leaderColor }}
              >
                {leader.power}
              </span>
              <span className="text-[9px] text-[#606060]">
                ({leader.scs} SC)
              </span>
            </div>
          </div>
        )}

        {/* Power chips */}
        <div className="mt-2.5 flex flex-wrap gap-1">
          {game.powers.map((power) => {
            const sc = game.finalStandings.find(s => s.power === power);
            return (
              <span
                key={power}
                className="border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em]"
                style={{
                  backgroundColor: POWER_DISPLAY_COLORS[power] + "12",
                  color: POWER_DISPLAY_COLORS[power],
                  borderColor: POWER_DISPLAY_COLORS[power] + "55",
                }}
              >
                {power.slice(0, 3)}{sc ? ` ${sc.scs}` : ""}
              </span>
            );
          })}
        </div>

        {/* Hover indicator */}
        <div
          className="mt-3 text-[10px] uppercase tracking-[0.14em] font-bold text-[#3a3a3a] group-hover:text-[#ff9500] transition-colors"
          style={{ textShadow: "none" }}
        >
          Open Viewer &rsaquo;
        </div>
      </div>
    </Link>
  );
}
