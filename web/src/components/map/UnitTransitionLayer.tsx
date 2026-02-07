"use client";

import React from "react";
import UnitTransition from "./UnitTransition";
import type { UnitDiff } from "@/hooks/useUnitTransition";

interface UnitTransitionLayerProps {
  diffs: UnitDiff[];
  animating: boolean;
}

/**
 * Renders all units with transition animations during a phase change.
 * Replaces UnitLayer while isTransitioning is true.
 */
export default function UnitTransitionLayer({
  diffs,
  animating,
}: UnitTransitionLayerProps) {
  return (
    <g id="UnitTransitionLayer">
      {diffs.map((diff) => {
        switch (diff.kind) {
          case "move":
            return (
              <UnitTransition
                key={diff.key}
                id={diff.key}
                symbol={diff.symbol}
                className={diff.cssClass}
                width={diff.width}
                height={diff.height}
                fromX={diff.fromX}
                fromY={diff.fromY}
                toX={diff.toX}
                toY={diff.toY}
                animating={animating}
              />
            );
          case "enter":
            return (
              <UnitTransition
                key={diff.key}
                id={diff.key}
                symbol={diff.symbol}
                className={diff.cssClass}
                width={diff.width}
                height={diff.height}
                fromX={diff.x}
                fromY={diff.y}
                toX={diff.x}
                toY={diff.y}
                animating={animating}
                entering
              />
            );
          case "exit":
            return (
              <UnitTransition
                key={diff.key}
                id={diff.key}
                symbol={diff.symbol}
                className={diff.cssClass}
                width={diff.width}
                height={diff.height}
                fromX={diff.x}
                fromY={diff.y}
                toX={diff.x}
                toY={diff.y}
                animating={animating}
                exiting
              />
            );
        }
      })}
    </g>
  );
}
