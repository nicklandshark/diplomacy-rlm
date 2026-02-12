import { describe, expect, it } from "vitest";
import { clampCrtDistortion } from "./CRTDistortion";

describe("CRTDistortion", () => {
  it("clamps distortion to a safe monitor range", () => {
    expect(clampCrtDistortion(-0.2)).toBe(0);
    expect(clampCrtDistortion(0.08)).toBe(0.08);
    expect(clampCrtDistortion(0.42)).toBe(0.14);
  });
});
