import { NextResponse } from "next/server";
import { spawn } from "child_process";
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

function getRunsDir(): string {
  // Use GAMES_DIR if set, otherwise default to ../runs (relative to web/)
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

    // Build CLI arguments
    const args = [
      "run",
      "diplomacy-rlm",
      "--powers", powersUpper.join(","),
      "--backend", backend,
      "--backend-arg-for", `${backend}.model_name=${model}`,
      "--max-year", String(maxYear),
      "--game-dir", gameDir,
      "--log-events",
      "--log-repl",
      "--log-messages",
      "--log-memory-diff",
      "--serve-api",
    ];

    // Spawn detached process so it survives the API request
    const child = spawn("uv", args, {
      cwd: projectRoot,
      detached: true,
      stdio: "ignore",
    });

    // Unref so the parent process can exit without waiting
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
    });
  } catch (err) {
    console.error("Failed to launch game:", err);
    return NextResponse.json(
      { error: "Failed to launch game" },
      { status: 500 }
    );
  }
}
