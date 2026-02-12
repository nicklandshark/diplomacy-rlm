import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getGamesDir(): string {
  return path.resolve(process.cwd(), process.env.GAMES_DIR || "../runs");
}

function cleanupMarkers(gameDir: string): void {
  for (const marker of [".pid", ".api_port"]) {
    try {
      fs.unlinkSync(path.join(gameDir, marker));
    } catch {
      // Best-effort cleanup only.
    }
  }
}

function tryKillProcess(pid: number): "stopped" | "already_stopped" | string {
  try {
    // Send SIGTERM to the process group (negative PID kills the group)
    process.kill(-pid, "SIGTERM");
    return "stopped";
  } catch (err: unknown) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ESRCH") return "already_stopped";
    // EPERM with negative PID means the process isn't a group leader;
    // try killing just the process directly
    if (code === "EPERM") {
      try {
        process.kill(pid, "SIGTERM");
        return "stopped";
      } catch (err2: unknown) {
        const code2 = (err2 as NodeJS.ErrnoException).code;
        if (code2 === "ESRCH") return "already_stopped";
        return `Failed to stop: ${code2 || err2}`;
      }
    }
    return `Failed to stop: ${code || err}`;
  }
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  // Validate gameId format to prevent path traversal
  if (!/^game\d+$/.test(gameId)) {
    return NextResponse.json({ error: "Invalid game ID" }, { status: 400 });
  }

  const gameDir = path.join(getGamesDir(), gameId);
  if (!fs.existsSync(gameDir)) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }
  const pidFile = path.join(gameDir, ".pid");

  if (!fs.existsSync(pidFile)) {
    // Common case: the game already exited and cleaned up .pid on shutdown.
    // Treat this as idempotent stop success rather than a hard error.
    cleanupMarkers(gameDir);
    return NextResponse.json({ status: "already_stopped", gameId, reason: "missing_pid" });
  }

  const pidStr = fs.readFileSync(pidFile, "utf-8").trim();
  const pid = parseInt(pidStr, 10);

  if (isNaN(pid)) {
    return NextResponse.json({ error: "Invalid PID in .pid file" }, { status: 500 });
  }

  const result = tryKillProcess(pid);

  cleanupMarkers(gameDir);

  if (result === "stopped") {
    return NextResponse.json({ status: "stopped", gameId, pid });
  }
  if (result === "already_stopped") {
    return NextResponse.json({ status: "already_stopped", gameId });
  }
  return NextResponse.json({ error: result }, { status: 500 });
}
