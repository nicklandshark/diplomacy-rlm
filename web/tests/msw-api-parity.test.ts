// @ts-nocheck
import { afterAll, beforeAll, describe, expect, test } from "bun:test";
import { setupServer } from "msw/node";
import fs from "node:fs";
import path from "node:path";
import { handlers } from "../src/app/military-demo/mocks/handlers";

const server = setupServer(...handlers);
const demoGameId = "demo";
const demoPhase = "F1905M";
const demoPower = "AUSTRIA";

const requiredFrontendEndpoints = [
  "/api/games/:gameId/phases",
  "/api/games/:gameId/phases/:phase/state",
  "/api/games/:gameId/phases/:phase/orders",
  "/api/games/:gameId/phases/:phase/results",
  "/api/games/:gameId/phases/:phase/messages",
  "/api/games/:gameId/memory/:power",
  "/api/games/:gameId/log",
  "/api/games/:gameId/messages",
  "/api/games/:gameId/summary",
  "/api/games/:gameId/events",
  "/api/games/:gameId/export",
] as const;

const requiredApiRouteFiles = [
  "src/app/api/games/[gameId]/phases/route.ts",
  "src/app/api/games/[gameId]/phases/[phase]/state/route.ts",
  "src/app/api/games/[gameId]/phases/[phase]/orders/route.ts",
  "src/app/api/games/[gameId]/phases/[phase]/results/route.ts",
  "src/app/api/games/[gameId]/phases/[phase]/messages/route.ts",
  "src/app/api/games/[gameId]/memory/[power]/route.ts",
  "src/app/api/games/[gameId]/log/route.ts",
  "src/app/api/games/[gameId]/messages/route.ts",
  "src/app/api/games/[gameId]/summary/route.ts",
  "src/app/api/games/[gameId]/events/route.ts",
  "src/app/api/games/[gameId]/export/route.ts",
] as const;

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});

afterAll(() => {
  server.close();
});

describe("military demo API parity", () => {
  test("all required API route files exist", () => {
    const root = path.resolve(import.meta.dir, "..");
    const missing = requiredApiRouteFiles.filter((routeFile) => !fs.existsSync(path.join(root, routeFile)));
    expect(missing).toEqual([]);
  });

  test("MSW handlers define all required military-demo endpoint patterns", () => {
    const handlersText = fs.readFileSync(
      path.resolve(import.meta.dir, "../src/app/military-demo/mocks/handlers.ts"),
      "utf8",
    );
    const sseText = fs.readFileSync(
      path.resolve(import.meta.dir, "../src/app/military-demo/mocks/sse-handler.ts"),
      "utf8",
    );

    const mockPatterns = [
      ...[...handlersText.matchAll(/http\.get\('([^']+)'/g)].map((m) => m[1]),
      ...[...sseText.matchAll(/http\.get\('([^']+)'/g)].map((m) => m[1]),
    ];

    for (const endpoint of requiredFrontendEndpoints) {
      const normalized = endpoint.startsWith("*/") ? endpoint : `*${endpoint}`;
      const hasMatch = mockPatterns.includes(endpoint) || mockPatterns.includes(normalized);
      expect(hasMatch).toBe(true);
    }
  });
});

describe("military demo MSW responses", () => {
  test("phases endpoint returns list", async () => {
    const res = await fetch(`http://localhost/api/games/${demoGameId}/phases`);
    expect(res.ok).toBe(true);
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);
  });

  test("phase snapshot endpoints return data", async () => {
    const [state, orders, results, messages] = await Promise.all([
      fetch(`http://localhost/api/games/${demoGameId}/phases/${demoPhase}/state`),
      fetch(`http://localhost/api/games/${demoGameId}/phases/${demoPhase}/orders`),
      fetch(`http://localhost/api/games/${demoGameId}/phases/${demoPhase}/results`),
      fetch(`http://localhost/api/games/${demoGameId}/phases/${demoPhase}/messages`),
    ]);

    expect(state.ok).toBe(true);
    expect(orders.ok).toBe(true);
    expect(results.ok).toBe(true);
    expect(messages.ok).toBe(true);
  });

  test("memory, log, messages, summary endpoints return payloads", async () => {
    const [memory, log, messages, summary] = await Promise.all([
      fetch(`http://localhost/api/games/${demoGameId}/memory/${demoPower}?phase=${demoPhase}`),
      fetch(`http://localhost/api/games/${demoGameId}/log`),
      fetch(`http://localhost/api/games/${demoGameId}/messages`),
      fetch(`http://localhost/api/games/${demoGameId}/summary`),
    ]);

    expect(memory.ok).toBe(true);
    expect(log.ok).toBe(true);
    expect(messages.ok).toBe(true);
    expect(summary.ok).toBe(true);

    const memoryJson = await memory.json();
    const summaryJson = await summary.json();
    expect(typeof memoryJson).toBe("object");
    expect("content" in memoryJson).toBe(true);
    expect(Array.isArray(summaryJson.phases)).toBe(true);
    expect(Array.isArray(summaryJson.finalStandings)).toBe(true);
  });

  test("export endpoint returns JSON attachment", async () => {
    const res = await fetch(`http://localhost/api/games/${demoGameId}/export`);
    expect(res.ok).toBe(true);
    expect(res.headers.get("content-type") || "").toContain("application/json");
    expect(res.headers.get("content-disposition") || "").toContain(`${demoGameId}-replay.json`);
    const json = await res.json();
    expect(json.gameId).toBe(demoGameId);
    expect(Array.isArray(json.phases)).toBe(true);
  });

  test("SSE endpoint uses named game_event frames", async () => {
    const sseText = fs.readFileSync(
      path.resolve(import.meta.dir, "../src/app/military-demo/mocks/sse-handler.ts"),
      "utf8",
    );
    expect(sseText).toContain("event: game_event");

    const res = await fetch(`http://localhost/api/games/${demoGameId}/events?after_id=0`);
    expect(res.ok).toBe(true);
    expect(res.headers.get("content-type") || "").toContain("text/event-stream");
  });
});
