import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import ConnectionStatusBadge from "./ConnectionStatusBadge";
import type { ConnectionIndicatorState } from "./connection-indicator";

function renderBadge(indicator: ConnectionIndicatorState): string {
  return renderToStaticMarkup(<ConnectionStatusBadge indicator={indicator} />);
}

describe("ConnectionStatusBadge", () => {
  test("renders a single offline status capsule without legacy OFF copy", () => {
    const html = renderBadge({
      activeLamp: "red",
      stateChip: "LINK LOST",
      stateChipClass: "text-[#e7caca]",
      statusDetail: "Offline feed",
    });

    expect(html).toContain('data-ui="connection-status-badge"');
    expect(html).toContain('data-active-lamp="red"');
    expect(html).toContain("LINK LOST");
    expect(html).not.toContain("Offline feed");
    expect(html).not.toContain(">OFF<");
  });

  test("marks receiving state with the amber lamp", () => {
    const html = renderBadge({
      activeLamp: "amber",
      stateChip: "RECEIVING",
      stateChipClass: "text-[#efe2bb]",
      statusDetail: "Receiving transmissions",
    });

    expect(html).toContain('data-active-lamp="amber"');
    expect(html).toContain("RECEIVING");
  });
});
