export const ALL_POWERS = [
  "AUSTRIA", "ENGLAND", "FRANCE", "GERMANY", "ITALY", "RUSSIA", "TURKEY"
] as const;

export type PowerName = (typeof ALL_POWERS)[number];

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

export const PHASE_REGEX = /^[SFW]\d{4}[MRA]$/;

export function phaseDisplayName(phase: string): string {
  if (!phase || phase === "COMPLETED") return phase;
  const season = phase[0] === "S" ? "Spring" : phase[0] === "F" ? "Fall" : "Winter";
  const year = phase.slice(1, 5);
  const type = phase[5] === "M" ? "Movement" : phase[5] === "R" ? "Retreats" : "Adjustments";
  return `${season} ${year} ${type}`;
}

export function phaseSort(a: string, b: string): number {
  return a.localeCompare(b);
}
