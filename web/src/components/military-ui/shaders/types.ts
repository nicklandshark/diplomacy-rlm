export type MaterialPresetKey = "steel" | "brass" | "leather";
export type Vec3 = [number, number, number];

export interface MaterialPreset {
  key: MaterialPresetKey;
  tint: Vec3;
  ambient: number;
  diffuse: number;
  specular: number;
  shininess: number;
  roughness: number;
  normalStrength: number;
  lightDirection: Vec3;
  normalMap: string;
}

const STATIC_LIGHT_DIRECTION: Vec3 = [-0.36, -0.48, 0.8];

const MATERIAL_PRESETS: Record<MaterialPresetKey, MaterialPreset> = {
  steel: {
    key: "steel",
    tint: [0.6, 0.64, 0.7],
    ambient: 0.24,
    diffuse: 0.74,
    specular: 0.68,
    shininess: 72,
    roughness: 0.28,
    normalStrength: 1,
    lightDirection: STATIC_LIGHT_DIRECTION,
    normalMap: "/materials/normals/steel-normal.jpg",
  },
  brass: {
    key: "brass",
    tint: [0.78, 0.62, 0.29],
    ambient: 0.22,
    diffuse: 0.7,
    specular: 0.82,
    shininess: 96,
    roughness: 0.2,
    normalStrength: 0.88,
    lightDirection: STATIC_LIGHT_DIRECTION,
    normalMap: "/materials/normals/brass-normal.jpg",
  },
  leather: {
    key: "leather",
    tint: [0.34, 0.23, 0.16],
    ambient: 0.35,
    diffuse: 0.6,
    specular: 0.18,
    shininess: 26,
    roughness: 0.72,
    normalStrength: 0.62,
    lightDirection: STATIC_LIGHT_DIRECTION,
    normalMap: "/materials/normals/leather-normal.jpg",
  },
};

export function getMaterialPreset(key: MaterialPresetKey): MaterialPreset {
  const preset = MATERIAL_PRESETS[key];
  return {
    ...preset,
    tint: [...preset.tint] as Vec3,
    lightDirection: [...preset.lightDirection] as Vec3,
  };
}

const STRICT_WEBGL_CONTEXT_OPTIONS: WebGLContextAttributes = {
  alpha: true,
  antialias: true,
  depth: false,
  stencil: false,
  premultipliedAlpha: false,
  preserveDrawingBuffer: false,
};

export function getStrictWebGLContext(canvas: Pick<HTMLCanvasElement, "getContext"> | null): WebGLRenderingContext | null {
  if (!canvas) return null;

  try {
    const webgl =
      canvas.getContext("webgl", STRICT_WEBGL_CONTEXT_OPTIONS) ??
      canvas.getContext("experimental-webgl", STRICT_WEBGL_CONTEXT_OPTIONS);

    return webgl as WebGLRenderingContext | null;
  } catch {
    return null;
  }
}
