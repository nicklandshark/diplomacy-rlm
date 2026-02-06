import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const liveApiUrl = process.env.LIVE_API_URL;
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
