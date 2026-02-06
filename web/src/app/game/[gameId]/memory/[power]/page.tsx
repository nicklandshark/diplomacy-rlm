import { readMemory, listPhases } from "@/lib/game-data";
import MemoryViewer from "@/components/memory/MemoryViewer";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MemoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ gameId: string; power: string }>;
  searchParams: Promise<{ phase?: string }>;
}) {
  const { gameId, power } = await params;
  const { phase } = await searchParams;
  const upperPower = power.toUpperCase();
  const phases = listPhases(gameId);
  const selectedPhase = phase || phases[phases.length - 1];
  const content = readMemory(gameId, upperPower, selectedPhase);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">{upperPower} Memory</h3>
        <Link
          href={`/game/${gameId}`}
          className="text-sm text-blue-400 hover:text-blue-300"
        >
          Back to game
        </Link>
      </div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {phases.map((p) => (
          <Link
            key={p}
            href={`/game/${gameId}/memory/${power}?phase=${p}`}
            className={`px-2 py-1 text-xs rounded ${
              p === selectedPhase ? "bg-blue-600 text-white" : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {p}
          </Link>
        ))}
      </div>
      {content ? (
        <div className="border border-gray-800 rounded bg-gray-900">
          <MemoryViewer content={content} />
        </div>
      ) : (
        <div className="text-gray-500">No memory file found for {upperPower} at phase {selectedPhase}.</div>
      )}
    </div>
  );
}
