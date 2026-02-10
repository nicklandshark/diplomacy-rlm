import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs";
import path from "path";
import os from "os";

// ── Mocks ────────────────────────────────────────────────────────────────────
// Must be hoisted above all imports that use these modules.

const mockSpawn = vi.fn();
const mockExecSync = vi.fn();

vi.mock("child_process", () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
  execSync: (...args: unknown[]) => mockExecSync(...args),
}));

// Mock NextResponse since we're outside the Next.js runtime
vi.mock("next/server", () => ({
  NextResponse: {
    json: (body: unknown, init?: { status?: number }) => ({
      _body: body,
      status: init?.status ?? 200,
      async json() { return this._body; },
    }),
  },
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

let tmpDir: string;

function makeRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost:3000/api/games/launch", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const VALID_BODY = {
  powers: ["FRANCE", "GERMANY"],
  model: "claude-opus-4-6",
  maxYear: 1905,
  backend: "anthropic",
};

// ── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  vi.resetModules();
  mockSpawn.mockReset();
  mockExecSync.mockReset();

  // Create a temp directory for game runs
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "diplomacy-test-"));
  process.env.GAMES_DIR = tmpDir;

  // Default: spawn returns a fake child with pid and unref
  mockSpawn.mockReturnValue({
    pid: 12345,
    unref: vi.fn(),
  });
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  delete process.env.GAMES_DIR;
});

// ── Import after mocks ──────────────────────────────────────────────────────

