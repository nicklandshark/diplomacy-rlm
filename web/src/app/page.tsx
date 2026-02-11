import Link from "next/link";
import { listGames } from "@/lib/game-data";
import { POWER_DISPLAY_COLORS } from "@/lib/constants";
import GameLauncher from "@/components/launcher/GameLauncher";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const games = listGames();

  return (
    <div className="min-h-screen bg-[radial-gradient(120%_90%_at_50%_0%,rgba(255,162,0,0.08)_0%,rgba(17,19,24,0.98)_50%,#06080d_100%)] px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1380px]">
        <header className="relative overflow-hidden rounded-[16px] border border-[#303640] bg-[linear-gradient(145deg,#1f242d_0%,#151a22_42%,#11161f_100%)] px-5 py-5 shadow-[0_20px_40px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.06)] sm:px-7">
          <div className="pointer-events-none absolute -top-16 left-1/2 h-40 w-[70%] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(255,166,0,0.22),rgba(255,166,0,0))]" />
          <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#8792a3]">
                Diplomacy RLM
              </p>
              <h1 className="mt-1 text-[28px] font-semibold uppercase tracking-[0.06em] text-[#e3e7f0] sm:text-[34px]">
                Command Console
              </h1>
              <p className="mt-2 max-w-[820px] text-[13px] leading-6 text-[#99a4b6]">
                Launch live games, monitor active runs, and open the military operations view with live API and SSE updates.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 self-start rounded-md border border-[#3b424f] bg-[#141a24] px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-[#c2cad8]">
              <span className="h-2.5 w-2.5 rounded-full bg-[#43d17e] shadow-[0_0_10px_rgba(67,209,126,0.8)]" />
              <span>{games.length} run{games.length === 1 ? "" : "s"}</span>
            </div>
          </div>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_1fr]">
          <section className="rounded-[14px] border border-[#2f3540] bg-[linear-gradient(140deg,#161b24_0%,#121720_52%,#0f141d_100%)] p-4 shadow-[0_16px_32px_rgba(0,0,0,0.42)] sm:p-5">
            <div className="mb-4 flex items-center justify-between border-b border-[#2c323c] pb-3">
              <h2 className="text-[14px] font-semibold uppercase tracking-[0.12em] text-[#d5dbe8]">
                Launch New Game
              </h2>
              <span className="text-[10px] uppercase tracking-[0.12em] text-[#8d97a7]">
                Runtime Config
              </span>
            </div>
            <GameLauncher />
          </section>

          <section className="rounded-[14px] border border-[#2f3540] bg-[linear-gradient(140deg,#12161f_0%,#0e131b_52%,#0b1017_100%)] p-4 shadow-[0_16px_32px_rgba(0,0,0,0.42)] sm:p-5">
            <div className="mb-4 flex items-center justify-between border-b border-[#2c323c] pb-3">
              <h2 className="text-[14px] font-semibold uppercase tracking-[0.12em] text-[#d5dbe8]">
                Previous Games
              </h2>
              <Link
                href="/military-demo"
                className="text-[10px] uppercase tracking-[0.12em] text-[#ffac33] hover:text-[#ffc266]"
              >
                Open Military View
              </Link>
            </div>
            {games.length === 0 ? (
              <div className="rounded-[12px] border border-[#2f3642] bg-[#111720] px-4 py-8 text-center">
                <p className="text-sm text-[#a7afbe]">No games found yet.</p>
                <p className="mt-1 text-xs text-[#758095]">
                  Launch a game on the left or set `GAMES_DIR` to a valid run directory.
                </p>
              </div>
            ) : (
              <div className="max-h-[70vh] space-y-3 overflow-auto pr-1">
                {games.map((game) => (
                  <Link
                    key={game.id}
                    href={`/game/${game.id}`}
                    className="group block rounded-[12px] border border-[#313846] bg-[#121924] p-3 transition-[border-color,background-color,transform] duration-150 hover:-translate-y-[1px] hover:border-[#4a5668] hover:bg-[#192231]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-[15px] font-semibold uppercase tracking-[0.05em] text-[#d8deea] group-hover:text-[#f3f6ff]">
                        {game.id}
                      </h3>
                      <span className="rounded-md border border-[#3a424f] bg-[#171e29] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[#97a2b4]">
                        {game.lastPhase}
                      </span>
                    </div>
                    <div className="mt-2 text-[11px] text-[#8390a4]">
                      {game.phases.length} phases
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {game.powers.map((power) => (
                        <span
                          key={power}
                          className="text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-[0.06em]"
                          style={{
                            backgroundColor: POWER_DISPLAY_COLORS[power] + "22",
                            color: POWER_DISPLAY_COLORS[power],
                            borderColor: POWER_DISPLAY_COLORS[power] + "55",
                          }}
                        >
                          {power}
                        </span>
                      ))}
                    </div>
                    {game.hasLog && (
                      <div className="mt-2 text-[10px] uppercase tracking-[0.1em] text-[#7f8a9a]">
                        log captured
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
