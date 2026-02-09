import { POWER_DISPLAY_COLORS } from "@/lib/constants";
import { powerFlag, powerShort } from "@/lib/power-flags";

interface Props {
  power: string;
  size?: "sm" | "md";
  showFlag?: boolean;
}

export default function PowerBadge({ power, size = "md", showFlag = true }: Props) {
  const color = POWER_DISPLAY_COLORS[power] || "#999";
  const textSize = size === "sm" ? "text-[11px]" : "text-sm";
  const flag = showFlag ? powerFlag(power) : "";

  return (
    <span className="inline-flex items-center gap-1">
      {flag && <span className={size === "sm" ? "text-xs" : "text-sm"}>{flag}</span>}
      <span className={`${textSize} font-semibold`} style={{ color }}>
        {powerShort(power)}
      </span>
    </span>
  );
}
