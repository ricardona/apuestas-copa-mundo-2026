import type { Bet } from '../types';
import { state } from '../state';
import { calcMatchScore, getMultiplier } from '../scoring';
import { avatar } from '../avatar';
import { flag } from '../flags';
import { formatMatchDate, formatCountdown, tipoLabel } from '../match-display';

// ─── Matches ──────────────────────────────────────────────────────────────────

export function buildMatches() {
  const byMatch: Record<number, (Bet & { player: string })[]> = {};

  state.PLAYERS.forEach(name => {
    if (!state.BETS[name]) return;
    state.BETS[name].forEach(b => {
      if (!byMatch[b.matchId]) byMatch[b.matchId] = [];
      byMatch[b.matchId].push({ ...b, player: name });
    });
  });

  const listEl = document.getElementById('matches-list');
  if (!listEl) return;

  const renderMatchCard = (r: typeof state.RESULTS[number]) => {
    const bets = byMatch[r.id] || [];
    const dateStr = formatMatchDate(r.fecha);
    const countdown = formatCountdown(r.fecha, r.status);
    const scoreHtml = r.status === 'finalizado'
      ? `<span class="score-digit">${r.gL}</span><span class="score-sep">–</span><span class="score-digit">${r.gV}</span>`
      : `<span class="score-digit" style="color:#444">?</span><span class="score-sep">–</span><span class="score-digit" style="color:#444">?</span>`;

    const betsHtml = bets.map(b => {
      const raw = calcMatchScore(b, r);
      const mult = getMultiplier(r.tipo);
      const finalPts = raw !== null ? raw.pts * mult : null;
      const ptsStr = finalPts === null ? '–' : `+${finalPts}`;
      const ptsC = raw === null ? 'bp0' : raw.type === 'score' ? 'bp5' : raw.type === 'result' ? 'bp3' : 'bp0';
      const showBet = r.status === 'finalizado' || r.status === 'jugando' || b.player === state.CURRENT_PLAYER;
      const betScoreTxt = showBet ? `${b.gL} – ${b.gV}` : `? – ?`;

      // "Avanza" (goOn) marker for knockout matches: show the flag of the team the
      // player predicted to advance. Revealed only when the bet is visible and the
      // pick is a real team (the API masks it as '?' for still-open matches).
      let goOnHtml = '';
      if (r.fase && r.fase !== 'Grupos') {
        const pick = state.PLUS_BETS[b.player]?.goOn?.find(g => g.matchId === r.id)?.equipo;
        if (showBet && pick && pick !== '?') {
          let stateC = '';
          let mark = '';
          if (r.status === 'finalizado') {
            const real = state.PLUS_RESULTS?.goOn?.find(g => g.matchId === r.id)?.equipo;
            if (real) {
              const correct = real === pick;
              stateC = correct ? ' correct' : ' wrong';
              mark = `<span class="bet-goon-mark">${correct ? '✓' : '✗'}</span>`;
            }
          }
          goOnHtml = `<span class="bet-goon${stateC}" title="Avanza: ${pick}">${flag(pick, 10)}${mark}</span>`;
        }
      }

      return `<div class="bet-row">
        <div class="bet-left">${avatar(b.player, 22, state.AVATARS[b.player])} ${b.player}</div>
        <div class="bet-right">
          <span class="bet-score-txt">${betScoreTxt}</span>
          ${goOnHtml}
          <span class="bet-pts ${ptsC}">${ptsStr}</span>
        </div>
      </div>`;
    }).join('');

    return `<div class="match-card">
      <div class="match-top">
        <span class="match-num">Partido ${r.id}${dateStr ? ` · ${dateStr}` : ''}</span>
        <div class="match-top-right">
          ${countdown ? `<span class="match-countdown">${countdown}</span>` : ''}
          ${tipoLabel(r.tipo)}
          <span class="status ${r.status === 'finalizado' ? 'fin' : r.status === 'jugando' ? 'jug' : 'pen'}">${r.status === 'jugando' ? 'EN VIVO' : r.status}</span>
        </div>
      </div>
      <div class="score-row">
        <div class="team-name">${flag(r.local)}${r.local}</div>
        <div class="score-display">${scoreHtml}</div>
        <div class="team-name right">${r.visita}${flag(r.visita)}</div>
      </div>
      ${bets.length ? `<div class="bets-section">${betsHtml}</div>` : ''}
    </div>`;
  };

  const fases: Record<string, typeof state.RESULTS> = {};
  state.RESULTS.forEach(r => {
    const f = r.fase || 'Otros';
    if (!fases[f]) fases[f] = [];
    fases[f].push(r);
  });

  const phaseOrder = ['Grupos', 'Dieciseisavos de final', 'Octavos de final', 'Cuartos de final', 'Semifinales', 'Tercer Puesto', 'Final', 'Otros'];
  const sortedFases = Object.keys(fases).sort((a, b) => {
    let ia = phaseOrder.indexOf(a);
    let ib = phaseOrder.indexOf(b);
    if (ia === -1) ia = 99;
    if (ib === -1) ib = 99;
    return ia - ib;
  });

  const jugandoMatch = state.RESULTS.find(r => r.status === 'jugando');
  const nextPendiente = state.RESULTS
    .filter(r => (r.status === 'pendiente' || r.status === 'siguiente') && r.fecha)
    .sort((a, b) => new Date(a.fecha!).getTime() - new Date(b.fecha!).getTime())[0]
    ?? state.RESULTS.find(r => r.status === 'pendiente' || r.status === 'siguiente');
  const priorityMatch = jugandoMatch ?? nextPendiente ?? null;
  const priorityFase = priorityMatch?.fase ?? null;
  const priorityGroup = priorityMatch?.grupo ?? null;

  let html = '';
  sortedFases.forEach((faseName) => {
    const isOpen = faseName === priorityFase ? 'open' : '';
    const fMatches = fases[faseName] || [];
    const fFin = fMatches.filter(m => m.status === 'finalizado').length;
    const fLive = fMatches.filter(m => m.status === 'jugando').length;
    let fStatusStr = '';
    if (fMatches.length > 0) {
      if (fFin === 0 && fLive === 0) fStatusStr = 'no iniciado';
      else if (fFin === fMatches.length) fStatusStr = 'finalizado';
      else fStatusStr = 'en desarrollo';
    }
    const fStatusHtml = fStatusStr ? ` <span class="phase-status">${fStatusStr}</span>` : '';

    html += `<details class="fase-section" ${isOpen}><summary class="fase-title">${faseName}${fStatusHtml}</summary>`;

    if (faseName === 'Grupos') {
      const groups: Record<string, typeof state.RESULTS> = {};
      fases[faseName].forEach(r => {
        const g = r.grupo || '?';
        if (!groups[g]) groups[g] = [];
        groups[g].push(r);
      });

      Object.keys(groups).sort().forEach((gName) => {
        const isGroupOpen = gName === priorityGroup ? 'open' : '';
        const gMatches = groups[gName] || [];
        const gFin = gMatches.filter(m => m.status === 'finalizado').length;
        const gLive = gMatches.filter(m => m.status === 'jugando').length;
        let gStatusStr = '';
        if (gMatches.length > 0) {
          if (gFin === 0 && gLive === 0) gStatusStr = 'no iniciado';
          else if (gFin === gMatches.length) gStatusStr = 'finalizado';
          else gStatusStr = 'en desarrollo';
        }
        const gStatusHtml = gStatusStr ? ` <span class="phase-status">${gStatusStr}</span>` : '';

        html += `<details class="grupo-section" ${isGroupOpen}><summary class="grupo-title">Grupo ${gName}${gStatusHtml}</summary>`;
        html += `<div class="matches-grid">`;
        html += groups[gName].map(renderMatchCard).join('');
        html += `</div></details>`;
      });
    } else {
      html += `<div class="matches-grid">`;
      html += fases[faseName].map(renderMatchCard).join('');
      html += `</div>`;
    }
    html += `</details>`;
  });

  listEl.innerHTML = html;

  const totalMatchesEl = document.getElementById('total-matches');
  if (totalMatchesEl) {
    totalMatchesEl.textContent = `${state.RESULTS.length} partidos registrados`;
  }
}
