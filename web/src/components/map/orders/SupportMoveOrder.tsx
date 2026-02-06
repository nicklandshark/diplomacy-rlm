import { Coordinates, SymbolSizes } from "@/lib/map-metadata";

interface Props {
  loc: string;
  srcLoc: string;
  dest: string;
  powerColor: string;
}

function getUnitCenter(loc: string): [number, number] | null {
  const coord = Coordinates[loc];
  if (!coord) return null;
  const size = SymbolSizes.Army;
  return [coord.unit[0] + size.width / 2, coord.unit[1] + size.height / 2];
}

export default function SupportMoveOrder({
  loc,
  srcLoc,
  dest,
  powerColor,
}: Props) {
  const locC = getUnitCenter(loc);
  const srcC = getUnitCenter(srcLoc);
  const destC = getUnitCenter(dest);
  if (!locC || !srcC || !destC) return null;

  const dx = destC[0] - srcC[0];
  const dy = destC[1] - srcC[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return null;
  const deltaDec = SymbolSizes.Army.width / 2 + 2 * 6;
  const adjDestX = srcC[0] + ((len - deltaDec) / len) * dx;
  const adjDestY = srcC[1] + ((len - deltaDec) / len) * dy;

  const d = `M ${locC[0]},${locC[1]} C ${srcC[0]},${srcC[1]} ${srcC[0]},${srcC[1]} ${adjDestX},${adjDestY}`;

  return (
    <g>
      <path d={d} className="shadowdash" />
      <path
        d={d}
        className="supportorder"
        stroke={powerColor}
        markerEnd="url(#arrow)"
      />
    </g>
  );
}