async function getHandler() {
  const mod = await import("../route");
  return mod.POST;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe("POST /api/games/launch", () => {
  // ── FIX #1: spawn() passes env vars ────────────────────────────────────
  describe("env var inheritance (regression)", () => {
    it("passes process.env to the spawned child process", async () => {
      // Simulate uv available
      mockExecSync.mockImplementation(() => {});

      process.env.OPENROUTER_API_KEY = "sk-test-key-123";

      const POST = await getHandler();
      await POST(makeRequest(VALID_BODY));

      expect(mockSpawn).toHaveBeenCalledTimes(1);
      const spawnOpts = mockSpawn.mock.calls[0][2];

      // The critical fix: env must be present
      expect(spawnOpts).toHaveProperty("env");
      expect(spawnOpts.env).toBeDefined();
      // And it must contain the API key from process.env
      expect(spawnOpts.env.OPENROUTER_API_KEY).toBe("sk-test-key-123");

      delete process.env.OPENROUTER_API_KEY;
    });

    it("spawns with detached: true so game survives API request", async () => {
      mockExecSync.mockImplementation(() => {});

      const POST = await getHandler();
      await POST(makeRequest(VALID_BODY));

      const spawnOpts = mockSpawn.mock.calls[0][2];
      expect(spawnOpts.detached).toBe(true);
      // stdio redirects stdout/stderr to a log file fd: ["ignore", fd, fd]
      expect(spawnOpts.stdio[0]).toBe("ignore");
      expect(typeof spawnOpts.stdio[1]).toBe("number"); // file descriptor
      expect(typeof spawnOpts.stdio[2]).toBe("number");
    });
  });

  // ── FIX #3: uv / python fallback ──────────────────────────────────────
  describe("detectRunner fallback chain (regression)", () => {
    it("uses uv when available", async () => {
      // execSync("uv --version") succeeds
      mockExecSync.mockImplementation(() => {});

      const POST = await getHandler();
      const res = await POST(makeRequest(VALID_BODY));
      const body = await res.json();

      expect(body.runner).toBe("uv");
      expect(mockSpawn.mock.calls[0][0]).toBe("uv");
      // First args should be "run", "diplomacy-rlm", then flags
      const args = mockSpawn.mock.calls[0][1] as string[];
      expect(args[0]).toBe("run");
      expect(args[1]).toBe("diplomacy-rlm");
      expect(args[2]).toBe("--powers");
    });

    it("falls back to diplomacy-rlm CLI when uv is missing", async () => {
      // uv fails, diplomacy-rlm succeeds
      mockExecSync.mockImplementation((cmd: string) => {
        if (cmd === "uv --version") throw new Error("not found");
        // diplomacy-rlm --help succeeds
      });

      const POST = await getHandler();
      const res = await POST(makeRequest(VALID_BODY));
      const body = await res.json();

      expect(body.runner).toBe("diplomacy-rlm");
      expect(mockSpawn.mock.calls[0][0]).toBe("diplomacy-rlm");
      // Direct CLI: no prefix, just flags
      const args = mockSpawn.mock.calls[0][1] as string[];
      expect(args[0]).toBe("--powers");
    });

    it("falls back to python -m when both uv and CLI are missing", async () => {
      // Everything fails
      mockExecSync.mockImplementation(() => {
        throw new Error("not found");
      });

      const POST = await getHandler();
      const res = await POST(makeRequest(VALID_BODY));
      const body = await res.json();

      expect(body.runner).toBe("python");
      expect(mockSpawn.mock.calls[0][0]).toBe("python");
      const args = mockSpawn.mock.calls[0][1] as string[];
      expect(args[0]).toBe("-m");
      expect(args[1]).toBe("rlm_diplomacy.cli");
      expect(args[2]).toBe("--powers");
    });
  });

  // ── Input validation ───────────────────────────────────────────────────
  describe("input validation", () => {
    it("rejects fewer than 2 powers", async () => {
      const POST = await getHandler();
      const res = await POST(makeRequest({ ...VALID_BODY, powers: ["FRANCE"] }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(/2 powers/);
    });

    it("rejects invalid power names", async () => {
      const POST = await getHandler();
      const res = await POST(makeRequest({ ...VALID_BODY, powers: ["FRANCE", "ATLANTIS"] }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(/ATLANTIS/);
    });

    it("rejects invalid backend", async () => {
      const POST = await getHandler();
      const res = await POST(makeRequest({ ...VALID_BODY, backend: "grok" }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(/grok/);
    });

    it("rejects empty model", async () => {
      const POST = await getHandler();
      const res = await POST(makeRequest({ ...VALID_BODY, model: "" }));
      expect(res.status).toBe(400);
    });

    it("rejects maxYear out of range", async () => {
      const POST = await getHandler();
      const res = await POST(makeRequest({ ...VALID_BODY, maxYear: 1950 }));
      expect(res.status).toBe(400);
      expect((await res.json()).error).toMatch(/maxYear/);
    });
  });

  // ── Game directory and metadata ────────────────────────────────────────
  describe("game directory management", () => {
    it("creates game directory and writes .pid and .game_meta.json", async () => {
      mockExecSync.mockImplementation(() => {});

      const POST = await getHandler();
      const res = await POST(makeRequest(VALID_BODY));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.gameId).toBe("game1");

      const gameDir = path.join(tmpDir, "game1");
      expect(fs.existsSync(gameDir)).toBe(true);
      expect(fs.readFileSync(path.join(gameDir, ".pid"), "utf-8")).toBe("12345");

      const meta = JSON.parse(fs.readFileSync(path.join(gameDir, ".game_meta.json"), "utf-8"));
      expect(meta.backend).toBe("anthropic");
      expect(meta.model).toBe("claude-opus-4-6");
    });

    it("increments game ID based on existing directories", async () => {
      mockExecSync.mockImplementation(() => {});
      // Create some existing game dirs
      fs.mkdirSync(path.join(tmpDir, "game1"));
      fs.mkdirSync(path.join(tmpDir, "game3"));

      const POST = await getHandler();
      const res = await POST(makeRequest(VALID_BODY));
      const body = await res.json();

      // Should be game4, not game2 (uses max+1)
      expect(body.gameId).toBe("game4");
    });
  });

  // ── CLI args construction ──────────────────────────────────────────────
  describe("CLI args", () => {
    it("passes correct flags for the chosen backend and model", async () => {
      mockExecSync.mockImplementation(() => {});

      const POST = await getHandler();
      await POST(makeRequest({
        powers: ["FRANCE", "ENGLAND", "RUSSIA"],
        model: "gpt-4o",
        maxYear: 1910,
        backend: "openrouter",
      }));

      const args = mockSpawn.mock.calls[0][1] as string[];
      // After prefix ("run", "diplomacy-rlm"), check flags
      const flagStart = args.indexOf("--powers");
      expect(args[flagStart + 1]).toBe("FRANCE,ENGLAND,RUSSIA");
      expect(args).toContain("--backend");
      expect(args[args.indexOf("--backend") + 1]).toBe("openrouter");
      expect(args).toContain("--backend-arg-for");
      expect(args[args.indexOf("--backend-arg-for") + 1]).toBe("openrouter.model_name=gpt-4o");
      expect(args[args.indexOf("--max-year") + 1]).toBe("1910");
      expect(args).toContain("--serve-web");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════
  // ADVERSARIAL / EDGE-CASE REGRESSION TESTS
  // ═══════════════════════════════════════════════════════════════════════

  // ── Spawn failure modes ──────────────────────────────────────────────
  describe("spawn failure modes", () => {
    it("returns 500 when spawn() throws", async () => {
      mockExecSync.mockImplementation(() => {});
      mockSpawn.mockImplementation(() => {
        throw new Error("ENOENT: spawn uv ENOENT");
      });

      const POST = await getHandler();
      const res = await POST(makeRequest(VALID_BODY));

      expect(res.status).toBe(500);
      expect((await res.json()).error).toMatch(/Failed to launch/);
    });

    it("handles spawn returning child with undefined pid", async () => {
      mockExecSync.mockImplementation(() => {});
      mockSpawn.mockReturnValue({
        pid: undefined,
        unref: vi.fn(),
      });

      const POST = await getHandler();
      const res = await POST(makeRequest(VALID_BODY));
      const body = await res.json();

      // Should still succeed — pid is optional in the response
      expect(res.status).toBe(200);
      expect(body.gameId).toBeDefined();
      // PID file should NOT be written when pid is undefined
      const gameDir = path.join(tmpDir, body.gameId);
      expect(fs.existsSync(path.join(gameDir, ".pid"))).toBe(false);
    });
  });

  // ── Input validation edge cases ─────────────────────────────────────
  describe("input validation edge cases", () => {
    it("rejects powers: null", async () => {
      const POST = await getHandler();
      const res = await POST(makeRequest({ ...VALID_BODY, powers: null }));
      expect(res.status).toBe(400);
    });

    it("rejects powers: 'FRANCE' (string instead of array)", async () => {
      const POST = await getHandler();
      const res = await POST(makeRequest({ ...VALID_BODY, powers: "FRANCE" }));
      expect(res.status).toBe(400);
    });

    it("rejects empty powers array", async () => {
      const POST = await getHandler();
      const res = await POST(makeRequest({ ...VALID_BODY, powers: [] }));
      expect(res.status).toBe(400);
    });

    it("normalizes lowercase power names to uppercase", async () => {
      mockExecSync.mockImplementation(() => {});

      const POST = await getHandler();
      const res = await POST(makeRequest({
        ...VALID_BODY,
        powers: ["france", "germany"],
      }));

      expect(res.status).toBe(200);
      const args = mockSpawn.mock.calls[0][1] as string[];
      const powersArg = args[args.indexOf("--powers") + 1];
      expect(powersArg).toBe("FRANCE,GERMANY");
    });

    it("accepts maxYear at lower boundary (1902)", async () => {
      mockExecSync.mockImplementation(() => {});
      const POST = await getHandler();
      const res = await POST(makeRequest({ ...VALID_BODY, maxYear: 1902 }));
      expect(res.status).toBe(200);
    });

    it("accepts maxYear at upper boundary (1920)", async () => {
      mockExecSync.mockImplementation(() => {});
      const POST = await getHandler();
      const res = await POST(makeRequest({ ...VALID_BODY, maxYear: 1920 }));
      expect(res.status).toBe(200);
    });

    it("rejects maxYear just below lower boundary (1901)", async () => {
      const POST = await getHandler();
      const res = await POST(makeRequest({ ...VALID_BODY, maxYear: 1901 }));
      expect(res.status).toBe(400);
    });

    it("rejects maxYear just above upper boundary (1921)", async () => {
      const POST = await getHandler();
      const res = await POST(makeRequest({ ...VALID_BODY, maxYear: 1921 }));
      expect(res.status).toBe(400);
    });

    it("rejects model that is only whitespace", async () => {
      const POST = await getHandler();
      const res = await POST(makeRequest({ ...VALID_BODY, model: "   " }));
      expect(res.status).toBe(400);
    });

    it("rejects model: 123 (number instead of string)", async () => {
      const POST = await getHandler();
      const res = await POST(makeRequest({ ...VALID_BODY, model: 123 }));
      expect(res.status).toBe(400);
    });

    it("defaults backend to anthropic when omitted", async () => {
      mockExecSync.mockImplementation(() => {});
      const POST = await getHandler();
      const { backend: _, ...bodyNoBackend } = VALID_BODY;
      const res = await POST(makeRequest(bodyNoBackend));

      expect(res.status).toBe(200);
      const args = mockSpawn.mock.calls[0][1] as string[];
      expect(args[args.indexOf("--backend") + 1]).toBe("anthropic");
    });

    it("defaults maxYear to 1905 when omitted", async () => {
      mockExecSync.mockImplementation(() => {});
      const POST = await getHandler();
      const { maxYear: _, ...bodyNoYear } = VALID_BODY;
      const res = await POST(makeRequest(bodyNoYear));

      expect(res.status).toBe(200);
      const args = mockSpawn.mock.calls[0][1] as string[];
      expect(args[args.indexOf("--max-year") + 1]).toBe("1905");
    });

    it("accepts all 7 powers at once", async () => {
      mockExecSync.mockImplementation(() => {});
      const POST = await getHandler();
      const res = await POST(makeRequest({
        ...VALID_BODY,
        powers: ["AUSTRIA", "ENGLAND", "FRANCE", "GERMANY", "ITALY", "RUSSIA", "TURKEY"],
      }));

      expect(res.status).toBe(200);
      const args = mockSpawn.mock.calls[0][1] as string[];
      const powersArg = args[args.indexOf("--powers") + 1];
      expect(powersArg.split(",")).toHaveLength(7);
    });

    it("accepts every valid backend", async () => {
      const backends = [
        "openai", "portkey", "openrouter", "vercel",
        "vllm", "litellm", "anthropic", "azure_openai", "gemini",
      ];
      mockExecSync.mockImplementation(() => {});

      for (const backend of backends) {
        mockSpawn.mockReturnValue({ pid: 12345, unref: vi.fn() });
        const POST = await getHandler();
        const res = await POST(makeRequest({ ...VALID_BODY, backend }));
        expect(res.status).toBe(200);
      }
    });
  });

  // ── Game directory edge cases ───────────────────────────────────────
  describe("game directory edge cases", () => {
    it("handles runsDir not yet existing (creates it)", async () => {
      mockExecSync.mockImplementation(() => {});
      // Point GAMES_DIR to a non-existent subdirectory
      const nestedDir = path.join(tmpDir, "does", "not", "exist");
      process.env.GAMES_DIR = nestedDir;

      const POST = await getHandler();
      const res = await POST(makeRequest(VALID_BODY));
      const body = await res.json();

      expect(res.status).toBe(200);
      expect(body.gameId).toBe("game1");
      expect(fs.existsSync(path.join(nestedDir, "game1"))).toBe(true);
    });

    it("ignores non-game directories when computing next ID", async () => {
      mockExecSync.mockImplementation(() => {});
      fs.mkdirSync(path.join(tmpDir, "game2"));
      fs.mkdirSync(path.join(tmpDir, "logs"));
      fs.mkdirSync(path.join(tmpDir, "snapshots"));
      fs.writeFileSync(path.join(tmpDir, "README.md"), "hi");

      const POST = await getHandler();
      const res = await POST(makeRequest(VALID_BODY));
      const body = await res.json();

      // Only game2 matches /^game\d+$/, so next is game3
      expect(body.gameId).toBe("game3");
    });

    it("handles game directory with gap (game1, game5 → game6)", async () => {
      mockExecSync.mockImplementation(() => {});
      fs.mkdirSync(path.join(tmpDir, "game1"));
      fs.mkdirSync(path.join(tmpDir, "game5"));

      const POST = await getHandler();
      const res = await POST(makeRequest(VALID_BODY));

      expect((await res.json()).gameId).toBe("game6");
    });
  });

  // ── CLI args safety ─────────────────────────────────────────────────
  describe("CLI args safety", () => {
    it("model with spaces is passed as a single argument (no shell splitting)", async () => {
      mockExecSync.mockImplementation(() => {});

      const POST = await getHandler();
      await POST(makeRequest({
        ...VALID_BODY,
        model: "claude opus 4",
      }));

      const args = mockSpawn.mock.calls[0][1] as string[];
      const modelArg = args[args.indexOf("--backend-arg-for") + 1];
      // The model name with spaces should be in a single arg, not split
      expect(modelArg).toBe("anthropic.model_name=claude opus 4");
    });

    it("model with shell metacharacters is passed literally", async () => {
      mockExecSync.mockImplementation(() => {});

      const POST = await getHandler();
      await POST(makeRequest({
        ...VALID_BODY,
        model: "model; rm -rf /",
      }));

      const args = mockSpawn.mock.calls[0][1] as string[];
      const modelArg = args[args.indexOf("--backend-arg-for") + 1];
      // spawn() with array args doesn't go through shell, so this is safe
      expect(modelArg).toBe("anthropic.model_name=model; rm -rf /");
    });

    it("--game-dir flag points to the correct game directory", async () => {
      mockExecSync.mockImplementation(() => {});

      const POST = await getHandler();
      const res = await POST(makeRequest(VALID_BODY));
      const body = await res.json();

      const args = mockSpawn.mock.calls[0][1] as string[];
      const gameDirArg = args[args.indexOf("--game-dir") + 1];
      expect(gameDirArg).toBe(path.join(tmpDir, body.gameId));
    });
  });

  // ── Environment propagation edge cases ──────────────────────────────
  describe("environment propagation edge cases", () => {
    it("preserves PATH in spawned env", async () => {
      mockExecSync.mockImplementation(() => {});

      const POST = await getHandler();
      await POST(makeRequest(VALID_BODY));

      const spawnOpts = mockSpawn.mock.calls[0][2];
      expect(spawnOpts.env.PATH).toBe(process.env.PATH);
    });

    it("preserves HOME in spawned env", async () => {
      mockExecSync.mockImplementation(() => {});

      const POST = await getHandler();
      await POST(makeRequest(VALID_BODY));

      const spawnOpts = mockSpawn.mock.calls[0][2];
      expect(spawnOpts.env.HOME).toBe(process.env.HOME);
    });
  });

  // ── Malformed request body ──────────────────────────────────────────
  describe("malformed request body", () => {
    it("returns 500 on non-JSON body", async () => {
      const POST = await getHandler();
      const req = new Request("http://localhost:3000/api/games/launch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "this is not json",
      });
      const res = await POST(req);
      expect(res.status).toBe(500);
    });

    it("returns 400 when body is empty JSON object", async () => {
      const POST = await getHandler();
      const res = await POST(makeRequest({}));
      expect(res.status).toBe(400);
    });
  });
});
