import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

const ASSETS_DIR = path.join(process.cwd(), "public", "ra3-assets");

export async function GET() {
  if (!fs.existsSync(ASSETS_DIR)) {
    return NextResponse.json({ components: [] });
  }

  const dirs = fs.readdirSync(ASSETS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .sort();

  const components = dirs.map(dir => {
    const dirPath = path.join(ASSETS_DIR, dir);
    // Top-level PNGs (apt overview images)
    const topFiles = fs.readdirSync(dirPath)
      .filter(f => f.endsWith(".png"))
      .sort();

    // Textures subdirectory
    const texDir = path.join(dirPath, "textures");
    const textures = fs.existsSync(texDir)
      ? fs.readdirSync(texDir).filter(f => f.endsWith(".png")).sort((a, b) => {
          const na = parseInt(a), nb = parseInt(b);
          if (!isNaN(na) && !isNaN(nb)) return na - nb;
          return a.localeCompare(b);
        })
      : [];

    return {
      name: dir,
      overview: topFiles.map(f => `/ra3-assets/${dir}/${f}`),
      textures: textures.map(f => `/ra3-assets/${dir}/textures/${f}`),
      totalCount: topFiles.length + textures.length,
    };
  });

  const totalAssets = components.reduce((sum, c) => sum + c.totalCount, 0);

  return NextResponse.json({ components, totalAssets });
}
