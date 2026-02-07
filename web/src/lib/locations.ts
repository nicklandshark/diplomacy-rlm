/** Full display names for all Diplomacy map locations. */
const LOCATIONS: Record<string, string> = {
  ADR: "Adriatic Sea", AEG: "Aegean Sea", ALB: "Albania", ANK: "Ankara",
  APU: "Apulia", ARM: "Armenia", BAL: "Baltic Sea", BAR: "Barents Sea",
  BEL: "Belgium", BER: "Berlin", BLA: "Black Sea", BOH: "Bohemia",
  BOT: "Gulf of Bothnia", BRE: "Brest", BUD: "Budapest", BUL: "Bulgaria",
  "BUL/EC": "Bulgaria (East Coast)", "BUL/SC": "Bulgaria (South Coast)",
  BUR: "Burgundy", CLY: "Clyde", CON: "Constantinople", DEN: "Denmark",
  EAS: "Eastern Mediterranean", EDI: "Edinburgh", ENG: "English Channel",
  FIN: "Finland", GAL: "Galicia", GAS: "Gascony", GOL: "Gulf of Lyon",
  GRE: "Greece", HEL: "Helgoland Bight", HOL: "Holland", ION: "Ionian Sea",
  IRI: "Irish Sea", KIE: "Kiel", LON: "London", LVN: "Livonia",
  LVP: "Liverpool", LYO: "Gulf of Lyon", MAO: "Mid-Atlantic Ocean",
  MAR: "Marseilles", MID: "Mid-Atlantic Ocean", MOS: "Moscow", MUN: "Munich",
  NAF: "North Africa", NAO: "North Atlantic Ocean", NAP: "Naples",
  NAT: "North Atlantic", NRG: "Norwegian Sea", NTH: "North Sea",
  NWG: "Norwegian Sea", NWY: "Norway", PAR: "Paris", PIC: "Picardy",
  PIE: "Piedmont", POR: "Portugal", PRU: "Prussia", ROM: "Rome",
  RUH: "Ruhr", RUM: "Rumania", SER: "Serbia", SEV: "Sevastopol",
  SIL: "Silesia", SKA: "Skagerrak", SMY: "Smyrna", SPA: "Spain",
  "SPA/NC": "Spain (North Coast)", "SPA/SC": "Spain (South Coast)",
  STP: "St. Petersburg", "STP/NC": "St. Petersburg (North Coast)",
  "STP/SC": "St. Petersburg (South Coast)", SWE: "Sweden", SYR: "Syria",
  TRI: "Trieste", TUN: "Tunisia", TUS: "Tuscany", TYR: "Tyrolia",
  TYS: "Tyrrhenian Sea", UKR: "Ukraine", VEN: "Venice", VIE: "Vienna",
  WAL: "Wales", WAR: "Warsaw", WES: "Western Mediterranean", YOR: "Yorkshire",
};

export function locationName(code: string): string {
  return LOCATIONS[code] || code;
}

/** Try to extract a 3-letter province code from an SVG element id like "_bur" */
export function provinceFromSvgId(id: string): string | null {
  if (!id || !id.startsWith("_")) return null;
  return id.slice(1).toUpperCase();
}

export default LOCATIONS;
