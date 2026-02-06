import { Coordinates, SymbolSizes } from "@/lib/map-metadata";

interface Props {
  loc: string;
  powerColor: string;
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

export default function HoldOrder({ loc, powerColor }: Props) {
  const pos = centerSymbol(loc, "HoldUnit");
  if (!pos) return null;
  const size = SymbolSizes.HoldUnit;
  return (
    <g stroke={powerColor}>
      <use
        xlinkHref="#HoldUnit"
        x={pos[0]}
        y={pos[1]}
        width={size.width}
        height={size.height}
      />
    </g>
  );
}
