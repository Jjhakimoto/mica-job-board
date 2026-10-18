export const COUNTRY_NAMES: Record<string, string> = {
  AT: "Austria",
  BE: "Belgium",
  BG: "Bulgaria",
  CY: "Cyprus",
  CZ: "Czechia",
  DE: "Germany",
  DK: "Denmark",
  EE: "Estonia",
  ES: "Spain",
  FI: "Finland",
  FR: "France",
  GR: "Greece",
  HR: "Croatia",
  IE: "Ireland",
  IS: "Iceland",
  IT: "Italy",
  LI: "Liechtenstein",
  LT: "Lithuania",
  LU: "Luxembourg",
  LV: "Latvia",
  MT: "Malta",
  NL: "Netherlands",
  NO: "Norway",
  PT: "Portugal",
  SE: "Sweden",
  SI: "Slovenia",
  SK: "Slovakia",
};

export function countryLabel(code: string): string {
  const name = COUNTRY_NAMES[code];
  return name ? `${name} (${code})` : code;
}
