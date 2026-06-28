// ─── Team Flags ───────────────────────────────────────────────────────────────
// Maps Spanish team names (as stored in data/results.json) to ISO 3166-1
// alpha-2 codes used by flagcdn.com. England and Scotland use the special
// gb-eng / gb-sct subdivision codes. Knockout placeholders ("Ganador …",
// "Clasificado …", "Perdedor …") and masked values ("?", "–") are not in the
// map, so flag() returns an empty string for them.

const TEAM_FLAGS: Record<string, string> = {
  'México': 'mx',
  'Sudáfrica': 'za',
  'República Checa': 'cz',
  'Corea del Sur': 'kr',
  'Bosnia y H.': 'ba',
  'Canadá': 'ca',
  'Estados Unidos': 'us',
  'Paraguay': 'py',
  'Suiza': 'ch',
  'Qatar': 'qa',
  'Brasil': 'br',
  'Marruecos': 'ma',
  'Escocia': 'gb-sct',
  'Haití': 'ht',
  'Australia': 'au',
  'Turquía': 'tr',
  'Curazao': 'cw',
  'Alemania': 'de',
  'Países Bajos': 'nl',
  'Japón': 'jp',
  'Ecuador': 'ec',
  'Costa de Marfil': 'ci',
  'Túnez': 'tn',
  'Suecia': 'se',
  'Cabo Verde': 'cv',
  'España': 'es',
  'Bélgica': 'be',
  'Egipto': 'eg',
  'Uruguay': 'uy',
  'Arabia Saudita': 'sa',
  'Nueva Zelanda': 'nz',
  'Irán': 'ir',
  'Francia': 'fr',
  'Senegal': 'sn',
  'Noruega': 'no',
  'Irak': 'iq',
  'Argentina': 'ar',
  'Argelia': 'dz',
  'Jordania': 'jo',
  'Austria': 'at',
  'RD Congo': 'cd',
  'Portugal': 'pt',
  'Inglaterra': 'gb-eng',
  'Croacia': 'hr',
  'Ghana': 'gh',
  'Panamá': 'pa',
  'Colombia': 'co',
  'Uzbekistán': 'uz'
};

/**
 * Returns an <img> flag for the given team name, or an empty string when the
 * team has no known flag (knockout placeholders, masked values, etc.).
 *
 * @param team   Team name exactly as stored in results.json.
 * @param height Flag height in px (width auto-scales). Defaults to 14.
 */
export function flag(team: string, height = 14): string {
  const code = TEAM_FLAGS[team];
  if (!code) return '';
  // flagcdn serves height-based variants (h20, h40, …); the actual display
  // size is controlled by CSS (.team-flag). h40 keeps it crisp on HiDPI.
  const src1x = `https://flagcdn.com/h40/${code}.png`;
  const src2x = `https://flagcdn.com/h80/${code}.png`;
  return `<img class="team-flag" src="${src1x}" srcset="${src2x} 2x" alt="${team}" title="${team}" style="height:${height}px" loading="lazy">`;
}
