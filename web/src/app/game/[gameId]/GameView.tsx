"use client";

import MilitaryGameView from "@/app/military-demo/components/MilitaryGameView";

interface Props {
  gameId: string;
  initialPhases: string[];
  svgContent: string;
}

export default function GameView({ gameId, initialPhases, svgContent }: Props) {
  return <MilitaryGameView gameId={gameId} initialPhases={initialPhases} svgContent={svgContent} />;
}
