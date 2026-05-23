// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface Result {
  id: number;
  local: string;
  visita: string;
  gL: number;
  gV: number;
  status: 'finalizado' | 'pendiente' | 'siguiente';
  fase?: string;
  grupo?: string;
  tipo?: 'N' | 'E' | 'X';
}

export interface Bet {
  matchId: number;
  gL: number;
  gV: number;
  goOn?: string; // team predicted to advance (knockout rounds)
}

export interface PlusBet {
  posicionesGrupos: Record<string, string[]>; // group → [1st, 2nd, 3rd, 4th]
  top4: {
    campeon: string;
    subcampeon: string;
    tercero: string;
    cuarto: string;
  };
  goOn: Array<{ matchId: number; equipo: string }>;
  convocatoriaColombia?: string[];
}

export interface Settings {
  puntos: {
    score: number;
    result: number;
    groupPlus: number;
    firstPlus: number;
    secondPlus: number;
    thirdPlus: number;
    fourthPlus: number;
    goOnPlus: number;
  };
  multiplicadores: Record<string, number>;
  tiposPartido: Record<string, string>;
  mostrarConvocados: boolean;
  mostrarCuadrodeHonor: boolean;
  mostrarPosicionesGrupos: boolean;
}

export interface PlusResults {
  posicionesGrupos: Record<string, string[]>; // group → [1st, 2nd, 3rd, 4th]
  top4: {
    campeon: string;
    subcampeon: string;
    tercero: string;
    cuarto: string;
  };
  goOn: Array<{ matchId: number; equipo: string }>;
}

export interface ColombiaFinal {
  jugadoresOficiales: string[];
}

export interface PlayerStats {
  name: string;
  pts: number;
  ptsMatch: number;
  ptsPlus: number;
  ptsConvocatoria: number;
  tend: number;
  miss: number;
  streak: string[];
}
