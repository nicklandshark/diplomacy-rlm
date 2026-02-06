import { listPhases } from "@/lib/game-data";

export const dynamic = "force-dynamic";

export default async function GameLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const phases = listPhases(gameId);

  return (
    <div>
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-1">{gameId}</h2>
        <div className="text-sm text-gray-400">{phases.length} phases available</div>
      </div>
      {children}
    </div>
  );
}
