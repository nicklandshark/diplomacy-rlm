/** Country flag emoji + short display names for Diplomacy powers. */
const POWER_FLAGS: Record<string, { flag: string; short: string }> = {
  AUSTRIA: { flag: "\u{1F1E6}\u{1F1F9}", short: "Austria" },
  ENGLAND: { flag: "\u{1F1EC}\u{1F1E7}", short: "England" },
  FRANCE:  { flag: "\u{1F1EB}\u{1F1F7}", short: "France" },
  GERMANY: { flag: "\u{1F1E9}\u{1F1EA}", short: "Germany" },
  ITALY:   { flag: "\u{1F1EE}\u{1F1F9}", short: "Italy" },
  RUSSIA:  { flag: "\u{1F1F7}\u{1F1FA}", short: "Russia" },
  TURKEY:  { flag: "\u{1F1F9}\u{1F1F7}", short: "Turkey" },
};

export function powerFlag(power: string): string {
  return POWER_FLAGS[power]?.flag || "";
}

export function powerShort(power: string): string {
  return POWER_FLAGS[power]?.short || power;
}
