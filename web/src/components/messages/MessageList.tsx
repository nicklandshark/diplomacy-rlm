import type { Message } from "@/lib/types";
import MessageBubble from "./MessageBubble";

interface Props {
  messages: Message[];
}

export default function MessageList({ messages }: Props) {
  if (!messages || messages.length === 0) {
    return <div className="text-gray-500 text-sm p-4">No messages yet.</div>;
  }

  return (
    <div className="flex flex-col gap-2 p-2 overflow-auto">
      {messages.map((msg, i) => (
        <MessageBubble
          key={i}
          sender={msg.sender}
          recipient={msg.recipient}
          message={msg.message}
          phase={msg.phase}
        />
      ))}
    </div>
  );
}
