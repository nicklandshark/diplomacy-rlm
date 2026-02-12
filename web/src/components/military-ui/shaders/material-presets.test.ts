import { describe, expect, test } from "bun:test";
import { getMaterialPreset, getStrictWebGLContext } from "./types";

describe("material presets", () => {
  test("returns expected static coefficients for steel, brass, and leather", () => {
    expect(getMaterialPreset("steel")).toEqual({
      key: "steel",
      tint: [0.6, 0.64, 0.7],
      ambient: 0.24,
      diffuse: 0.74,
      specular: 0.68,
      shininess: 72,
      roughness: 0.28,
      normalStrength: 1,
      lightDirection: [-0.36, -0.48, 0.8],
      normalMap: "/materials/normals/steel-normal.jpg",
    });

    expect(getMaterialPreset("brass")).toEqual({
      key: "brass",
      tint: [0.78, 0.62, 0.29],
      ambient: 0.22,
      diffuse: 0.7,
      specular: 0.82,
      shininess: 96,
      roughness: 0.2,
      normalStrength: 0.88,
      lightDirection: [-0.36, -0.48, 0.8],
      normalMap: "/materials/normals/brass-normal.jpg",
    });

    expect(getMaterialPreset("leather")).toEqual({
      key: "leather",
      tint: [0.34, 0.23, 0.16],
      ambient: 0.35,
      diffuse: 0.6,
      specular: 0.18,
      shininess: 26,
      roughness: 0.72,
      normalStrength: 0.62,
      lightDirection: [-0.36, -0.48, 0.8],
      normalMap: "/materials/normals/leather-normal.jpg",
    });
  });

  test("strict WebGL init returns null instead of throwing when unavailable", () => {
    expect(() => getStrictWebGLContext(null)).not.toThrow();
    expect(getStrictWebGLContext(null)).toBeNull();

    const nullContextCanvas = {
      getContext: () => null,
    } as unknown as Pick<HTMLCanvasElement, "getContext">;

    expect(() => getStrictWebGLContext(nullContextCanvas)).not.toThrow();
    expect(getStrictWebGLContext(nullContextCanvas)).toBeNull();

    const throwingCanvas = {
      getContext: () => {
        throw new Error("WebGL disabled");
      },
    } as unknown as Pick<HTMLCanvasElement, "getContext">;

    expect(() => getStrictWebGLContext(throwingCanvas)).not.toThrow();
    expect(getStrictWebGLContext(throwingCanvas)).toBeNull();
  });
});
