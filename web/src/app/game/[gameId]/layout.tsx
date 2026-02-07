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

  return <>{children}</>;
}
