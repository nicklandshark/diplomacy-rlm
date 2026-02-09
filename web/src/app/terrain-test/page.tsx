import TerrainTestView from "./TerrainTestView";

export const dynamic = "force-dynamic";

export default async function TerrainTestPage() {
  const fs = await import("fs");
  const path = await import("path");
  const svgPath = path.join(process.cwd(), "public", "standard-base.svg");
  let svgContent = "";
  try {
    svgContent = fs.readFileSync(svgPath, "utf-8");
  } catch {
    // SVG file not found
  }

  return <TerrainTestView svgContent={svgContent} />;
}
