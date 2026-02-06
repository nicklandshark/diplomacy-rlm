import PowerBadge from "../power/PowerBadge";
import type { LiveEvent } from "@/lib/types";

interface Props {
  event: LiveEvent;
}

export default function EventCard({ event }: Props) {
  const summary = (event.payload as Record<string, unknown>)?.summary as string || event.event_type;

  return (
    <div className="flex items-start gap-2 py-1.5 px-2 text-xs border-b border-gray-800/50">
      <span className="text-gray-500 font-mono w-16 shrink-0">
        {new Date(event.ts_wall * 1000).toLocaleTimeString()}
      </span>
      <span className="text-blue-400 w-24 shrink-0 truncate">{event.event_type}</span>
      {event.phase && (
        <span className="text-gray-500 w-16 shrink-0">{event.phase}</span>
      )}
      {event.power && <PowerBadge power={event.power} size="sm" />}
      <span className="text-gray-400 truncate">{summary}</span>
    </div>
  );
}
