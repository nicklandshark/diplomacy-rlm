import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";

// Mock NextResponse
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      _body: body,
      status: init?.status ?? 200,
      async json() { return this._body; },
    }),
  },
}));

// ── Setup ────────────────────────────────────────────────────────────────────

let tmpDir: string;

function makeParams(gameId: string) {
  return { params: Promise.resolve({ gameId }) };
}

function makeRequest(afterId = "0") {
  return new Request(`http://localhost:3000/api/games/game1/events?after_id=${afterId}`);
}

beforeEach(() => {
  vi.resetModules();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "diplomacy-events-test-"));
  process.env.GAMES_DIR = tmpDir;
  delete process.env.LIVE_API_URL;
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.GAMES_DIR;
  delete process.env.LIVE_API_URL;
  vi.restoreAllMocks();
});

async function getHandler() {
  const mod = await import("../route");
  return mod.GET;
}

// ═══════════════════════════════════════════════════════════════════════════
// REGRESSION: .pid liveness check
// ═══════════════════════════════════════════════════════════════════════════

describe("GET /api/games/[gameId]/events", () => {
  describe(".pid liveness check (regression: stale port file)", () => {
    it("returns 503 when game directory has no .pid file", async () => {
      // Game dir exists with .api_port but no .pid → game is dead
      const gameDir = path.join(tmpDir, "game1");
      fs.mkdirSync(gameDir);
      fs.writeFileSync(path.join(gameDir, ".api_port"), "3100");
      // Notably: no .pid file

      const GET = await getHandler();
      const res = await GET(makeRequest(), makeParams("game1"));

      expect(res.status).toBe(503);
      const body = await res.json();
      expect(body.error).toMatch(/not running/i);
    });

    it("returns 503 when game directory does not exist", async () => {
      const GET = await getHandler();
      const res = await GET(makeRequest(), makeParams("game99"));
      expect(res.status).toBe(503);
    });

    it("returns 503 when neither .pid nor .api_port nor LIVE_API_URL exists", async () => {
      const gameDir = path.join(tmpDir, "game1");
      fs.mkdirSync(gameDir);

      const GET = await getHandler();
      const res = await GET(makeRequest(), makeParams("game1"));
      expect(res.status).toBe(503);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // REGRESSION: discoverApiUrl priority
  // ═══════════════════════════════════════════════════════════════════════

  describe("API URL discovery", () => {
    it("prefers .api_port over LIVE_API_URL when both exist", async () => {
      const gameDir = path.join(tmpDir, "game1");
      fs.mkdirSync(gameDir);
      fs.writeFileSync(path.join(gameDir, ".pid"), "999");
      fs.writeFileSync(path.join(gameDir, ".api_port"), "4200");
      process.env.LIVE_API_URL = "http://127.0.0.1:9999";

      // fetch will fail because nothing is listening on 4200 —
      // but the point is it TRIED 4200, not 9999
      const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(
        new Error("connect ECONNREFUSED"),
      );

      const GET = await getHandler();
      const res = await GET(makeRequest(), makeParams("game1"));

      expect(res.status).toBe(502);
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("127.0.0.1:4200"),
        expect.anything(),
      );

      fetchSpy.mockRestore();
    });

    it("falls back to LIVE_API_URL when .api_port is missing", async () => {
      const gameDir = path.join(tmpDir, "game1");
      fs.mkdirSync(gameDir);
      fs.writeFileSync(path.join(gameDir, ".pid"), "999");
      // No .api_port file
      process.env.LIVE_API_URL = "http://127.0.0.1:7777";

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(
        new Error("connect ECONNREFUSED"),
      );

      const GET = await getHandler();
      await GET(makeRequest(), makeParams("game1"));

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("127.0.0.1:7777"),
        expect.anything(),
      );

      fetchSpy.mockRestore();
    });

    it("ignores .api_port with non-numeric content", async () => {
      const gameDir = path.join(tmpDir, "game1");
      fs.mkdirSync(gameDir);
      fs.writeFileSync(path.join(gameDir, ".pid"), "999");
      fs.writeFileSync(path.join(gameDir, ".api_port"), "not-a-port");
      process.env.LIVE_API_URL = "http://127.0.0.1:8888";

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(
        new Error("connect ECONNREFUSED"),
      );

      const GET = await getHandler();
      await GET(makeRequest(), makeParams("game1"));

      // Should have fallen through to LIVE_API_URL
      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining("127.0.0.1:8888"),
        expect.anything(),
      );

      fetchSpy.mockRestore();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // REGRESSION: fetch timeout
  // ═══════════════════════════════════════════════════════════════════════

  describe("upstream fetch timeout (regression: hanging on dead port)", () => {
    it("passes AbortSignal.timeout to the upstream fetch", async () => {
      const gameDir = path.join(tmpDir, "game1");
      fs.mkdirSync(gameDir);
      fs.writeFileSync(path.join(gameDir, ".pid"), "999");
      fs.writeFileSync(path.join(gameDir, ".api_port"), "3100");

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(
        new Error("connect ECONNREFUSED"),
      );

      const GET = await getHandler();
      await GET(makeRequest(), makeParams("game1"));

      const fetchOpts = fetchSpy.mock.calls[0][1] as RequestInit;
      expect(fetchOpts.signal).toBeDefined();

      fetchSpy.mockRestore();
    });

    it("returns 502 when upstream fetch times out", async () => {
      const gameDir = path.join(tmpDir, "game1");
      fs.mkdirSync(gameDir);
      fs.writeFileSync(path.join(gameDir, ".pid"), "999");
      fs.writeFileSync(path.join(gameDir, ".api_port"), "3100");

      vi.spyOn(globalThis, "fetch").mockRejectedValue(
        new DOMException("The operation was aborted", "TimeoutError"),
      );

      const GET = await getHandler();
      const res = await GET(makeRequest(), makeParams("game1"));

      expect(res.status).toBe(502);
      expect((await res.json()).error).toMatch(/unavailable/i);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // REGRESSION: upstream returns non-OK
  // ═══════════════════════════════════════════════════════════════════════

  describe("upstream error responses", () => {
    it("returns 502 when upstream returns 500", async () => {
      const gameDir = path.join(tmpDir, "game1");
      fs.mkdirSync(gameDir);
      fs.writeFileSync(path.join(gameDir, ".pid"), "999");
      fs.writeFileSync(path.join(gameDir, ".api_port"), "3100");

      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response("Internal Server Error", { status: 500 }),
      );

      const GET = await getHandler();
      const res = await GET(makeRequest(), makeParams("game1"));

      expect(res.status).toBe(502);
    });

    it("returns 502 when upstream returns null body", async () => {
      const gameDir = path.join(tmpDir, "game1");
      fs.mkdirSync(gameDir);
      fs.writeFileSync(path.join(gameDir, ".pid"), "999");
      fs.writeFileSync(path.join(gameDir, ".api_port"), "3100");

      const mockResponse = new Response(null, { status: 200 });
      Object.defineProperty(mockResponse, "body", { value: null });
      vi.spyOn(globalThis, "fetch").mockResolvedValue(mockResponse);

      const GET = await getHandler();
      const res = await GET(makeRequest(), makeParams("game1"));

      expect(res.status).toBe(502);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // REGRESSION: TransformStream mid-stream error handling
  // ═══════════════════════════════════════════════════════════════════════

  describe("mid-stream upstream death (regression: UND_ERR_SOCKET)", () => {
    it("injects close event when upstream dies mid-stream", async () => {
      const gameDir = path.join(tmpDir, "game1");
      fs.mkdirSync(gameDir);
      fs.writeFileSync(path.join(gameDir, ".pid"), "999");
      fs.writeFileSync(path.join(gameDir, ".api_port"), "3100");

      const encoder = new TextEncoder();

      // Create a ReadableStream that sends some data then errors
      let controllerRef: ReadableStreamDefaultController<Uint8Array>;
      const mockBody = new ReadableStream<Uint8Array>({
        start(controller) {
          controllerRef = controller;
          // Send one SSE event
          controller.enqueue(
            encoder.encode('id: 1\nevent: game_event\ndata: {"event_id":1}\n\n'),
          );
        },
      });

      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(mockBody, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
      );

      const GET = await getHandler();
      const res = await GET(makeRequest(), makeParams("game1"));

      expect(res.status).toBe(200);
      expect(res.headers.get("Content-Type")).toBe("text/event-stream");

      // Now simulate upstream death by erroring the stream
      controllerRef!.error(new Error("socket hang up"));

      // Read everything from the response body
      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
      }

      // Should contain the original event AND the injected close event
      expect(fullText).toContain("event: game_event");
      expect(fullText).toContain("event: close");
      expect(fullText).toContain("upstream_died");
    });

    it("streams data normally when upstream closes cleanly", async () => {
      const gameDir = path.join(tmpDir, "game1");
      fs.mkdirSync(gameDir);
      fs.writeFileSync(path.join(gameDir, ".pid"), "999");
      fs.writeFileSync(path.join(gameDir, ".api_port"), "3100");

      const encoder = new TextEncoder();

      const mockBody = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(
            encoder.encode('id: 1\nevent: game_event\ndata: {"event_id":1}\n\n'),
          );
          controller.enqueue(
            encoder.encode('event: close\ndata: {"reason":"game_ended"}\n\n'),
          );
          controller.close();
        },
      });

      vi.spyOn(globalThis, "fetch").mockResolvedValue(
        new Response(mockBody, {
          status: 200,
          headers: { "Content-Type": "text/event-stream" },
        }),
      );

      const GET = await getHandler();
      const res = await GET(makeRequest(), makeParams("game1"));

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        fullText += decoder.decode(value, { stream: true });
      }

      // Should have both events, no "upstream_died" injected
      expect(fullText).toContain("game_event");
      expect(fullText).toContain("game_ended");
      expect(fullText).not.toContain("upstream_died");
    });

    it("passes after_id query param to upstream", async () => {
      const gameDir = path.join(tmpDir, "game1");
      fs.mkdirSync(gameDir);
      fs.writeFileSync(path.join(gameDir, ".pid"), "999");
      fs.writeFileSync(path.join(gameDir, ".api_port"), "3100");

      const fetchSpy = vi.spyOn(globalThis, "fetch").mockRejectedValue(
        new Error("connect ECONNREFUSED"),
      );

      const GET = await getHandler();
      await GET(makeRequest("42"), makeParams("game1"));

      expect(fetchSpy.mock.calls[0][0]).toContain("after_id=42");

      fetchSpy.mockRestore();
    });
  });
});
