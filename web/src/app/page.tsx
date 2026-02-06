import Link from "next/link";
import { listGames } from "@/lib/game-data";
import { POWER_DISPLAY_COLORS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const games = listGames();

  if (games.length === 0) {
    return (
      <div className="text-center py-20 text-gray-400">
        <h2 className="text-xl mb-2">No games found</h2>
        <p>Set GAMES_DIR to a directory containing game outputs.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Games</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {games.map((game) => (
          <Link
            key={game.id}
            href={`/game/${game.id}`}
            className="block border border-gray-800 rounded-lg p-4 hover:border-gray-600 transition-colors bg-gray-900"
          >
            <h3 className="font-semibold text-lg mb-2">{game.id}</h3>
            <div className="text-sm text-gray-400 mb-2">
              {game.phases.length} phases &middot; Last: {game.lastPhase}
            </div>
            <div className="flex flex-wrap gap-1">
              {game.powers.map((power) => (
                <span
                  key={power}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: POWER_DISPLAY_COLORS[power] + "22",
                    color: POWER_DISPLAY_COLORS[power],
                    border: `1px solid ${POWER_DISPLAY_COLORS[power]}44`,
                  }}
                >
                  {power}
                </span>
              ))}
            </div>
            {game.hasLog && (
              <div className="text-xs text-gray-500 mt-2">Has game log</div>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
