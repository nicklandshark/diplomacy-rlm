import { POWER_DISPLAY_COLORS } from "@/lib/constants";

interface Props {
  power: string;
  size?: "sm" | "md";
}

export default function PowerBadge({ power, size = "md" }: Props) {
  const color = POWER_DISPLAY_COLORS[power] || "#999";
  const dotSize = size === "sm" ? "w-2 h-2" : "w-3 h-3";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`${dotSize} rounded-full inline-block`} style={{ backgroundColor: color }} />
      <span className={`${textSize} font-medium`} style={{ color }}>{power}</span>
    </span>
  );
}
