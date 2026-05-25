import type { Bet, Result, PlayerStats, PlusBet } from './types';
import { state } from './state';

// ─── Scoring ──────────────────────────────────────────────────────────────────

export function getMultiplier(tipo?: string): number {
  return state.SETTINGS.multiplicadores[tipo || 'N'] ?? 1;
}

/** Returns raw points (before multiplier) for a match bet, or null if not finished */
export function calcMatchScore(bet: Bet, result: Result): { pts: number; type: 'score' | 'result' | 'miss' } | null {
  if (result.status !== 'finalizado') return null;
  if (bet.gL === result.gL && bet.gV === result.gV) {
    return { pts: state.SETTINGS.puntos.score, type: 'score' };
  }
  const rT = result.gL > result.gV ? 1 : result.gL < result.gV ? -1 : 0;
  const bT = bet.gL > bet.gV ? 1 : bet.gL < bet.gV ? -1 : 0;
  if (rT === bT) return { pts: state.SETTINGS.puntos.result, type: 'result' };
  return { pts: 0, type: 'miss' };
}

export function normalizePlayerName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es-CO');
}

export function calcularPuntosConvocatoria(userPlusData: PlusBet | undefined, listaOficial: string[] | undefined): number {
  if (
    !userPlusData?.convocatoriaColombia ||
    userPlusData.convocatoriaColombia.length !== 26 ||
    !listaOficial ||
    listaOficial.length !== 26
  ) return 0;

  const oficiales = new Set(listaOficial.map(normalizePlayerName).filter(Boolean));
  const predichos = new Set(userPlusData.convocatoriaColombia.map(normalizePlayerName).filter(Boolean));

  let aciertos = 0;
  predichos.forEach(jugador => {
    if (oficiales.has(jugador)) aciertos += 1;
  });

  return aciertos;
}

/** Points earned from Plus predictions */
export function calcPlusScore(name: string): number {
  const plus = state.PLUS_BETS[name];
  if (!plus || !state.PLUS_RESULTS) return 0;
  const p = state.SETTINGS.puntos;
  let total = 0;

  // top4
  if (state.PLUS_RESULTS.top4.campeon && plus.top4.campeon === state.PLUS_RESULTS.top4.campeon) total += p.firstPlus;
  if (state.PLUS_RESULTS.top4.subcampeon && plus.top4.subcampeon === state.PLUS_RESULTS.top4.subcampeon) total += p.secondPlus;
  if (state.PLUS_RESULTS.top4.tercero && plus.top4.tercero === state.PLUS_RESULTS.top4.tercero) total += p.thirdPlus;
  if (state.PLUS_RESULTS.top4.cuarto && plus.top4.cuarto === state.PLUS_RESULTS.top4.cuarto) total += p.fourthPlus;

  // group positions
  Object.entries(state.PLUS_RESULTS.posicionesGrupos).forEach(([grp, real]) => {
    const pred = plus.posicionesGrupos[grp];
    if (!pred) return;
    real.forEach((team, idx) => {
      if (team && pred[idx] === team) total += p.groupPlus;
    });
  });

  // goOn (team advancing from knockout round)
  if (plus.goOn) {
    plus.goOn.forEach(bet => {
      const real = state.PLUS_RESULTS!.goOn?.find(r => r.matchId === bet.matchId);
      if (real && real.equipo && real.equipo === bet.equipo) total += p.goOnPlus;
    });
  }

  return total;
}

export function getStats(name: string): PlayerStats {
  const ptsConvocatoria = calcularPuntosConvocatoria(
    state.PLUS_BETS[name],
    state.COLOMBIA_FINAL?.jugadoresOficiales
  );
  let ptsMatch = 0, tend = 0, miss = 0;
  const streak: string[] = [];

  state.RESULTS.forEach(r => {
    const b = state.BETS[name]?.find(x => x.matchId === r.id);
    if (!b) return;
    const raw = calcMatchScore(b, r);
    if (raw === null) return;

    const finalPts = raw.pts * getMultiplier(r.tipo);
    ptsMatch += finalPts;

    if (raw.type === 'score') streak.push('E');
    else if (raw.type === 'result') { tend++; streak.push('T'); }
    else { miss++; streak.push('X'); }
  });

  const ptsPlus = calcPlusScore(name);
  return { name, pts: ptsMatch + ptsPlus, ptsMatch, ptsPlus, ptsConvocatoria, tend, miss, streak };
}
