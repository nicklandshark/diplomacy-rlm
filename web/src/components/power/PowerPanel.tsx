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
        border rounded p-2 cursor-pointer transition-colors
        ${isActive
          ? "border-blue-500 bg-gray-800"
          : "border-gray-800 bg-gray-900 hover:border-gray-600"
        }
      `}
    >
      <div className="flex items-center justify-between">
        <PowerBadge power={power} />
        <span className="text-xs text-gray-400">
          {units.length}u {centers.length}c
        </span>
      </div>
    </div>
  );
}
