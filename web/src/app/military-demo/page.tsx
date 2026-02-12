import Link from "next/link";
import fs from "fs";
import path from "path";
import { listGames, listPhases } from "@/lib/game-data";
import MilitaryGameView from "./components/MilitaryGameView";
import { firstQueryValue, resolveMilitaryDemoGame } from "./game-selection";

export const dynamic = "force-dynamic";

// Load SVG from standard map
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

// Mock phases from our fixture data
const MOCK_PHASES = [
  "S1901M",
  "F1901M",
  "S1902M",
  "F1902M",
  "S1902R",
  "F1902R",
  "S1903M",
  "F1903M",
  "S1903R",
  "F1903R",
  "S1904M",
  "F1904M",
  "S1905M",
  "F1905M",
];

export default async function MilitaryDemoPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const requestedGameId = firstQueryValue(query.gameId);
  const useMock = firstQueryValue(query.msw) === "1";
  const games = listGames();
  const selection = resolveMilitaryDemoGame({
    games,
    requestedGameId,
    useMock,
    mockGameId: "demo",
    mockPhases: MOCK_PHASES,
  });

  if (selection.mode === "empty" || !selection.gameId) {
    return (
      <div className="min-h-[60vh] grid place-items-center px-6">
        <div className="w-full max-w-[560px] rounded-[14px] border border-[#2d3139] bg-[linear-gradient(140deg,#11151c_0%,#0d1118_100%)] p-6 shadow-[0_18px_40px_rgba(0,0,0,0.45)]">
          <p className="text-[11px] uppercase tracking-[0.16em] text-[#8992a2]">
            Military Viewer
          </p>
          <h1 className="mt-2 text-[24px] font-semibold tracking-[0.03em] text-[#d9deea]">
            No Game Data Found
          </h1>
          <p className="mt-3 text-[13px] leading-6 text-[#9ea8b8]">
            Launch a game from the home screen first, then return to
            <span className="mx-1 rounded bg-[#1b202a] px-1.5 py-0.5 text-[#c4cbda]">/military-demo</span>
            to view live API and SSE updates.
          </p>
          <div className="mt-5">
            <Link
              href="/"
              className="inline-flex items-center rounded-md border border-[#3a414f] bg-[#171d27] px-3 py-2 text-[12px] font-medium uppercase tracking-[0.09em] text-[#c9d1e2] hover:border-[#4d5768] hover:bg-[#1e2633]"
            >
              Open Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const phases = selection.mode === "live" ? listPhases(selection.gameId) : selection.phases;
  const svgContent = getSvgContent();

  return <MilitaryGameView gameId={selection.gameId} initialPhases={phases} svgContent={svgContent} />;
}
