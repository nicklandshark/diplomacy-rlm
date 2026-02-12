import { describe, expect, it } from "vitest";
import {
  getOrderResolution,
  getOrdersPanelLayoutMode,
  toOrderResultLabel,
  toOrderRowModel,
} from "../orders-layout";

describe("orders-layout", () => {
  it("maps empty result arrays to resolved", () => {
    expect(
      getOrderResolution("A VIE H", {
        "A VIE": [],
      }),
    ).toBe("resolved");
  });

  it("maps void results to void", () => {
    expect(
      getOrderResolution("A BUD S A VIE - GAL", {
        "A BUD": ["void"],
      }),
    ).toBe("void");
  });

  it("maps bounce-like outcomes to failed", () => {
    expect(
      getOrderResolution("F TRI - ADR", {
        "F TRI": ["bounce"],
      }),
    ).toBe("failed");
  });

  it("falls back to pending when no result exists", () => {
    expect(getOrderResolution("A PAR - BUR", null)).toBe("pending");
  });

  it("builds compact row copy from support orders", () => {
    expect(
      toOrderRowModel("A BUD S A VIE - GAL", {
        "A BUD": [],
      }),
    ).toMatchObject({
      unit: "A BUD",
      order: "SUPPORT VIE-GAL",
      resolution: "resolved",
    });
  });

  it("uses compact layout for narrow viewport breakpoints", () => {
    expect(getOrdersPanelLayoutMode(560, 880)).toBe("compact");
    expect(getOrdersPanelLayoutMode(480, 1220)).toBe("compact");
  });

  it("uses normal layout for mid-width breakpoints", () => {
    expect(getOrdersPanelLayoutMode(640, 1220)).toBe("normal");
  });

  it("uses wide layout for large viewport and panel width", () => {
    expect(getOrdersPanelLayoutMode(780, 1460)).toBe("wide");
  });

  it("normalizes resolved and empty result strings for compact labels", () => {
    expect(toOrderResultLabel("resolved", "success")).toBe("success");
    expect(toOrderResultLabel("", "pending")).toBe("no report");
  });
});
