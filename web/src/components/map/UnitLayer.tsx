"use client";

import React from "react";
import { Coordinates, SymbolSizes } from "@/lib/map-metadata";

interface UnitLayerProps {
  units: Record<string, string[]>;
}

export default function UnitLayer({ units }: UnitLayerProps) {
  const elements: React.ReactElement[] = [];

  for (const [power, unitList] of Object.entries(units)) {
    for (const unit of unitList) {
      const parts = unit.split(" ");
      if (parts.length < 2) continue;
      const unitType = parts[0]; // A or F
      const loc = parts.slice(1).join("/"); // Handle "STP SC" -> "STP/SC"
      const symbol = unitType === "F" ? "Fleet" : "Army";
      const coord = Coordinates[loc];
      if (!coord) continue;
      const size = SymbolSizes[symbol];
      if (!size) continue;

      elements.push(
        <use
          key={`${power}-${unit}`}
          xlinkHref={`#${symbol}`}
          x={coord.unit[0]}
          y={coord.unit[1]}
          width={size.width}
          height={size.height}
          className={`unit${power.toLowerCase()}`}
        />,
      );
    }
  }

  return <g id="UnitLayerDynamic">{elements}</g>;
}
