import { describe, expect, test } from "bun:test";
import { getConnectionIndicator } from "./connection-indicator";

describe("getConnectionIndicator", () => {
  test("returns offline state when disconnected", () => {
    expect(getConnectionIndicator(false, false, null)).toMatchObject({
      activeLamp: "red",
      stateChip: "LINK LOST",
      statusDetail: "Offline feed",
    });
  });

  test("returns receiving state when connected and queue is active", () => {
    expect(getConnectionIndicator(true, true, "Conversing")).toMatchObject({
      activeLamp: "amber",
      stateChip: "RECEIVING",
      statusDetail: "Conversing",
    });
  });

  test("returns standby state when connected and queue is idle", () => {
    expect(getConnectionIndicator(true, false, null)).toMatchObject({
      activeLamp: "green",
      stateChip: "STANDBY",
      statusDetail: "Circuit open - standby",
    });
  });
});
