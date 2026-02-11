import { describe, expect, test } from "bun:test";
import { buildMessageThreadRows, buildOrderRows, buildSummaryMetricRows } from "./fsb-utils";
import type { Message, PhaseOrders, PhaseResults } from "@/lib/types";

describe("buildOrderRows", () => {
  test("shapes deterministic FSB rows with status mapping", () => {
    const orders: PhaseOrders = {
      FRANCE: ["A PAR - BUR", "F MAR H"],
      GERMANY: ["A MUN - BUR"],
      ENGLAND: ["F ENG - NTH"],
    };
    const results: PhaseResults = {
      "A PAR": ["bounce"],
      "F MAR": [],
      "A MUN": ["void"],
    };

    const rows = buildOrderRows(orders, results, new Set(["ENGLAND"]));

    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.power)).toEqual(["FRANCE", "FRANCE", "GERMANY", "ENGLAND"]);

    expect(rows[0]).toMatchObject({
      power: "FRANCE",
      unit: "A PAR",
      order: "MOVE BUR",
      result: "bounce",
      status: "failed",
    });
    expect(rows[1]).toMatchObject({
      power: "FRANCE",
      unit: "F MAR",
      order: "HOLD",
      result: "resolved",
      status: "success",
    });
    expect(rows[2]).toMatchObject({
      power: "GERMANY",
      unit: "A MUN",
      order: "MOVE BUR",
      result: "void",
      status: "void",
    });
    expect(rows[3]).toMatchObject({
      power: "ENGLAND",
      unit: "F ENG",
      order: "MOVE NTH",
      result: "awaiting adjudication",
      status: "pending",
    });
  });
});

describe("buildMessageThreadRows", () => {
  test("groups canonical threads, keeps live-first ordering, and truncates preview", () => {
    const messages: Message[] = [
      {
        sender: "FRANCE",
        recipient: "ENGLAND",
        phase: "S1901M",
        message: "Opening move to the channel.",
      },
      {
        sender: "ENGLAND",
        recipient: "FRANCE",
        phase: "S1901M",
        message: "Agreed, keep DMZ at English Channel.",
      },
      {
        sender: "GERMANY",
        recipient: "RUSSIA",
        phase: "S1901M",
        message: "Long reconnaissance update that is definitely over fifty characters to trigger preview truncation.",
      },
    ];

    const liveMessages: Message[] = [
      {
        sender: "FRANCE",
        recipient: "ENGLAND",
        phase: "S1901M",
        message: "Live update from Paris.",
      },
    ];

    const rows = buildMessageThreadRows(messages, liveMessages);

    expect(rows).toHaveLength(2);

    expect(rows[0]).toMatchObject({
      key: "ENGLAND↔FRANCE",
      count: 3,
      hasLive: true,
      status: "live",
      preview: "Live update from Paris.",
    });

    expect(rows[1].key).toBe("GERMANY↔RUSSIA");
    expect(rows[1].count).toBe(1);
    expect(rows[1].status).toBe("archive");
    expect(rows[1].preview.endsWith("...")).toBe(true);
    expect(rows[1].preview.length).toBe(53);
  });
});

describe("buildSummaryMetricRows", () => {
  test("formats summary metrics for FSB rendering", () => {
    const rows = buildSummaryMetricRows({
      phases: ["S1901M", "F1901M", "S1902M"],
      finalStandings: [
        { power: "FRANCE", scs: 12, units: 11 },
        { power: "ENGLAND", scs: 10, units: 9 },
        { power: "GERMANY", scs: 0, units: 0 },
      ],
      eliminated: [{ power: "GERMANY", phase: "F1901M" }],
      winOdds: [
        { power: "FRANCE", pct: 64 },
        { power: "ENGLAND", pct: 36 },
      ],
      isLive: true,
    });

    expect(rows).toEqual([
      { key: "state", metric: "State", value: "In Progress", tone: "ok" },
      { key: "leader", metric: "Leader", value: "FRANCE (12 SC)", tone: "ok" },
      { key: "active", metric: "Active Powers", value: "2", tone: "ok" },
      { key: "eliminated", metric: "Eliminated", value: "1", tone: "warn" },
      { key: "phases", metric: "Phases", value: "3", tone: "neutral" },
      { key: "top-odds", metric: "Top Odds", value: "FRANCE 64%", tone: "accent" },
    ]);
  });
});
