"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Coordinates, SymbolSizes } from "@/lib/map-metadata";

/** Duration of the unit transition animation in milliseconds */
export const TRANSITION_DURATION_MS = 400;

/** Parsed representation of a single unit on the map */
export interface ParsedUnit {
  /** Power name, e.g. "FRANCE" */
  power: string;
  /** Unit type: "A" (army) or "F" (fleet) */
  unitType: string;
  /** Location code, e.g. "PAR" or "STP/SC" */
  loc: string;
  /** SVG symbol name, e.g. "Army" or "Fleet" */
  symbol: string;
  /** X position (top-left of symbol) */
  x: number;
  /** Y position (top-left of symbol) */
  y: number;
  /** Symbol width */
  width: number;
  /** Symbol height */
  height: number;
  /** CSS class for power coloring */
  cssClass: string;
}

/** A unit that is moving from one position to another */
export interface MovingUnit {
  kind: "move";
  power: string;
  unitType: string;
  symbol: string;
  cssClass: string;
  width: number;
  height: number;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  /** Stable key for React */
  key: string;
}

/** A unit that just appeared (build) */
export interface EnteringUnit {
  kind: "enter";
  power: string;
  unitType: string;
  symbol: string;
  cssClass: string;
  width: number;
  height: number;
  x: number;
  y: number;
  key: string;
}

/** A unit that is being removed (disband) */
export interface ExitingUnit {
  kind: "exit";
  power: string;
  unitType: string;
  symbol: string;
  cssClass: string;
  width: number;
  height: number;
  x: number;
  y: number;
  key: string;
}

export type UnitDiff = MovingUnit | EnteringUnit | ExitingUnit;

/**
 * Parse a units record (power -> ["A PAR", "F BRE", ...]) into ParsedUnit[].
 */
function parseUnits(units: Record<string, string[]>): ParsedUnit[] {
  const result: ParsedUnit[] = [];
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

      result.push({
        power,
        unitType,
        loc,
        symbol,
        x: coord.unit[0],
        y: coord.unit[1],
        width: size.width,
        height: size.height,
        cssClass: `unit${power.toLowerCase()}`,
      });
    }
  }
  return result;
}

/**
 * Build a lookup key for a unit. We use power + unitType as the identity
 * because a power's army is the same "entity" even if it moves.
 * When a power has multiple units of the same type, we need to match
 * them smartly — closest-match by position.
 */
function buildUnitKey(power: string, unitType: string, loc: string): string {
  return `${power}:${unitType}:${loc}`;
}

/**
 * Compute the diff between previous and current unit states.
 *
 * Matching strategy:
 * 1. For each power, group units by type (A or F).
 * 2. Units that exist in both old and new at the same location are "static" (no animation needed, treated as moved with same from/to).
 * 3. Remaining old units and new units of the same type are matched by proximity (greedy nearest-neighbor) to produce "moves".
 * 4. Unmatched new units are "entering" (builds).
 * 5. Unmatched old units are "exiting" (disbands).
 */
