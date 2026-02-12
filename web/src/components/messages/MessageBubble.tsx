"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import PowerBadge from "../power/PowerBadge";
import { POWER_DISPLAY_COLORS } from "@/lib/constants";
import { phaseDisplayName } from "@/lib/constants";

interface Props {
  sender: string;
  recipient: string;
  message: string;
  phase?: string;
  isLive?: boolean;
}

export default function MessageBubble({ sender, recipient, message, phase, isLive }: Props) {
  const senderColor = POWER_DISPLAY_COLORS[sender] || "#999";

  return (
    <div className="font-ui-orders flex items-start gap-2">
      <div
        className="flex-1 rounded-lg p-3 bg-gray-900/80 border-l-2"
        style={{ borderLeftColor: senderColor }}
      >
      <div className="flex items-center gap-1.5 mb-2">
        <PowerBadge power={sender} size="sm" />
        <span className="text-gray-600 text-[10px]">&rarr;</span>
        <PowerBadge power={recipient} size="sm" />
        {phase && (
          <span className="text-[10px] text-gray-600 ml-auto" title={phaseDisplayName(phase)}>
            {phase}
          </span>
        )}
      </div>
      <div className="font-ui-orders prose prose-invert prose-xs max-w-none text-gray-300 text-[13px] leading-relaxed [&_p]:mb-1.5 [&_p:last-child]:mb-0 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0 [&_strong]:text-gray-100">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{message}</ReactMarkdown>
      </div>
      </div>
    </div>
  );
}
