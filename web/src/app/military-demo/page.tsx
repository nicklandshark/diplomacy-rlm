import fs from "fs";
import path from "path";
import MilitaryGameView from "./components/MilitaryGameView";

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
  "W1902A",
  "S1903M",
  "F1903M",
  "S1903R",
  "F1903R",
  "W1903A",
  "S1904M",
  "F1904M",
  "S1905M",
  "F1905M",
];

export default function MilitaryDemoPage() {
  const svgContent = getSvgContent();

  // Use the MilitaryGameView component with full military styling
  return <MilitaryGameView gameId="demo" initialPhases={MOCK_PHASES} svgContent={svgContent} />;
}