function computeUnitDiffs(
  prevUnits: ParsedUnit[],
  currUnits: ParsedUnit[],
): UnitDiff[] {
  const diffs: UnitDiff[] = [];

  // Group by power
  const powers = new Set([
    ...prevUnits.map((u) => u.power),
    ...currUnits.map((u) => u.power),
  ]);

  for (const power of powers) {
    const oldByPower = prevUnits.filter((u) => u.power === power);
    const newByPower = currUnits.filter((u) => u.power === power);

    // Group by unit type within each power
    const unitTypes = new Set([
      ...oldByPower.map((u) => u.unitType),
      ...newByPower.map((u) => u.unitType),
    ]);

    for (const unitType of unitTypes) {
      const oldUnits = oldByPower.filter((u) => u.unitType === unitType);
      const newUnits = newByPower.filter((u) => u.unitType === unitType);

      // Track which units have been matched
      const matchedOld = new Set<number>();
      const matchedNew = new Set<number>();

      // First pass: exact location matches (static units)
      for (let ni = 0; ni < newUnits.length; ni++) {
        for (let oi = 0; oi < oldUnits.length; oi++) {
          if (matchedOld.has(oi) || matchedNew.has(ni)) continue;
          if (oldUnits[oi].loc === newUnits[ni].loc) {
            matchedOld.add(oi);
            matchedNew.add(ni);
            // Static unit — same position, include as a "move" with same from/to
            // so UnitTransition renders it in place during the animation window
            const nu = newUnits[ni];
            diffs.push({
              kind: "move",
              power,
              unitType,
              symbol: nu.symbol,
              cssClass: nu.cssClass,
              width: nu.width,
              height: nu.height,
              fromX: nu.x,
              fromY: nu.y,
              toX: nu.x,
              toY: nu.y,
              key: buildUnitKey(power, unitType, nu.loc),
            });
          }
        }
      }

      // Second pass: greedy nearest-neighbor matching for remaining units
      const remainingOld = oldUnits
        .map((u, i) => ({ u, i }))
        .filter(({ i }) => !matchedOld.has(i));
      const remainingNew = newUnits
        .map((u, i) => ({ u, i }))
        .filter(({ i }) => !matchedNew.has(i));

      // Build distance matrix and greedily match closest pairs
      const usedOld = new Set<number>();
      const usedNew = new Set<number>();

      // Sort by distance to find best matches
      const pairs: { oi: number; ni: number; dist: number }[] = [];
      for (const { u: ou, i: oi } of remainingOld) {
        for (const { u: nu, i: ni } of remainingNew) {
          const dx = ou.x - nu.x;
          const dy = ou.y - nu.y;
          pairs.push({ oi, ni, dist: Math.sqrt(dx * dx + dy * dy) });
        }
      }
      pairs.sort((a, b) => a.dist - b.dist);

      for (const { oi, ni } of pairs) {
        if (usedOld.has(oi) || usedNew.has(ni)) continue;
        usedOld.add(oi);
        usedNew.add(ni);

        const ou = oldUnits[oi];
        const nu = newUnits[ni];
        diffs.push({
          kind: "move",
          power,
          unitType,
          symbol: nu.symbol,
          cssClass: nu.cssClass,
          width: nu.width,
          height: nu.height,
          fromX: ou.x,
          fromY: ou.y,
          toX: nu.x,
          toY: nu.y,
          key: `${power}:${unitType}:${ou.loc}->${nu.loc}`,
        });
      }

      // Unmatched new units: entering (builds)
      for (const { u: nu, i: ni } of remainingNew) {
        if (usedNew.has(ni)) continue;
        diffs.push({
          kind: "enter",
          power,
          unitType,
          symbol: nu.symbol,
          cssClass: nu.cssClass,
          width: nu.width,
          height: nu.height,
          x: nu.x,
          y: nu.y,
          key: `enter:${buildUnitKey(power, unitType, nu.loc)}`,
        });
      }

      // Unmatched old units: exiting (disbands)
      for (const { u: ou, i: oi } of remainingOld) {
        if (usedOld.has(oi)) continue;
        diffs.push({
          kind: "exit",
          power,
          unitType,
          symbol: ou.symbol,
          cssClass: ou.cssClass,
          width: ou.width,
          height: ou.height,
          x: ou.x,
          y: ou.y,
          key: `exit:${buildUnitKey(power, unitType, ou.loc)}`,
        });
      }
    }
  }

  return diffs;
}

export interface UseUnitTransitionResult {
  /** Whether a transition animation is currently playing */
  isTransitioning: boolean;
  /** The computed unit diffs to render during transition */
  diffs: UnitDiff[];
}

/**
 * Hook that tracks unit state changes and produces animation diffs.
 *
 * @param units - Current units record from GameState (power -> string[])
 * @returns Animation state: whether transitioning, and the diffs to render
 */
export function useUnitTransition(
  units: Record<string, string[]> | undefined,
): UseUnitTransitionResult {
  const prevUnitsRef = useRef<ParsedUnit[] | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [diffs, setDiffs] = useState<UnitDiff[]>([]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Serialize unit state for stable comparison
  const unitsKey = units ? JSON.stringify(units) : "";
  const prevUnitsKeyRef = useRef<string>("");

  useEffect(() => {
    // Skip if units haven't actually changed
    if (unitsKey === prevUnitsKeyRef.current) return;

    const currentParsed = units ? parseUnits(units) : [];
    const prevParsed = prevUnitsRef.current;

    // If we have a previous state and units changed, compute diffs and animate
    if (prevParsed !== null && prevParsed.length > 0 && unitsKey !== "") {
      const computed = computeUnitDiffs(prevParsed, currentParsed);

      // Only animate if there are actual moves/enters/exits (not all static)
      const hasAnimation = computed.some(
        (d) =>
          d.kind === "enter" ||
          d.kind === "exit" ||
          (d.kind === "move" && (d.fromX !== d.toX || d.fromY !== d.toY)),
      );

      if (hasAnimation) {
        // Clear any existing timer
        if (timerRef.current) clearTimeout(timerRef.current);

        setDiffs(computed);
        setIsTransitioning(true);

        timerRef.current = setTimeout(() => {
          setIsTransitioning(false);
          setDiffs([]);
          timerRef.current = null;
        }, TRANSITION_DURATION_MS + 50); // Small buffer after animation completes
      }
    }

    // Update refs
    prevUnitsRef.current = currentParsed;
    prevUnitsKeyRef.current = unitsKey;

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [unitsKey, units]);

  return { isTransitioning, diffs };
}
