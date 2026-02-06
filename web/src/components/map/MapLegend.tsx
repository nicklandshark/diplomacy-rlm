import { ALL_POWERS, POWER_DISPLAY_COLORS } from "@/lib/constants";

export default function MapLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-xs">
      {ALL_POWERS.map((power) => (
        <div key={power} className="flex items-center gap-1">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: POWER_DISPLAY_COLORS[power] }}
          />
          <span className="text-gray-300">{power}</span>
        </div>
      ))}
    </div>
  );
}
