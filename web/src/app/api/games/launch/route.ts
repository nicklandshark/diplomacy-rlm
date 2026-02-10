import { NextResponse } from "next/server";
import { spawn, execSync } from "child_process";
import fs from "fs";
import path from "path";

interface LaunchRequest {
  powers: string[];
  model: string;
  maxYear: number;
  backend: string;
}

const VALID_POWERS = new Set([
  "AUSTRIA", "ENGLAND", "FRANCE", "GERMANY", "ITALY", "RUSSIA", "TURKEY",
]);

const VALID_BACKENDS = new Set([
  "openai", "portkey", "openrouter", "vercel", "vllm", "litellm", "anthropic", "azure_openai", "gemini",
]);

/**
 * Detect the best available Python runner.
 * Returns { cmd, prefix } where spawn(cmd, [...prefix, ...cliArgs]).
 *
 * Priority: uv > diplomacy-rlm CLI > python -m
 */
function detectRunner(): { cmd: string; prefix: string[] } {
  try {
    execSync("uv --version", { stdio: "ignore", timeout: 3000 });
    return { cmd: "uv", prefix: ["run", "diplomacy-rlm"] };
  } catch {
    // uv not found — try the CLI entry point directly (pip install -e .)
    try {
      execSync("diplomacy-rlm --help", { stdio: "ignore", timeout: 5000 });
      return { cmd: "diplomacy-rlm", prefix: [] };
    } catch {
      // Last resort: invoke via python module
      return { cmd: "python", prefix: ["-m", "rlm_diplomacy.cli"] };
    }
  }
}

function getRunsDir(): string {
  const dir = process.env.GAMES_DIR || "../runs";
  return path.resolve(process.cwd(), dir);
}

function getProjectRoot(): string {
  return path.resolve(process.cwd(), "..");
}

function nextGameId(runsDir: string): string {
  if (!fs.existsSync(runsDir)) {
    fs.mkdirSync(runsDir, { recursive: true });
    return "game1";
  }

  const entries = fs.readdirSync(runsDir, { withFileTypes: true });
  let maxN = 0;

  for (const entry of entries) {
    if (!entry.isDirectory() && !entry.isSymbolicLink()) continue;
    const match = entry.name.match(/^game(\d+)$/);
    if (match) {
      const n = parseInt(match[1], 10);
      if (n > maxN) maxN = n;
    }
  }

  return `game${maxN + 1}`;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as LaunchRequest;

    // Validate powers
    if (!body.powers || !Array.isArray(body.powers) || body.powers.length < 2) {
      return NextResponse.json(
        { error: "At least 2 powers are required" },
        { status: 400 }
      );
    }

    const powersUpper = body.powers.map((p) => p.toUpperCase());
    for (const p of powersUpper) {
      if (!VALID_POWERS.has(p)) {
        return NextResponse.json(
          { error: `Invalid power: ${p}` },
          { status: 400 }
        );
      }
    }

    // Validate backend
    const backend = body.backend || "anthropic";
    if (!VALID_BACKENDS.has(backend)) {
      return NextResponse.json(
        { error: `Invalid backend: ${backend}` },
        { status: 400 }
      );
    }

    // Validate model
    const model = body.model;
    if (!model || typeof model !== "string" || !model.trim()) {
      return NextResponse.json(
        { error: "Invalid model" },
        { status: 400 }
      );
    }

    // Validate maxYear
    const maxYear = body.maxYear || 1905;
    if (maxYear < 1902 || maxYear > 1920) {
      return NextResponse.json(
        { error: "maxYear must be between 1902 and 1920" },
        { status: 400 }
      );
    }

    const runsDir = getRunsDir();
    const gameId = nextGameId(runsDir);
    const projectRoot = getProjectRoot();
    const gameDir = path.join(runsDir, gameId);

    // Ensure game directory exists before writing metadata files.
    fs.mkdirSync(gameDir, { recursive: true });

    // Detect runner: uv > diplomacy-rlm CLI > python -m
    const runner = detectRunner();

    // Build CLI arguments: runner.prefix handles the invocation method,
    // then we append the actual diplomacy-rlm flags.
    const cliFlags = [
      "--powers", powersUpper.join(","),
      "--backend", backend,
      "--backend-arg-for", `${backend}.model_name=${model}`,
      "--max-year", String(maxYear),
      "--game-dir", gameDir,
      "--log-events",
      "--log-repl",
      "--log-messages",
      "--log-memory-diff",
      "--serve-web",
    ];

    const args = [...runner.prefix, ...cliFlags];

    // Log stdout/stderr to a file so startup failures are diagnosable
    // (previously stdio: "ignore" swallowed all output).
    const logFd = fs.openSync(path.join(gameDir, "launch.log"), "w");

    // Spawn detached process — pass process.env so the child inherits
    // all environment variables (API keys, PATH, etc.)
    const child = spawn(runner.cmd, args, {
      cwd: projectRoot,
      detached: true,
      stdio: ["ignore", logFd, logFd],
      env: { ...process.env },
    });

    child.unref();

    // Write PID so the stop endpoint can kill the process later
    if (child.pid) {
      fs.writeFileSync(path.join(gameDir, ".pid"), String(child.pid));
    }

    // Write game metadata so AI summary can use the same provider
    fs.writeFileSync(
      path.join(gameDir, ".game_meta.json"),
      JSON.stringify({ backend, model }),
    );

    return NextResponse.json({
      gameId,
      status: "launched",
      pid: child.pid,
      runner: runner.cmd,
    });
  } catch (err) {
    console.error("Failed to launch game:", err);
    return NextResponse.json(
      { error: "Failed to launch game" },
      { status: 500 }
    );
  }
}
