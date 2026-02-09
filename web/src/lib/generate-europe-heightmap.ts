/**
 * Programmatic European heightmap generator.
 *
 * Paints known geographic features (Alps, Carpathians, Pyrenees, etc.) as
 * smooth gaussian blobs on a canvas. The grayscale output encodes elevation:
 *   0 = lowest (deep ocean / plains)
 *   255 = highest (Alpine peaks)
 *
 * Returns an HTMLCanvasElement that can be uploaded directly to WebGL via texImage2D.
 *
 * Uses IndexedDB caching — the heightmap is fully deterministic (no inputs),
 * so a static version key is used. Bump HEIGHTMAP_VERSION when feature
 * coordinates change.
 */

import { getCachedImageData, setCachedImageData } from "./texture-cache";

const HEIGHTMAP_VERSION = "europe-heightmap-v1";

const HM_WIDTH = 2048;
const HM_HEIGHT = Math.round(HM_WIDTH * (1360 / 1835)); // ≈1520

interface GeoFeature {
  /** Label for debugging */
  name: string;
  /** Center in normalized UV [0-1] relative to map */
  cx: number;
  cy: number;
  /** Radii (horizontal, vertical) in UV space */
  rx: number;
  ry: number;
  /** Peak height [0-1] */
  peak: number;
  /** Falloff sharpness — higher = steeper edges (1 = gentle gaussian, 3 = sharp peak) */
  sharpness: number;
  /** Optional rotation in radians */
  rotation?: number;
}

/**
 * European geographic features positioned on the standard Diplomacy map.
 * UV coordinates calibrated to the vendored SVG (1835x1360 viewBox).
 */
const FEATURES: GeoFeature[] = [
  // ---- Major mountain ranges ----
  {
    name: "Alps",
    cx: 0.46, cy: 0.62,
    rx: 0.08, ry: 0.03,
    peak: 1.0, sharpness: 2.2,
    rotation: -0.3,
  },
  {
    name: "Alps (eastern arc)",
    cx: 0.52, cy: 0.60,
    rx: 0.05, ry: 0.025,
    peak: 0.85, sharpness: 2.0,
    rotation: -0.5,
  },
  {
    name: "Scandinavian Mountains",
    cx: 0.45, cy: 0.15,
    rx: 0.03, ry: 0.16,
    peak: 0.8, sharpness: 1.8,
    rotation: 0.15,
  },
  {
    name: "Scandinavian Mts (southern tail)",
    cx: 0.42, cy: 0.30,
    rx: 0.03, ry: 0.06,
    peak: 0.65, sharpness: 1.6,
  },
  {
    name: "Carpathians (western arc)",
    cx: 0.58, cy: 0.55,
    rx: 0.04, ry: 0.06,
    peak: 0.7, sharpness: 2.0,
    rotation: -0.4,
  },
  {
    name: "Carpathians (eastern arc)",
    cx: 0.64, cy: 0.60,
    rx: 0.03, ry: 0.06,
    peak: 0.65, sharpness: 1.8,
    rotation: 0.3,
  },
  {
    name: "Pyrenees",
    cx: 0.28, cy: 0.72,
    rx: 0.07, ry: 0.02,
    peak: 0.65, sharpness: 2.2,
    rotation: 0.05,
  },
  {
    name: "Balkans / Dinaric Alps",
    cx: 0.55, cy: 0.72,
    rx: 0.03, ry: 0.08,
    peak: 0.6, sharpness: 1.8,
    rotation: 0.2,
  },
  {
    name: "Pindus (Greece)",
    cx: 0.56, cy: 0.82,
    rx: 0.02, ry: 0.05,
    peak: 0.5, sharpness: 1.6,
  },
  {
    name: "Scottish Highlands",
    cx: 0.30, cy: 0.26,
    rx: 0.025, ry: 0.03,
    peak: 0.4, sharpness: 1.5,
  },
  {
    name: "Apennines",
    cx: 0.47, cy: 0.76,
    rx: 0.015, ry: 0.07,
    peak: 0.55, sharpness: 1.8,
    rotation: -0.15,
  },
  {
    name: "Caucasus (edge of map)",
    cx: 0.88, cy: 0.64,
    rx: 0.07, ry: 0.02,
    peak: 0.8, sharpness: 2.5,
    rotation: -0.2,
  },
  {
    name: "Anatolian highlands",
    cx: 0.82, cy: 0.80,
    rx: 0.08, ry: 0.04,
    peak: 0.55, sharpness: 1.4,
  },

  // ---- Plateaus and uplands ----
  {
    name: "Iberian Meseta",
    cx: 0.20, cy: 0.78,
    rx: 0.08, ry: 0.06,
    peak: 0.35, sharpness: 1.2,
  },
  {
    name: "Massif Central (France)",
    cx: 0.35, cy: 0.66,
    rx: 0.04, ry: 0.04,
    peak: 0.35, sharpness: 1.3,
  },
  {
    name: "Welsh / Pennine uplands",
    cx: 0.29, cy: 0.35,
    rx: 0.02, ry: 0.04,
    peak: 0.3, sharpness: 1.3,
  },

  // ---- Lowlands (explicitly low, suppress noise) ----
  {
    name: "North European Plain",
    cx: 0.52, cy: 0.45,
    rx: 0.15, ry: 0.06,
    peak: 0.15, sharpness: 0.8,
  },
  {
    name: "Russian Lowlands",
    cx: 0.76, cy: 0.35,
    rx: 0.12, ry: 0.12,
    peak: 0.12, sharpness: 0.7,
  },
  {
    name: "Po Valley",
    cx: 0.46, cy: 0.67,
    rx: 0.04, ry: 0.015,
    peak: 0.18, sharpness: 0.9,
  },

  // ---- Ocean depth zones ----
  {
    name: "Atlantic deep",
    cx: 0.08, cy: 0.45,
    rx: 0.10, ry: 0.25,
    peak: 0.08, sharpness: 0.6,
  },
  {
    name: "Mediterranean basin",
    cx: 0.45, cy: 0.85,
    rx: 0.18, ry: 0.05,
    peak: 0.35, sharpness: 0.9,
  },
  {
    name: "Norwegian Sea deep",
    cx: 0.32, cy: 0.08,
    rx: 0.10, ry: 0.08,
    peak: 0.10, sharpness: 0.7,
  },
];

