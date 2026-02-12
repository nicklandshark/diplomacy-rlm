import { type ConnectionIndicatorState, type ConnectionLamp } from "./connection-indicator";

const LAMP_COLORS: Record<ConnectionLamp, {
  top: string;
  bottom: string;
  border: string;
  glow: string;
}> = {
  green: {
    top: "bg-[#78d18f]",
    bottom: "bg-[#4a7c59]",
    border: "border-[#6ab682]/70",
    glow: "shadow-[0_0_9px_rgba(120,209,143,0.65)]",
  },
  amber: {
    top: "bg-[#e0d17a]",
    bottom: "bg-[#b79d58]",
    border: "border-[#d8bf6f]/70",
    glow: "shadow-[0_0_9px_rgba(224,209,122,0.6)]",
  },
  red: {
    top: "bg-[#e08b8f]",
    bottom: "bg-[#a65a62]",
    border: "border-[#d47b82]/70",
    glow: "shadow-[0_0_9px_rgba(224,139,143,0.62)]",
  },
};

const SHELL_GLOW: Record<ConnectionLamp, string> = {
  green: "shadow-[0_0_0_1px_rgba(113,191,142,0.25),0_0_14px_rgba(113,191,142,0.22)]",
  amber: "shadow-[0_0_0_1px_rgba(212,180,102,0.3),0_0_14px_rgba(212,180,102,0.2)]",
  red: "shadow-[0_0_0_1px_rgba(212,126,126,0.32),0_0_14px_rgba(212,126,126,0.22)]",
};

const STOPLIGHT_ORDER: ConnectionLamp[] = ["green", "amber", "red"];

interface ConnectionStatusBadgeProps {
  indicator: ConnectionIndicatorState;
}

export default function ConnectionStatusBadge({ indicator }: ConnectionStatusBadgeProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={`Connection ${indicator.stateChip}.`}
      data-ui="connection-status-badge"
      data-active-lamp={indicator.activeLamp}
      className={`inline-flex max-w-[220px] items-center gap-2 rounded-[9px] border px-1.5 py-1 ${SHELL_GLOW[indicator.activeLamp]}`}
      style={{
        borderColor: "#1f2a36",
        background:
          "linear-gradient(180deg, rgba(22,29,38,0.95) 0%, rgba(10,14,20,0.98) 100%)",
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.08), inset 0 -1px 0 rgba(0,0,0,0.62), 0 0 0 1px rgba(0,0,0,0.2)",
      }}
    >
      <span className="inline-flex shrink-0 items-center gap-1.5 rounded-[8px] border border-[#2b3743] bg-[#0a1118] px-2 py-1">
        {STOPLIGHT_ORDER.map((lamp) => {
          const palette = LAMP_COLORS[lamp];
          const isActive = indicator.activeLamp === lamp;
          return (
            <span
              key={lamp}
              data-lamp={lamp}
              className={`relative inline-flex h-5 w-3 overflow-hidden rounded-[999px] border transition-all ${
                isActive
                  ? `${palette.border} ${palette.glow} opacity-100`
                  : `${palette.border} opacity-35 saturate-50`
              }`}
            >
              <span className={`absolute inset-x-0 top-0 h-1/2 ${palette.top} ${isActive ? "opacity-100" : "opacity-50"}`} />
              <span className={`absolute inset-x-0 bottom-0 h-1/2 ${palette.bottom} ${isActive ? "opacity-95" : "opacity-45"}`} />
            </span>
          );
        })}
      </span>
      <span aria-hidden className="h-6 w-px bg-gradient-to-b from-[#4f6278]/0 via-[#4f6278]/45 to-[#4f6278]/0" />
      <span
        className={`inline-flex min-w-0 items-center rounded-[4px] border px-2 py-0.5 text-[9px] tracking-[0.12em] font-semibold ${indicator.stateChipClass}`}
        style={{ fontFamily: "'IBM Plex Mono', monospace" }}
      >
        {indicator.stateChip}
      </span>
    </div>
  );
}
