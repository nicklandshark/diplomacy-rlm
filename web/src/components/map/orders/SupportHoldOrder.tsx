import { Coordinates, SymbolSizes } from "@/lib/map-metadata";

interface Props {
  loc: string;
  dest: string;
  powerColor: string;
}

function getUnitCenter(loc: string): [number, number] | null {
  const coord = Coordinates[loc];
  if (!coord) return null;
  const size = SymbolSizes.Army;
  return [coord.unit[0] + size.width / 2, coord.unit[1] + size.height / 2];
}

function centerSymbol(
  loc: string,
  symbol: string,
): [number, number] | null {
  const coord = Coordinates[loc];
  if (!coord) return null;
  const unitSize = SymbolSizes.Army;
  const symSize = SymbolSizes[symbol];
  if (!unitSize || !symSize) return null;
  return [
    coord.unit[0] + unitSize.width / 2 - symSize.width / 2,
    coord.unit[1] + unitSize.height / 2 - symSize.height / 2,
  ];
}

export default function SupportHoldOrder({ loc, dest, powerColor }: Props) {
  const locCenter = getUnitCenter(loc);
  const destCenter = getUnitCenter(dest);
  const symbolPos = centerSymbol(dest, "SupportHoldUnit");
  if (!locCenter || !destCenter || !symbolPos) return null;

  const size = SymbolSizes.SupportHoldUnit;
  const dx = destCenter[0] - locCenter[0];
  const dy = destCenter[1] - locCenter[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return null;
  const deltaDec = size.width / 2;
  const adjX = locCenter[0] + ((len - deltaDec) / len) * dx;
  const adjY = locCenter[1] + ((len - deltaDec) / len) * dy;

  return (
    <g stroke={powerColor}>
      <line
        x1={locCenter[0]}
        y1={locCenter[1]}
        x2={adjX}
        y2={adjY}
        className="shadowdash"
      />
      <line
        x1={locCenter[0]}
        y1={locCenter[1]}
        x2={adjX}
        y2={adjY}
        className="supportorder"
      />
      <use
        xlinkHref="#SupportHoldUnit"
        x={symbolPos[0]}
        y={symbolPos[1]}
        width={size.width}
        height={size.height}
      />
    </g>
  );
}
