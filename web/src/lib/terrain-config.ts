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
  scale: 5.6,
  octaves: 8,
  lacunarity: 2.65,
  persistence: 0.47,
  ridgeMix: 0.27,
  warpStrength: 0.0,
  seaLevel: 0.29,
  coastSharp: 0.08,
  sunAngle: 2.4,
  sunElev: 0.7,
  ambient: 0.19,
  shadowDepth: 0.25,
  specular: 1.47,
  saturation: 1.0,
  warmth: -0.17,
  snowLine: 0.48,
  oceanDepth: 0.10,
  vignette: 0.2,
  erosion: 0.4,
  waterAnim: 1.0,
  heightmapBlend: 0.16,
  heightmapScale: 0.0,
};
