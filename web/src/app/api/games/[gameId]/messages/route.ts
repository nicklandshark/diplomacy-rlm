import { NextResponse } from "next/server";
import { readAllMessages } from "@/lib/game-data";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;
  const messages = readAllMessages(gameId);
  return NextResponse.json(messages, {
    headers: { "Cache-Control": "public, max-age=5" },
  });
}
