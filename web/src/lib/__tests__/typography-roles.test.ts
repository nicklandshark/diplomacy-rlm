import { describe, expect, it } from "vitest";
import { FONT_ROLE_FAMILIES } from "../typography";

describe("typography role mapping", () => {
  it("maps each UI role to the requested family", () => {
    expect(FONT_ROLE_FAMILIES.baseSans).toBe("MD System Trial");
    expect(FONT_ROLE_FAMILIES.panelHeadingButton).toBe("MD System Condensed Trial");
    expect(FONT_ROLE_FAMILIES.activityMono).toBe("Geist Pixel Square");
    expect(FONT_ROLE_FAMILIES.ordersMessagesSummary).toBe("Decima Mono");
    expect(FONT_ROLE_FAMILIES.title).toBe("Tanker");
    expect(FONT_ROLE_FAMILIES.phaseAndMemory).toBe("Kawingan");
  });
});
