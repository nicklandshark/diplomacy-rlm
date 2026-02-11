import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

function getGamesDir(): string {
  return path.resolve(process.cwd(), process.env.GAMES_DIR || "../runs");
}

function discoverApiUrl(gameId: string): string | null {
  const gameDir = path.join(getGamesDir(), gameId);

  // Quick liveness check: if there's no .pid file, the game process is
  // definitely not running — don't even try to connect to the sidecar.
  const pidFile = path.join(gameDir, ".pid");
  if (!fs.existsSync(pidFile)) return null;

  // 1. Per-game .api_port file (written by --serve-api / --serve-web)
  const portFile = path.join(gameDir, ".api_port");
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
    return NextResponse.json(
      { error: "Game not running", gameId },
      { status: 503 },
    );
  }

  const url = new URL(request.url);
  const afterId = url.searchParams.get("after_id") || "0";

  try {
    const upstream = await fetch(
      `${liveApiUrl}/events/stream?after_id=${afterId}`,
      {
        headers: { Accept: "text/event-stream" },
        // Abort if the sidecar doesn't respond within 5 seconds — prevents
        // hanging indefinitely on a dead port.
        signal: AbortSignal.timeout(5000),
      },
    );

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json({ error: "Upstream unavailable" }, { status: 502 });
    }

    // Wrap the upstream body in a TransformStream that catches mid-stream
    // socket errors and converts them to a clean SSE close event instead of
    // letting the error bubble up as a 500.
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();
    const reader = upstream.body.getReader();

    (async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          await writer.write(value);
        }
        await writer.close();
      } catch {
        // Upstream died mid-stream (socket closed, process exited, etc.)
        // Send a clean close event so the browser's EventSource knows
        // the stream ended intentionally rather than erroring.
        const encoder = new TextEncoder();
        try {
          await writer.write(
            encoder.encode('event: close\ndata: {"reason":"upstream_died"}\n\n'),
          );
          await writer.close();
        } catch {
          // Writer already closed (client disconnected) — nothing to do
          try { writer.close(); } catch { /* noop */ }
        }
      }
    })();

    return new Response(readable, {
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
