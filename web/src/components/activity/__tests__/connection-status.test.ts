import { describe, expect, it } from "vitest";
import {
  getConnectionDisplayState,
  resolveConnectionSignal,
} from "../connection-status";

describe("connection-status", () => {
  it("uses online signal when SSE is connected", () => {
    expect(resolveConnectionSignal(true, null)).toBe("online");
  });

  it("uses reconnecting signal while retrying the SSE stream", () => {
    expect(resolveConnectionSignal(false, "Reconnecting...")).toBe("reconnecting");
  });

  it("uses offline signal when disconnected and not reconnecting", () => {
    expect(resolveConnectionSignal(false, null)).toBe("offline");
    expect(resolveConnectionSignal(false, "Upstream unavailable")).toBe("offline");
  });

  it("returns themed copy for each signal", () => {
    expect(getConnectionDisplayState("online")).toMatchObject({
      feedLabel: "Live feed",
      activeLamp: "green",
      rockerState: "ON",
    });
    expect(getConnectionDisplayState("reconnecting")).toMatchObject({
      feedLabel: "Reconnecting",
      activeLamp: "amber",
      rockerState: "ON",
    });
    expect(getConnectionDisplayState("offline")).toMatchObject({
      feedLabel: "Offline feed",
      activeLamp: "red",
      rockerState: "OFF",
    });
  });
});
