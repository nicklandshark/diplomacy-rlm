"use client";

import { POWER_DISPLAY_COLORS } from "@/lib/constants";
import { locationName } from "@/lib/locations";

export interface TooltipInfo {
  text: string;
  subtext?: string;
  x: number;  // client x
  y: number;  // client y
  color?: string;
}

interface Props {
  info: TooltipInfo | null;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export default function MapTooltip({ info, containerRef }: Props) {
  if (!info || !containerRef.current) return null;

  const rect = containerRef.current.getBoundingClientRect();
  const left = info.x - rect.left + 12;
  const top = info.y - rect.top - 8;

  return (
    <div
      className="absolute z-50 pointer-events-none"
      style={{ left, top, transform: "translateY(-100%)" }}
    >
      <div
        className="rounded px-2.5 py-1.5 text-xs shadow-lg border"
        style={{
          background: "rgba(0,0,0,0.9)",
          borderColor: info.color || "#555",
        }}
      >
        <div style={{ color: info.color || "#fff" }} className="font-semibold">
          {info.text}
        </div>
        {info.subtext && (
          <div className="text-gray-400 text-[10px] mt-0.5">{info.subtext}</div>
        )}
      </div>
    </div>
  );
}

export function unitTooltip(power: string, unitType: string, loc: string, x: number, y: number): TooltipInfo {
  const typeName = unitType === "F" ? "Fleet" : "Army";
  return {
    text: `${power}`,
    subtext: `${typeName} in ${locationName(loc)}`,
    x,
    y,
    color: POWER_DISPLAY_COLORS[power] || "#fff",
  };
}

export function territoryTooltip(province: string, owner: string | null, x: number, y: number): TooltipInfo {
  const name = locationName(province);
  return {
    text: name,
    subtext: owner || undefined,
    x,
    y,
    color: owner ? POWER_DISPLAY_COLORS[owner] || "#fff" : "#999",
  };
}
