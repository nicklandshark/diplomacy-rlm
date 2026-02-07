import PowerBadge from "./PowerBadge";

interface Props {
  power: string;
  units: string[];
  centers: string[];
  isActive?: boolean;
  onClick?: () => void;
}

export default function PowerPanel({ power, units, centers, isActive, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      className={`
        border rounded-lg p-2.5 cursor-pointer transition-all
        ${isActive
          ? "border-blue-500/60 bg-gray-800/80 shadow-sm shadow-blue-500/10"
          : "border-gray-800 bg-gray-900 hover:border-gray-600"
        }
      `}
    >
      <div className="flex items-center justify-between">
        <PowerBadge power={power} />
        <div className="flex items-center gap-2.5 text-xs text-gray-400">
          <span title="Units">{units.length} units</span>
          <span className="text-gray-700">|</span>
          <span title="Supply centers">{centers.length} SCs</span>
        </div>
      </div>
    </div>
  );
}
