/**
 * Rasterize SVG provinces into a classified mask texture for the terrain shader.
 *
 * Red channel  = per-power identity (unique R value per power)
 * Blue channel = water
 * Green channel = impassable (Switzerland, etc.)
 *
 * The resulting canvas can be uploaded directly to WebGL via texImage2D.
 */

const MASK_WIDTH = 2048;
// Maintain aspect ratio: SVG viewBox is 1835 x 1360
const MASK_HEIGHT = Math.round(MASK_WIDTH * (1360 / 1835));

const WATER_COLOR = "#0000ff";
const IMPASSABLE_COLOR = "#00ff00";

// Per-power R-channel encoding — the shader decodes these to apply
// AoH2-style per-country terrain tinting.
const POWER_COLORS: Record<string, string> = {
  neutral:   "#1a0000",  // R=26  ≈ 0.102
  nopower:   "#330000",  // R=51  ≈ 0.200
  austria:   "#4d0000",  // R=77  ≈ 0.302
  england:   "#660000",  // R=102 ≈ 0.400
  france:    "#800000",  // R=128 ≈ 0.502
  germany:   "#990000",  // R=153 ≈ 0.600
  italy:     "#b30000",  // R=179 ≈ 0.702
  russia:    "#cc0000",  // R=204 ≈ 0.800
  turkey:    "#e60000",  // R=230 ≈ 0.902
};

const LAND_CLASSES = Object.keys(POWER_COLORS);

/**
 * Generate a terrain classification mask from SVG content.
 * Returns an HTMLCanvasElement with land/water/impassable encoded in RGB channels.
 */
export async function generateTerrainMask(svgContent: string): Promise<HTMLCanvasElement> {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, "image/svg+xml");
  const svg = doc.querySelector("svg");
  if (!svg) throw new Error("No <svg> found in content");

  // Remove the inline <style> block — we'll override all fills
  const styleEls = svg.querySelectorAll("style");
  styleEls.forEach((el) => el.remove());

  // Set SVG dimensions explicitly for rasterization
  svg.setAttribute("width", String(MASK_WIDTH));
  svg.setAttribute("height", String(MASK_HEIGHT));
  // Force stretch — eliminates any sub-pixel offset from aspect ratio mismatch
  svg.setAttribute("preserveAspectRatio", "none");

  // Set background rect in MapLayer to water (blue) — ocean is the default
  const bgRect = svg.querySelector("#MapLayer > rect");
  if (bgRect) {
    bgRect.setAttribute("fill", WATER_COLOR);
    bgRect.removeAttribute("stroke");
  }

  // Classify all territory paths by their CSS class.
  // Set stroke to MATCH the fill color with width 2 — this seals boundary gaps
  // between adjacent territories. Without this, the 1px gaps where CSS strokes
  // used to be would show the blue background (= water) through.
  const STROKE_WIDTH = "3";
  const allPaths = svg.querySelectorAll("path, polygon, rect");
  allPaths.forEach((el) => {
    const classList = el.getAttribute("class") || "";
    const classes = classList.split(/\s+/);

    let color: string | null = null;
    if (classes.includes("water")) {
      color = WATER_COLOR;
    } else if (classes.includes("impassable")) {
      color = IMPASSABLE_COLOR;
    } else {
      for (const cls of classes) {
        if (POWER_COLORS[cls]) {
          color = POWER_COLORS[cls];
          break;
        }
      }
    }

    if (color) {
      el.setAttribute("fill", color);
      // Stroke matches fill to seal boundary gaps between adjacent territories
      el.setAttribute("stroke", color);
      el.setAttribute("stroke-width", STROKE_WIDTH);
      el.setAttribute("stroke-linejoin", "round");
    }
    // Remove fill-opacity and stroke-width that could interfere
    el.removeAttribute("fill-opacity");
    el.removeAttribute("stroke-opacity");
  });

  // Hide non-geography layers (units, labels, supply centers, orders)
  const hideLayers = [
    "#UnitLayer", "#SupplyCenterLayer", "#SupplyCenter",
    "#OrderLayer", "#LabelLayer", "#CurrentNote",
    "#overlay-portal", "#MouseLayer",
  ];
  hideLayers.forEach((sel) => {
    const el = svg.querySelector(sel);
    if (el) el.setAttribute("display", "none");
  });

  // Also hide text elements and symbol defs that might render
  svg.querySelectorAll("text").forEach((el) => el.setAttribute("display", "none"));

  // Serialize modified SVG to blob
  const serializer = new XMLSerializer();
  const svgStr = serializer.serializeToString(svg);
  const blob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);

  // Draw to offscreen canvas
  const canvas = document.createElement("canvas");
  canvas.width = MASK_WIDTH;
  canvas.height = MASK_HEIGHT;
  const ctx = canvas.getContext("2d")!;

  return new Promise<HTMLCanvasElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      ctx.drawImage(img, 0, 0, MASK_WIDTH, MASK_HEIGHT);
      URL.revokeObjectURL(url);
      resolve(canvas);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to rasterize SVG mask"));
    };
    img.src = url;
  });
}
