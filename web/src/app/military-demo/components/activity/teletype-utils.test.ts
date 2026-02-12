import { describe, expect, test } from "bun:test";
import type { GameLogEvent, LiveEvent } from "../../../../../../web/src/lib/types";
import {
  appendUniquePrintedLine,
  advanceTypedLine,
  buildTeletypeBacklogQueue,
  formatGameLogEntryLine,
  formatLiveEventLine,
  trimTeletypeBuffer,
  type TeletypeLine,
} from "./teletype-utils";

function makeLiveEvent(overrides: Partial<LiveEvent> = {}): LiveEvent {
  return {
    event_id: 1,
    event_type: "step.start",
    priority: 0,
    ts_wall: 1700000000,
    phase: "S1901M",
    step: "strategize",
    power: "FRANCE",
    payload: {},
    ...overrides,
  };
}

describe("buildTeletypeBacklogQueue", () => {
  test("orders backlog entries first, then live entries", () => {
    const gameLog: GameLogEvent[] = [
      { event: "processed", phase: "S1901M", duration_seconds: 61 },
      { event: "converse_complete", phase: "S1901M", rounds: 2, messages: 7 },
    ];

    const events: LiveEvent[] = [
      makeLiveEvent({ event_id: 100, event_type: "step.start", step: "strategize" }),
      makeLiveEvent({
        event_id: 101,
        event_type: "message.flushed",
        payload: { sender: "FRANCE", recipient: "GERMANY", message: "Shall we DMZ Burgundy?" },
      }),
    ];

    const queue = buildTeletypeBacklogQueue({ gameLog, events });

    expect(queue).toHaveLength(4);
    expect(queue.map((line) => line.id)).toEqual([
      "backlog:0:processed:S1901M",
      "backlog:1:converse_complete:S1901M",
      "live:100",
      "live:101",
    ]);
    expect(queue.map((line) => line.source)).toEqual(["backlog", "backlog", "live", "live"]);
  });

  test("skips malformed entries safely", () => {
    const queue = buildTeletypeBacklogQueue({
      gameLog: [{ event: "unknown", phase: "S1901M" }],
      events: [
        makeLiveEvent({ event_id: 9, event_type: "unknown.type" }),
        makeLiveEvent({ event_id: 10, event_type: "orders.submitted", payload: { orders: ["A PAR - BUR"] } }),
      ],
    });

    expect(queue).toHaveLength(1);
    expect(queue[0]?.id).toBe("live:10");
  });
});

describe("trimTeletypeBuffer", () => {
  test("keeps newest lines within max buffer size", () => {
    const lines: TeletypeLine[] = [
      { id: "1", text: "one", source: "backlog", tone: "neutral" },
      { id: "2", text: "two", source: "backlog", tone: "neutral" },
      { id: "3", text: "three", source: "live", tone: "active" },
      { id: "4", text: "four", source: "live", tone: "active" },
    ];

    expect(trimTeletypeBuffer(lines, 2).map((line) => line.id)).toEqual(["3", "4"]);
    expect(trimTeletypeBuffer(lines, 0)).toEqual([]);
  });
});

describe("appendUniquePrintedLine", () => {
  test("appends only once per line id and enforces trim limit", () => {
    const one: TeletypeLine = { id: "1", text: "one", source: "backlog", tone: "neutral" };
    const two: TeletypeLine = { id: "2", text: "two", source: "live", tone: "active" };

    const withOne = appendUniquePrintedLine([], one, 3);
    expect(withOne.map((line) => line.id)).toEqual(["1"]);

    const dup = appendUniquePrintedLine(withOne, one, 3);
    expect(dup.map((line) => line.id)).toEqual(["1"]);

    const withTwo = appendUniquePrintedLine(withOne, two, 1);
    expect(withTwo.map((line) => line.id)).toEqual(["2"]);
  });
});

describe("line formatters", () => {
  test("formats game log entries into printable teletype lines", () => {
    const decide = formatGameLogEntryLine({
      event: "decide_complete",
      phase: "F1902M",
      orders: { FRANCE: 3, ENGLAND: 0 },
    });
    expect(decide).toMatchObject({
      text: "F1902M ORDERS FRANCE=3",
      tone: "success",
      eventType: "decide_complete",
    });
    expect(decide?.tokens).toEqual([
      { text: "F1902M", kind: "phase" },
      { text: " ", kind: "muted" },
      { text: "ORDERS", kind: "eventOrders" },
      { text: " ", kind: "muted" },
      { text: "FRANCE", kind: "power", power: "FRANCE" },
      { text: "=", kind: "operator" },
      { text: "3", kind: "number" },
    ]);

    expect(
      formatGameLogEntryLine({ event: "halt", phase: "W1905A" }),
    ).toMatchObject({
      text: "W1905A HALT",
      tone: "alert",
    });
  });

  test("formats live events into printable teletype lines", () => {
    expect(
      formatLiveEventLine(
        makeLiveEvent({
          event_id: 88,
          event_type: "message.flushed",
          payload: { sender: "FRANCE", recipient: "GERMANY", message: "Ready for a bounce." },
        }),
      ),
    ).toMatchObject({
      text: "FRANCE->GERMANY MSG Ready for a bounce.",
      tone: "active",
      eventType: "message.flushed",
    });

    expect(
      formatLiveEventLine(
        makeLiveEvent({
          event_id: 89,
          event_type: "agent.error",
          power: "ITALY",
          payload: { error: "Tool timeout" },
        }),
      ),
    ).toMatchObject({
      text: "ITALY ERROR Tool timeout",
      tone: "alert",
      eventType: "agent.error",
    });
  });

  test("supports msw alias events from SSE stream", () => {
    expect(
      formatLiveEventLine(
        makeLiveEvent({
          event_id: 120,
          event_type: "conversation.started",
          power: "FRANCE",
          payload: {},
        }),
      ),
    ).toMatchObject({
      text: "FRANCE CONVERSATION STARTED",
      tone: "active",
      eventType: "conversation.started",
    });

    expect(
      formatLiveEventLine(
        makeLiveEvent({
          event_id: 121,
          event_type: "message.sent",
          payload: { sender: "FRANCE", recipient: "GERMANY" },
        }),
      ),
    ).toMatchObject({
      text: "FRANCE->GERMANY MSG",
      tone: "active",
      eventType: "message.sent",
    });
  });
});

describe("advanceTypedLine", () => {
  test("advances typed text in bounded chunks", () => {
    expect(advanceTypedLine("HELLO", 0, 2)).toEqual({
      typed: "HE",
      nextCount: 2,
      done: false,
    });

    expect(advanceTypedLine("HELLO", 4, 2)).toEqual({
      typed: "HELLO",
      nextCount: 5,
      done: true,
    });

    expect(advanceTypedLine("", 0, 2)).toEqual({
      typed: "",
      nextCount: 0,
      done: true,
    });
  });
});