/**
 * Evaluate a single gaussian blob at point (px, py) in UV space.
 */
function evalFeature(f: GeoFeature, px: number, py: number): number {
  let dx = px - f.cx;
  let dy = py - f.cy;

  // Apply rotation if specified
  if (f.rotation) {
    const cos = Math.cos(f.rotation);
    const sin = Math.sin(f.rotation);
    const rdx = dx * cos + dy * sin;
    const rdy = -dx * sin + dy * cos;
    dx = rdx;
    dy = rdy;
  }

  // Normalized distance (elliptical)
  const dist2 = (dx * dx) / (f.rx * f.rx) + (dy * dy) / (f.ry * f.ry);

  // Gaussian with variable sharpness
  // sharpness controls how quickly the blob falls off
  return f.peak * Math.exp(-dist2 * f.sharpness);
}

/**
 * Generate a European elevation heightmap as a grayscale canvas.
 * Checks IndexedDB cache first — on hit, returns in <5ms.
 *
 * @returns HTMLCanvasElement (2048 x ~1520, grayscale via ImageData)
 */
export async function generateEuropeHeightmap(): Promise<HTMLCanvasElement> {
  // Try cache first
  const cached = await getCachedImageData(HEIGHTMAP_VERSION);
  if (cached) {
    const canvas = document.createElement("canvas");
    canvas.width = cached.width;
    canvas.height = cached.height;
    const ctx = canvas.getContext("2d")!;
    ctx.putImageData(cached, 0, 0);
    return canvas;
  }

  // Cache miss — full generation
  const canvas = generateHeightmapFresh();

  // Store in cache (async, don't block return)
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  setCachedImageData(HEIGHTMAP_VERSION, imageData);

  return canvas;
}

/** Full heightmap generation (the expensive path). */
function generateHeightmapFresh(): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = HM_WIDTH;
  canvas.height = HM_HEIGHT;
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.createImageData(HM_WIDTH, HM_HEIGHT);
  const data = imageData.data;

  for (let y = 0; y < HM_HEIGHT; y++) {
    const v = y / HM_HEIGHT;
    for (let x = 0; x < HM_WIDTH; x++) {
      const u = x / HM_WIDTH;

      // Accumulate: take the max of all features at this point
      // (mountains dominate over lowland definitions)
      let h = 0;
      for (const f of FEATURES) {
        h = Math.max(h, evalFeature(f, u, v));
      }

      // Clamp to [0, 1]
      h = Math.min(1, Math.max(0, h));

      const byte = Math.round(h * 255);
      const idx = (y * HM_WIDTH + x) * 4;
      data[idx] = byte;     // R
      data[idx + 1] = byte; // G
      data[idx + 2] = byte; // B
      data[idx + 3] = 255;  // A
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
