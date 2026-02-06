import { listPhases, readPhaseMessages } from "@/lib/game-data";
import MessageBubble from "@/components/messages/MessageBubble";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function MessagesPage({
  params,
}: {
  params: Promise<{ gameId: string }>;
}) {
  const { gameId } = await params;
  const phases = listPhases(gameId);

  const allMessages: { ts: string; phase: string; sender: string; recipient: string; message: string }[] = [];
  for (const phase of phases) {
    const msgs = readPhaseMessages(gameId, phase);
    if (!msgs) continue;
    for (const [ts, msg] of Object.entries(msgs)) {
      allMessages.push({ ts, sender: msg.sender, recipient: msg.recipient, message: msg.message, phase: msg.phase || phase });
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">Diplomatic Messages</h3>
        <Link href={`/game/${gameId}`} className="text-sm text-blue-400 hover:text-blue-300">
          Back to game
        </Link>
      </div>
      {allMessages.length === 0 ? (
        <div className="text-gray-500">No messages in this game.</div>
      ) : (
        <div className="flex flex-col gap-2">
          {allMessages.map((msg, i) => (
            <MessageBubble
              key={`${msg.ts}-${i}`}
              sender={msg.sender}
              recipient={msg.recipient}
              message={msg.message}
              phase={msg.phase}
            />
          ))}
        </div>
      )}
    </div>
  );
}
