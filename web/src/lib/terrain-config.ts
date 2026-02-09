/** Terrain shader configuration — all parameters exposed as a typed API. */

export interface TerrainConfig {
  // Terrain shape
  scale: number;
  octaves: number;
  lacunarity: number;
  persistence: number;
  ridgeMix: number;
  warpStrength: number;

  // Land / sea
  seaLevel: number;
  coastSharp: number;

  // Lighting
  sunAngle: number;
  sunElev: number;
  ambient: number;
  shadowDepth: number;
  specular: number;

  // Colors
  saturation: number;
  warmth: number;
  snowLine: number;
  oceanDepth: number;

  // Effects
  vignette: number;
  erosion: number;
  waterAnim: number;

  // Heightmap
  heightmapBlend: number;
  heightmapScale: number;
}

export const TERRAIN_DEFAULTS: TerrainConfig = {
  scale: 5,
  octaves: 6,
  lacunarity: 2.1,
  persistence: 0.48,
  ridgeMix: 0.35,
  warpStrength: 0.45,
  seaLevel: -0.02,
  coastSharp: 0.08,
  sunAngle: 2.4,
  sunElev: 0.7,
  ambient: 0.32,
  shadowDepth: 0.25,
  specular: 0.8,
  saturation: 1.0,
  warmth: 0.0,
  snowLine: 0.6,
  oceanDepth: 0.6,
  vignette: 0.2,
  erosion: 0.4,
  waterAnim: 0.5,
  heightmapBlend: 0.7,
  heightmapScale: 0.8,
};

export const TERRAIN_PRESETS: Record<string, TerrainConfig> = {
  default: { ...TERRAIN_DEFAULTS },
  alpine: {
    scale: 7, octaves: 7, lacunarity: 2.2, persistence: 0.52, ridgeMix: 0.7,
    warpStrength: 0.6, seaLevel: -0.08,
    coastSharp: 0.06, sunAngle: 2.0, sunElev: 0.5, ambient: 0.28, shadowDepth: 0.4,
    specular: 0.6, saturation: 0.85, warmth: -0.05, snowLine: 0.45, oceanDepth: 0.8,
    vignette: 0.2, erosion: 0.6, waterAnim: 0.3,
    heightmapBlend: 0.85, heightmapScale: 1.0,
  },
  archipelago: {
    scale: 4, octaves: 5, lacunarity: 2.0, persistence: 0.45, ridgeMix: 0.15,
    warpStrength: 0.3, seaLevel: 0.12,
    coastSharp: 0.04, sunAngle: 2.8, sunElev: 0.8, ambient: 0.35, shadowDepth: 0.15,
    specular: 1.2, saturation: 1.1, warmth: 0.08, snowLine: 0.8, oceanDepth: 0.5,
    vignette: 0.15, erosion: 0.2, waterAnim: 0.7,
    heightmapBlend: 0.4, heightmapScale: 0.6,
  },
  lowlands: {
    scale: 3.5, octaves: 5, lacunarity: 2.0, persistence: 0.4, ridgeMix: 0.05,
    warpStrength: 0.2, seaLevel: -0.1,
    coastSharp: 0.1, sunAngle: 2.4, sunElev: 1.0, ambient: 0.4, shadowDepth: 0.1,
    specular: 0.5, saturation: 1.15, warmth: 0.05, snowLine: 0.8, oceanDepth: 0.4,
    vignette: 0.2, erosion: 0.1, waterAnim: 0.4,
    heightmapBlend: 0.5, heightmapScale: 0.5,
  },
  dramatic: {
    scale: 6, octaves: 8, lacunarity: 2.3, persistence: 0.55, ridgeMix: 0.6,
    warpStrength: 0.8, seaLevel: 0.0,
    coastSharp: 0.05, sunAngle: 1.8, sunElev: 0.4, ambient: 0.22, shadowDepth: 0.5,
    specular: 1.5, saturation: 0.9, warmth: -0.1, snowLine: 0.5, oceanDepth: 0.9,
    vignette: 0.35, erosion: 0.7, waterAnim: 0.4,
    heightmapBlend: 0.8, heightmapScale: 1.2,
  },
  geographic: {
    scale: 5, octaves: 6, lacunarity: 2.1, persistence: 0.48, ridgeMix: 0.35,
    warpStrength: 0.3, seaLevel: -0.02,
    coastSharp: 0.08, sunAngle: 2.4, sunElev: 0.7, ambient: 0.32, shadowDepth: 0.25,
    specular: 0.8, saturation: 1.0, warmth: 0.02, snowLine: 0.55, oceanDepth: 0.6,
    vignette: 0.15, erosion: 0.4, waterAnim: 0.5,
    heightmapBlend: 1.0, heightmapScale: 0.9,
  },
};

