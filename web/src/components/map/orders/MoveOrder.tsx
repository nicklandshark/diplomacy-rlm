import { Coordinates, SymbolSizes } from "@/lib/map-metadata";

interface Props {
  src: string;
  dest: string;
  powerColor: string;
  isDislodged?: boolean;
  isHovered?: boolean;
}

function getUnitCenter(
  loc: string,
  isDislodged: boolean,
): [number, number] | null {
  const coord = Coordinates[loc];
  if (!coord) return null;
  const size = SymbolSizes.Army;
  const key = isDislodged ? "disl" : "unit";
  return [coord[key][0] + size.width / 2, coord[key][1] + size.height / 2];
}

export default function MoveOrder({
  src,
  dest,
  powerColor,
  isDislodged = false,
  isHovered = false,
}: Props) {
  const srcCenter = getUnitCenter(src, isDislodged);
  const destCenter = getUnitCenter(dest, false);
  if (!srcCenter || !destCenter) return null;

  const dx = destCenter[0] - srcCenter[0];
  const dy = destCenter[1] - srcCenter[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return null;
  const deltaDec = SymbolSizes.Army.width / 2 + 2 * 6;
  const destX = srcCenter[0] + ((len - deltaDec) / len) * dx;
  const destY = srcCenter[1] + ((len - deltaDec) / len) * dy;

  return (
    <g>
      {isHovered && (
        <style>{`
          @keyframes marchingAnts {
            from { stroke-dashoffset: 0; }
            to { stroke-dashoffset: -40; }
          }
        `}</style>
      )}
      <line
        x1={srcCenter[0]}
        y1={srcCenter[1]}
        x2={destX}
        y2={destY}
        className="varwidthshadow"
        strokeWidth={10}
      />
      <line
        x1={srcCenter[0]}
        y1={srcCenter[1]}
        x2={destX}
        y2={destY}
        className="varwidthorder"
        stroke={powerColor}
        strokeWidth={6}
        markerEnd="url(#arrow)"
      />
      {isHovered && (
        <line
          x1={srcCenter[0]}
          y1={srcCenter[1]}
          x2={destX}
          y2={destY}
          stroke="rgba(255,255,255,0.85)"
          strokeWidth={8}
          strokeLinecap="round"
          strokeDasharray="12,8"
          style={{
            animation: "marchingAnts 0.6s linear infinite",
          }}
          pointerEvents="none"
        />
      )}
    </g>
  );
}
