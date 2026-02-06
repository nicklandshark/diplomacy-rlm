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

export default function ConvoyOrder({
  loc,
  srcLoc,
  dest,
  powerColor,
}: Props) {
  const locC = getUnitCenter(loc);
  const srcC = getUnitCenter(srcLoc);
  const destC = getUnitCenter(dest);
  const symbolPos = centerSymbol(srcLoc, "ConvoyTriangle");
  if (!locC || !srcC || !destC || !symbolPos) return null;

  const size = SymbolSizes.ConvoyTriangle;
  const symY = symbolPos[1] - size.height / 6;

  const dx = destC[0] - srcC[0];
  const dy = destC[1] - srcC[1];
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len === 0) return null;
  const deltaDec = SymbolSizes.Army.width / 2 + 2 * 6;
  const adjDestX = srcC[0] + ((len - deltaDec) / len) * dx;
  const adjDestY = srcC[1] + ((len - deltaDec) / len) * dy;

  return (
    <g stroke={powerColor}>
      <line
        x1={locC[0]}
        y1={locC[1]}
        x2={srcC[0]}
        y2={srcC[1]}
        className="shadowdash"
      />
      <line
        x1={locC[0]}
        y1={locC[1]}
        x2={srcC[0]}
        y2={srcC[1]}
        className="convoyorder"
      />
      <line
        x1={srcC[0]}
        y1={srcC[1]}
        x2={adjDestX}
        y2={adjDestY}
        className="shadowdash"
      />
      <line
        x1={srcC[0]}
        y1={srcC[1]}
        x2={adjDestX}
        y2={adjDestY}
        className="convoyorder"
        markerEnd="url(#arrow)"
      />
      <use
        xlinkHref="#ConvoyTriangle"
        x={symbolPos[0]}
        y={symY}
        width={size.width}
        height={size.height}
      />
    </g>
  );
}
