export const POWER_COLORS: Record<string, string> = {
  AUSTRIA: "#c48f85",
  ENGLAND: "darkviolet",
  FRANCE: "royalblue",
  GERMANY: "#a08a75",
  ITALY: "forestgreen",
  RUSSIA: "#757d91",
  TURKEY: "#b9a61c",
};

export const POWER_DISPLAY_COLORS: Record<string, string> = {
  AUSTRIA: "#e8b4a8",
  ENGLAND: "#c77dff",
  FRANCE: "#6495ed",
  GERMANY: "#c4b496",
  ITALY: "#5dbb63",
  RUSSIA: "#9ba3b7",
  TURKEY: "#d4c12e",
};

export function phaseDisplayName(phase: string): string {
  if (!phase || phase === "COMPLETED") return phase;
  const season = phase[0] === "S" ? "Spring" : phase[0] === "F" ? "Fall" : "Winter";
  const year = phase.slice(1, 5);
  const type = phase[5] === "M" ? "Movement" : phase[5] === "R" ? "Retreats" : "Adjustments";
  return `${season} ${year} ${type}`;
}

const SEASON_ORDER: Record<string, number> = { S: 0, F: 1, W: 2 };
const TYPE_ORDER: Record<string, number> = { M: 0, R: 1, A: 2 };

/** Chronological sort for Diplomacy phase strings like S1901M, F1901M, W1901A. */
export function phaseSort(a: string, b: string): number {
  const yearA = parseInt(a.slice(1, 5), 10);
  const yearB = parseInt(b.slice(1, 5), 10);
  if (yearA !== yearB) return yearA - yearB;

  const seasonA = SEASON_ORDER[a[0]] ?? 9;
  const seasonB = SEASON_ORDER[b[0]] ?? 9;
  if (seasonA !== seasonB) return seasonA - seasonB;

  const typeA = TYPE_ORDER[a[5]] ?? 9;
  const typeB = TYPE_ORDER[b[5]] ?? 9;
  return typeA - typeB;
}
