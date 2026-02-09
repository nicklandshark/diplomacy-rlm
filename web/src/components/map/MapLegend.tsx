import { ALL_POWERS, POWER_DISPLAY_COLORS } from "@/lib/constants";
import { powerFlag, powerShort } from "@/lib/power-flags";

interface Props {
  activePowers?: string[];
}

export default function MapLegend({ activePowers }: Props) {
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {ALL_POWERS.map((power) => {
        const isActive = !activePowers || activePowers.includes(power);
        return (
          <div
            key={power}
            className={`flex items-center gap-1.5 ${isActive ? "" : "opacity-30"}`}
          >
            <span className="text-sm leading-none">{powerFlag(power)}</span>
            <div
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: POWER_DISPLAY_COLORS[power] }}
            />
            <span className="text-gray-300">{powerShort(power)}</span>
          </div>
        );
      })}
    </div>
  );
}
