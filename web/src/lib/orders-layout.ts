import type { PhaseResults } from "./types";
import { parseOrder } from "./parse-orders";

type OrderResolution = "resolved" | "failed" | "void" | "pending";
type OrdersPanelLayoutMode = "compact" | "normal" | "wide";

interface OrderRowModel {
  unit: string;
  order: string;
  resolution: OrderResolution;
}

const FAILED_RESULTS = new Set([
  "bounce",
  "dislodged",
  "no convoy",
  "disrupted",
  "cut",
]);

export function getOrdersPanelLayoutMode(
  panelWidth: number,
  viewportWidth: number,
): OrdersPanelLayoutMode {
  const panel = Number.isFinite(panelWidth) ? panelWidth : 0;
  const viewport = Number.isFinite(viewportWidth) ? viewportWidth : 0;

  if (viewport < 980 || panel < 560) return "compact";
  if (viewport < 1380 || panel < 760) return "normal";
  return "wide";
}

export function getOrderResolution(
  rawOrder: string,
  results?: PhaseResults | null,
): OrderResolution {
  if (!results) return "pending";
  const parsed = parseOrder(rawOrder);
  if (!parsed || !parsed.loc || !parsed.unitType) return "pending";

  const unitKey = `${parsed.unitType} ${parsed.loc}`;
  const outcome = results[unitKey];
  if (!outcome) return "pending";
  if (outcome.length === 0) return "resolved";
  if (outcome.some((value) => value === "void")) return "void";
  if (outcome.some((value) => FAILED_RESULTS.has(value))) return "failed";
  return "failed";
}

function toCompactOrderLabel(rawOrder: string): string {
  const parsed = parseOrder(rawOrder);
  if (!parsed) return rawOrder;

  switch (parsed.action) {
    case "H":
      return "HOLD";
    case "M":
      return parsed.dest ? `MOVE ${parsed.dest}` : "MOVE";
    case "S":
      if (parsed.srcLoc && parsed.dest) return `SUPPORT ${parsed.srcLoc}-${parsed.dest}`;
      if (parsed.dest) return `SUPPORT ${parsed.dest}`;
      return "SUPPORT";
    case "C":
      if (parsed.srcLoc && parsed.dest) return `CONVOY ${parsed.srcLoc}-${parsed.dest}`;
      return "CONVOY";
    case "R":
      return parsed.dest ? `RETREAT ${parsed.dest}` : "RETREAT";
    case "B":
      return "BUILD";
    case "D":
      return "DISBAND";
    case "W":
      return "WAIVE";
    default:
      return rawOrder;
  }
}

export function toOrderRowModel(
  rawOrder: string,
  results?: PhaseResults | null,
): OrderRowModel {
  const parsed = parseOrder(rawOrder);
  return {
    unit: parsed ? `${parsed.unitType} ${parsed.loc}`.trim() : "--",
    order: toCompactOrderLabel(rawOrder),
    resolution: getOrderResolution(rawOrder, results),
  };
}

export function toOrderResultLabel(rawResult: string, statusLabel: string): string {
  const rendered = (rawResult || "").trim();
  if (!rendered || rendered.toLowerCase() === "no report") return "no report";
  if (rendered.toLowerCase() === "resolved") return statusLabel;
  return rendered;
}
