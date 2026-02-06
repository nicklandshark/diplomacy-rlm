import PowerBadge from "../power/PowerBadge";

interface Props {
  sender: string;
  recipient: string;
  message: string;
  phase?: string;
}

export default function MessageBubble({ sender, recipient, message, phase }: Props) {
  return (
    <div className="border border-gray-800 rounded p-3 bg-gray-900">
      <div className="flex items-center gap-2 mb-1">
        <PowerBadge power={sender} size="sm" />
        <span className="text-gray-500 text-xs">&rarr;</span>
        <PowerBadge power={recipient} size="sm" />
        {phase && <span className="text-xs text-gray-600 ml-auto">{phase}</span>}
      </div>
      <p className="text-sm text-gray-300 whitespace-pre-wrap">{message}</p>
    </div>
  );
}
