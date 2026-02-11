import Link from "next/link";
import { listGames } from "@/lib/game-data";
import { POWER_DISPLAY_COLORS } from "@/lib/constants";
import GameLauncher from "@/components/launcher/GameLauncher";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const games = listGames();

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#06090f] px-3 py-4 sm:px-6 sm:py-6">
      <div className="pointer-events-none absolute inset-0 opacity-55 [background-image:linear-gradient(rgba(22,54,118,0.2)_1px,transparent_1px),linear-gradient(90deg,rgba(120,30,18,0.22)_1px,transparent_1px)] [background-size:44px_44px,44px_44px]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(85%_70%_at_50%_0%,rgba(255,166,34,0.1)_0%,rgba(8,11,16,0.88)_58%,#05070c_100%)]" />
      <div className="relative mx-auto w-full max-w-[1360px] border border-[#253145] bg-[linear-gradient(180deg,rgba(8,12,18,0.92),rgba(7,10,14,0.96))] p-4 shadow-[0_24px_46px_rgba(0,0,0,0.45)] sm:p-6">
        <div className="mb-5 flex items-center justify-between gap-3 border-b border-[#223049] pb-3">
          <p className="text-[11px] uppercase tracking-[0.18em] text-[#8f9eb5]">
            Diplomacy RLM Tactical Grid
          </p>
          <Link
            href="/military-demo"
            className="inline-flex items-center gap-2 border border-[#324560] bg-[#0f1724] px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-[#d4deeb] hover:border-[#4a5f7c] hover:text-[#ffffff]"
          >
            <span className="h-2 w-2 rounded-full bg-[#3fca76] shadow-[0_0_8px_rgba(63,202,118,0.78)]" />
            Open Military View
          </Link>
        </div>

        <section>
          <div className="mb-3 flex items-center gap-3">
            <span className="h-px w-8 bg-[#e0a526]" />
            <h2 className="text-[12px] uppercase tracking-[0.2em] text-[#d0d7e2]">
              Initiate New Sequence
            </h2>
            <span className="h-px flex-1 bg-[#243449]" />
          </div>
          <GameLauncher />
        </section>

        <section className="mt-6">
          <div className="mb-3 flex items-center gap-3">
            <span className="h-px w-8 bg-[#e0a526]" />
            <h2 className="text-[12px] uppercase tracking-[0.2em] text-[#d0d7e2]">
              Active Simulations
            </h2>
            <span className="h-px flex-1 bg-[#243449]" />
          </div>
          {games.length === 0 ? (
            <div className="border border-[#2d3645] bg-[#0a0f17] px-4 py-8 text-center">
              <p className="text-sm text-[#aeb7c6]">No active simulations detected.</p>
              <p className="mt-1 text-xs text-[#7d8799]">
                Start a sequence above or point `GAMES_DIR` to your run directory.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {games.map((game, index) => (
                <article
                  key={game.id}
                  className="group relative border border-[#303848] bg-[linear-gradient(145deg,#0d1119_0%,#0a0f16_100%)] p-4 transition-colors hover:border-[#495369]"
                >
                  <span className="absolute right-3 top-3 border border-[#394152] bg-[#1a202a] px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-[#7f8aa0]">
                    ID: {String(index + 1).padStart(3, "0")}
                  </span>
                  <h3 className="pr-16 text-[30px] leading-none font-medium tracking-[0.02em] text-[#e3e8f2] [font-family:'MD_System_Condensed_Trial',monospace]">
                    {game.id}
                  </h3>
                  <p className="mt-3 text-[11px] tracking-[0.09em] text-[#8d98ab]">
                    {game.phases.length} phases &nbsp;•&nbsp; Last: {game.lastPhase}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {game.powers.map((power) => (
                      <span
                        key={power}
                        className="border px-2 py-0.5 text-[10px] uppercase tracking-[0.11em]"
                        style={{
                          backgroundColor: POWER_DISPLAY_COLORS[power] + "12",
                          color: POWER_DISPLAY_COLORS[power],
                          borderColor: POWER_DISPLAY_COLORS[power] + "77",
                        }}
                      >
                        {power}
                      </span>
                    ))}
                  </div>
                  <div className="mt-4 border-t border-dashed border-[#2e394a] pt-3">
                    <Link
                      href={`/game/${game.id}`}
                      className={`text-[11px] uppercase tracking-[0.14em] ${
                        game.hasLog
                          ? "text-[#e8a829] hover:text-[#ffc35d]"
                          : "text-[#6d7685] hover:text-[#8d95a3]"
                      }`}
                    >
                      Access Log &gt;
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
