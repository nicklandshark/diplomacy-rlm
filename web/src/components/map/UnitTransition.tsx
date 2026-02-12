"use client";

import React, { useLayoutEffect, useRef, useState } from "react";

interface UnitTransitionProps {
  /** SVG symbol id — "Army" or "Fleet" */
  symbol: string;
  /** CSS class for power coloring, e.g. "unitfrance" */
  className: string;
  /** Symbol width/height */
  width: number;
  height: number;
  /** Starting position (top-left of the use element, matching UnitLayer convention) */
  fromX: number;
  fromY: number;
  /** Ending position */
  toX: number;
  toY: number;
  /** Whether the transition animation should be active */
  animating: boolean;
  /** Unit is newly built — fade-in + scale-up */
  entering?: boolean;
  /** Unit is being disbanded — fade-out + scale-down */
  exiting?: boolean;
  /** Unique key for React */
  id: string;
}

/**
 * Renders a single unit (army/fleet) with smooth CSS-transition-based animation.
 *
 * - **Moving**: translates from (fromX, fromY) to (toX, toY) over 400ms
 * - **Entering (build)**: fades in from opacity 0 + scales from 0.5 to 1
 * - **Exiting (disband)**: fades out to opacity 0 + scales from 1 to 0.5
 *
 * Uses a two-frame trick: render at the "from" state, then on the next frame
 * flip to the "to" state so the CSS transition kicks in.
 */
export default function UnitTransition({
  symbol,
  className,
  width,
  height,
  fromX,
  fromY,
  toX,
  toY,
  animating,
  entering = false,
  exiting = false,
}: UnitTransitionProps) {
  // We need a two-frame approach: first render at "from", then transition to "to"
  const [settled, setSettled] = useState(!animating);
  const gRef = useRef<SVGGElement>(null);

  useLayoutEffect(() => {
    if (!animating) {
      setSettled(true);
      return;
    }
    // Force the browser to paint at the "from" position first,
    // then on the next animation frame, flip to "to" so the transition fires.
    setSettled(false);
    const raf = requestAnimationFrame(() => {
      // Double-rAF to guarantee the initial paint happened
      requestAnimationFrame(() => {
        setSettled(true);
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [animating, fromX, fromY, toX, toY]);

  // Compute current transform values
  const currentX = settled ? toX : fromX;
  const currentY = settled ? toY : fromY;

  // For entering/exiting: compute opacity and scale
  let opacity: number;
  let scale: number;

  if (entering) {
    opacity = settled ? 1 : 0;
    scale = settled ? 1 : 0.5;
  } else if (exiting) {
    opacity = settled ? 0 : 1;
    scale = settled ? 0.5 : 1;
  } else {
    opacity = 1;
    scale = 1;
  }

  // Center point for scale transform (center of the symbol)
  const cx = currentX + width / 2;
  const cy = currentY + height / 2;

  // Build the transform: translate to position, then scale around center
  const transform =
    scale === 1
      ? `translate(${currentX}, ${currentY})`
      : `translate(${cx}, ${cy}) scale(${scale}) translate(${-width / 2}, ${-height / 2})`;

  const transitionStyle: React.CSSProperties = animating
    ? {
        transition: "transform 400ms cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 400ms ease-out",
        opacity,
      }
    : {
        opacity,
      };

  return (
    <g ref={gRef} style={transitionStyle} transform={transform}>
      <use
        xlinkHref={`#${symbol}`}
        x={scale === 1 ? 0 : 0}
        y={scale === 1 ? 0 : 0}
        width={width}
        height={height}
        className={className}
      />
    </g>
  );
}
