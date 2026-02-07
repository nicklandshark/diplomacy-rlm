import type { ParsedOrder } from "./types";
import { locationName as loc } from "./locations";

function unit(type: "A" | "F"): string {
  return type === "A" ? "Army" : "Fleet";
}

export function orderIcon(action: ParsedOrder["action"]): string {
  switch (action) {
    case "M": return "→";
    case "H": return "⊙";
    case "S": return "↗";
    case "C": return "⛵";
    case "B": return "+";
    case "D": return "✕";
    case "R": return "↩";
    case "W": return "∅";
    default: return "•";
  }
}

export function humanizeOrder(o: ParsedOrder): string {
  switch (o.action) {
    case "H":
      return `${unit(o.unitType)} in ${loc(o.loc)} holds`;
    case "M":
      return `${unit(o.unitType)} in ${loc(o.loc)} moves to ${loc(o.dest!)}${o.via ? " via convoy" : ""}`;
    case "S":
      if (o.dest && o.srcLoc) {
        return `${unit(o.unitType)} in ${loc(o.loc)} supports ${loc(o.srcLoc)} → ${loc(o.dest)}`;
      }
      return `${unit(o.unitType)} in ${loc(o.loc)} supports ${loc(o.dest!)}`;
    case "C":
      return `${unit(o.unitType)} in ${loc(o.loc)} convoys ${loc(o.srcLoc!)} → ${loc(o.dest!)}`;
    case "B":
      return `Build ${unit(o.unitType)} in ${loc(o.loc)}`;
    case "D":
      return `${unit(o.unitType)} in ${loc(o.loc)} disbanded`;
    case "R":
      return `${unit(o.unitType)} in ${loc(o.loc)} retreats to ${loc(o.dest!)}`;
    case "W":
      return "Waive build";
    default:
      return o.raw;
  }
}

export function parseOrder(raw: string): ParsedOrder | null {
  const tokens = raw.trim().split(/\s+/);
  if (!tokens.length) return null;

  // WAIVE
  if (tokens[0] === "WAIVE") {
    return { raw, unitType: "A", loc: "", action: "W" };
  }

  // Must start with A or F
  if (tokens[0] !== "A" && tokens[0] !== "F") return null;
  const unitType = tokens[0] as "A" | "F";
  const loc = tokens[1];
  if (!loc) return null;

  // A PAR H
  if (tokens[2] === "H") {
    return { raw, unitType, loc, action: "H" };
  }

  // A PAR - BUR [VIA]
  if (tokens[2] === "-") {
    const via = tokens[tokens.length - 1] === "VIA";
    const dest = via ? tokens[tokens.length - 2] : tokens[tokens.length - 1];
    return { raw, unitType, loc, action: "M", dest, via };
  }

  // A PAR S A MAR - BUR  (support move)
  // A PAR S A MAR  or  A PAR S MAR  (support hold)
  if (tokens[2] === "S") {
    const dashIdx = tokens.indexOf("-", 3);
    if (dashIdx !== -1) {
      // Support move: A PAR S [A/F] MAR - BUR
      const srcLoc =
        tokens[3] === "A" || tokens[3] === "F" ? tokens[4] : tokens[3];
      const dest = tokens[dashIdx + 1];
      return { raw, unitType, loc, action: "S", srcLoc, dest };
    } else {
      // Support hold: A PAR S [A/F] MAR
      const dest = tokens[tokens.length - 1];
      return { raw, unitType, loc, action: "S", dest };
    }
  }

  // F ENG C A PAR - LON
  if (tokens[2] === "C") {
    const srcLoc =
      tokens[3] === "A" || tokens[3] === "F" ? tokens[4] : tokens[3];
    const dashIdx = tokens.indexOf("-", 3);
    const dest =
      dashIdx !== -1 ? tokens[dashIdx + 1] : tokens[tokens.length - 1];
    return { raw, unitType, loc, action: "C", srcLoc, dest };
  }

  // A PAR B (build)
  if (tokens[2] === "B") {
    return { raw, unitType, loc, action: "B" };
  }

  // A PAR D (disband)
  if (tokens[2] === "D") {
    return { raw, unitType, loc, action: "D" };
  }

  // A PAR R BUR (retreat)
  if (tokens[2] === "R") {
    return { raw, unitType, loc, action: "R", dest: tokens[3] };
  }

  return null;
}

export function parseOrders(
  orders: Record<string, string[]>,
): { power: string; order: ParsedOrder }[] {
  const result: { power: string; order: ParsedOrder }[] = [];
  for (const [power, orderList] of Object.entries(orders)) {
    for (const raw of orderList) {
      const parsed = parseOrder(raw);
      if (parsed) {
        parsed.power = power;
        result.push({ power, order: parsed });
      }
    }
  }
  return result;
}