/** Parameter metadata for building UI controls. */
export interface ParamMeta {
  key: keyof TerrainConfig;
  label: string;
  min: number;
  max: number;
  step: number;
  group: string;
}

export const TERRAIN_PARAMS: ParamMeta[] = [
  // Terrain shape
  { key: "scale", label: "Scale", min: 1, max: 12, step: 0.1, group: "Terrain Shape" },
  { key: "octaves", label: "Octaves", min: 1, max: 8, step: 1, group: "Terrain Shape" },
  { key: "lacunarity", label: "Lacunarity", min: 1.5, max: 3, step: 0.05, group: "Terrain Shape" },
  { key: "persistence", label: "Persistence", min: 0.2, max: 0.7, step: 0.01, group: "Terrain Shape" },
  { key: "ridgeMix", label: "Ridge Mix", min: 0, max: 1, step: 0.01, group: "Terrain Shape" },
  { key: "warpStrength", label: "Warp Strength", min: 0, max: 1.5, step: 0.01, group: "Terrain Shape" },
  // Land / sea
  { key: "seaLevel", label: "Sea Level", min: -0.3, max: 0.3, step: 0.01, group: "Land / Sea" },
  { key: "coastSharp", label: "Coast Sharpness", min: 0.01, max: 0.3, step: 0.005, group: "Land / Sea" },
  // Lighting
  { key: "sunAngle", label: "Sun Angle", min: 0, max: 6.28, step: 0.01, group: "Lighting" },
  { key: "sunElev", label: "Sun Elevation", min: 0.2, max: 1.5, step: 0.01, group: "Lighting" },
  { key: "ambient", label: "Ambient", min: 0.1, max: 0.7, step: 0.01, group: "Lighting" },
  { key: "shadowDepth", label: "Shadow Depth", min: 0, max: 0.6, step: 0.01, group: "Lighting" },
  { key: "specular", label: "Specular (water)", min: 0, max: 2, step: 0.01, group: "Lighting" },
  // Colors
  { key: "saturation", label: "Saturation", min: 0.3, max: 2, step: 0.01, group: "Colors" },
  { key: "warmth", label: "Warmth", min: -0.3, max: 0.3, step: 0.01, group: "Colors" },
  { key: "snowLine", label: "Snow Line", min: 0.3, max: 0.9, step: 0.01, group: "Colors" },
  { key: "oceanDepth", label: "Ocean Depth", min: 0.1, max: 1.5, step: 0.01, group: "Colors" },
  // Effects
  { key: "vignette", label: "Vignette", min: 0, max: 0.6, step: 0.01, group: "Effects" },
  { key: "erosion", label: "Erosion", min: 0, max: 1, step: 0.01, group: "Effects" },
  { key: "waterAnim", label: "Water Anim", min: 0, max: 1, step: 0.01, group: "Effects" },
  // Heightmap
  { key: "heightmapBlend", label: "Heightmap Blend", min: 0, max: 1, step: 0.01, group: "Heightmap" },
  { key: "heightmapScale", label: "Heightmap Scale", min: 0, max: 2, step: 0.01, group: "Heightmap" },
];
