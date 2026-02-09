import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getGamesDir(): string {
  return path.resolve(process.cwd(), process.env.GAMES_DIR || "../runs");
}

function discoverApiUrl(gameId: string): string | null {
  // 1. Per-game .api_port file (written by --serve-api)
  const portFile = path.join(getGamesDir(), gameId, ".api_port");
  try {
    const port = fs.readFileSync(portFile, "utf-8").trim();
    if (port && /^\d+$/.test(port)) {
      return `http://127.0.0.1:${port}`;
    }
  } catch {
    // File doesn't exist — fall through
  }

  // 2. Global LIVE_API_URL env var (set by --serve-web)
  return process.env.LIVE_API_URL || null;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const liveApiUrl = discoverApiUrl(gameId);
  if (!liveApiUrl) {
    return NextResponse.json({ error: "No live API configured" }, { status: 503 });
  }

  const url = new URL(request.url);
  const afterId = url.searchParams.get("after_id") || "0";

  try {
    const upstream = await fetch(`${liveApiUrl}/events/stream?after_id=${afterId}`, {
      headers: { Accept: "text/event-stream" },
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "Upstream unavailable" }, { status: 502 });
    }

    return new Response(upstream.body, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch {
    return NextResponse.json({ error: "Upstream unavailable" }, { status: 502 });
  }
}
