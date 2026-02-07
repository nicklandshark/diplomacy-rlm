import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getGamesDir(): string {
  return path.resolve(process.cwd(), process.env.GAMES_DIR || "../runs");
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
  const pidFile = path.join(gameDir, ".pid");

  if (!fs.existsSync(pidFile)) {
    return NextResponse.json(
      { error: "No PID file found — game may not be running or was not launched with --serve-web/--serve-api" },
      { status: 404 }
    );
  }

  const pidStr = fs.readFileSync(pidFile, "utf-8").trim();
  const pid = parseInt(pidStr, 10);

  if (isNaN(pid)) {
    return NextResponse.json({ error: "Invalid PID in .pid file" }, { status: 500 });
  }

  const result = tryKillProcess(pid);

  // Clean up the PID file regardless of outcome
  try { fs.unlinkSync(pidFile); } catch {}

  if (result === "stopped") {
    return NextResponse.json({ status: "stopped", gameId, pid });
  }
  if (result === "already_stopped") {
    return NextResponse.json({ status: "already_stopped", gameId });
  }
  return NextResponse.json({ error: result }, { status: 500 });
}
