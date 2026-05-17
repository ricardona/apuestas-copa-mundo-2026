import type { Result, Bet, PlusBet, Settings, PlusResults, ColombiaFinal } from './types';

// ─── Shared mutable application state ────────────────────────────────────────

export const state: {
  RESULTS: Result[];
  PLAYERS: string[];
  BETS: Record<string, Bet[]>;
  PLUS_BETS: Record<string, PlusBet>;
  PLUS_RESULTS: PlusResults | null;
  COLOMBIA_FINAL: ColombiaFinal | null;
  SETTINGS: Settings;
} = {
  RESULTS: [],
  PLAYERS: [],
  BETS: {},
  PLUS_BETS: {},
  PLUS_RESULTS: null,
  COLOMBIA_FINAL: null,
  SETTINGS: {
    puntos: { score: 3, result: 1, groupPlus: 2, firstPlus: 8, secondPlus: 5, thirdPlus: 4, fourthPlus: 3, goOnPlus: 2 },
    multiplicadores: { N: 1, E: 2, X: 3 },
    tiposPartido: { N: 'Normal', E: 'Especial', X: 'Super Especial' }
  }
};
