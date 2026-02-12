import type { ConnectionDisplayState, ConnectionLamp } from "./connection-status";

const LAMP_COLORS: Record<ConnectionLamp, {
  top: string;
  bottom: string;
  border: string;
  glow: string;
}> = {
  green: {
    top: "bg-emerald-300",
    bottom: "bg-emerald-700",
    border: "border-emerald-300/60",
    glow: "shadow-[0_0_12px_rgba(52,211,153,0.75)]",
  },
  amber: {
    top: "bg-amber-200",
    bottom: "bg-amber-600",
    border: "border-amber-200/60",
    glow: "shadow-[0_0_12px_rgba(251,191,36,0.7)]",
  },
  red: {
    top: "bg-rose-300",
    bottom: "bg-rose-700",
    border: "border-rose-300/60",
    glow: "shadow-[0_0_12px_rgba(251,113,133,0.75)]",
  },
};

const STOPLIGHT_ORDER: ConnectionLamp[] = ["green", "amber", "red"];

export default function ConnectionStoplight({ display }: { display: ConnectionDisplayState }) {
  const isOn = display.rockerState === "ON";
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-gray-700 bg-gradient-to-b from-[#1a1f27] to-[#0d1118] px-1.5 py-[3px] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
      <span className="flex items-center gap-1 rounded-full border border-gray-700/80 bg-[#0b0f16] px-1.5 py-[3px]">
        {STOPLIGHT_ORDER.map((lamp) => {
          const palette = LAMP_COLORS[lamp];
          const isActive = display.activeLamp === lamp;
          return (
            <span
              key={lamp}
              className={`relative inline-flex h-5 w-3.5 overflow-hidden rounded-full border transition-all ${
                isActive
                  ? `${palette.border} ${palette.glow} opacity-100`
                  : `${palette.border} opacity-55 saturate-75`
              }`}
            >
              <span className={`absolute inset-x-0 top-0 h-1/2 ${palette.top} ${isActive ? "opacity-100" : "opacity-70"}`} />
              <span className={`absolute inset-x-0 bottom-0 h-1/2 ${palette.bottom} ${isActive ? "opacity-95" : "opacity-62"}`} />
            </span>
          );
        })}
      </span>
      <span
        className={`min-w-[2.25rem] px-1.5 py-[2px] text-[9px] leading-none rounded-sm border text-center tracking-[0.12em] ${
          isOn
            ? "border-emerald-300/40 bg-emerald-500/20 text-emerald-100"
            : "border-rose-300/40 bg-rose-500/20 text-rose-100"
        }`}
      >
        {display.rockerState}
      </span>
    </span>
  );
}
