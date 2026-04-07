import { state } from '../state';
import { avatar } from '../avatar';

// ─── Plus Tab ─────────────────────────────────────────────────────────────────

export function buildPlus() {
  const container = document.getElementById('plus-content');
  if (!container) return;

  const p = state.SETTINGS.puntos;

  // ── Top 4 section ──
  const top4Html = state.PLAYERS.map(name => {
    const plus = state.PLUS_BETS[name];
    if (!plus) return '';
    const real = state.PLUS_RESULTS?.top4;
    const hit = (pred: string, real?: string) => real && pred === real ? '✓' : (real ? '✗' : '');
    const cls = (pred: string, real?: string) => real && pred === real ? 'plus-hit' : (real ? 'plus-miss' : '');
    return `
      <tr>
        <td><div class="player-cell">${avatar(name, 24)} ${name}</div></td>
        <td class="${cls(plus.top4.campeon, real?.campeon)}">${plus.top4.campeon || '–'} <span class="hit-icon">${hit(plus.top4.campeon, real?.campeon)}</span></td>
        <td class="${cls(plus.top4.subcampeon, real?.subcampeon)}">${plus.top4.subcampeon || '–'} <span class="hit-icon">${hit(plus.top4.subcampeon, real?.subcampeon)}</span></td>
        <td class="${cls(plus.top4.tercero, real?.tercero)}">${plus.top4.tercero || '–'} <span class="hit-icon">${hit(plus.top4.tercero, real?.tercero)}</span></td>
        <td class="${cls(plus.top4.cuarto, real?.cuarto)}">${plus.top4.cuarto || '–'} <span class="hit-icon">${hit(plus.top4.cuarto, real?.cuarto)}</span></td>
      </tr>`;
  }).join('');

  // ── Groups section ──
  const groups = ['A','B','C','D','E','F','G','H','I','J','K','L'];
  const groupsHtml = groups.map(grp => {
    const realPos = state.PLUS_RESULTS?.posicionesGrupos[grp];
    const rows = state.PLAYERS.map(name => {
      const plus = state.PLUS_BETS[name];
      if (!plus) return '';
      const pred = plus.posicionesGrupos[grp] || ['','','',''];
      return `
        <tr>
          <td><div class="player-cell">${avatar(name, 20)} ${name}</div></td>
          ${[0,1,2,3].map(i => {
            const team = pred[i] || '–';
            const isHit = realPos && realPos[i] && realPos[i] === pred[i];
            const isMiss = realPos && realPos[i] && !isHit;
            return `<td class="${isHit ? 'plus-hit' : isMiss ? 'plus-miss' : ''}">${team} ${isHit ? '<span class="hit-icon">✓</span>' : ''}</td>`;
          }).join('')}
        </tr>`;
    }).join('');

    const realRow = realPos ? `<tr class="plus-real-row">
      <td><strong>Real</strong></td>
      ${realPos.map(t => `<td>${t || '?'}</td>`).join('')}
    </tr>` : '';

    return `<details class="grupo-section">
      <summary class="grupo-title">Grupo ${grp}</summary>
      <div class="plus-table-wrap">
        <table class="plus-table">
          <thead><tr><th>Jugador</th><th>1º (${p.groupPlus}pts)</th><th>2º (${p.groupPlus}pts)</th><th>3º (${p.groupPlus}pts)</th><th>4º (${p.groupPlus}pts)</th></tr></thead>
          <tbody>${realRow}${rows}</tbody>
        </table>
      </div>
    </details>`;
  }).join('');

  container.innerHTML = `
    <div class="plus-section">
      <h3 class="plus-title">🏆 Cuadro de Honor</h3>
      <div class="plus-table-wrap">
        <table class="plus-table">
          <thead>
            <tr>
              <th>Jugador</th>
              <th>Campeón (${p.firstPlus}pts)</th>
              <th>Sub-Campeón (${p.secondPlus}pts)</th>
              <th>3er Puesto (${p.thirdPlus}pts)</th>
              <th>4to Puesto (${p.fourthPlus}pts)</th>
            </tr>
          </thead>
          <tbody>
            ${state.PLUS_RESULTS?.top4.campeon ? `<tr class="plus-real-row">
              <td><strong>Real</strong></td>
              <td>${state.PLUS_RESULTS.top4.campeon || '?'}</td>
              <td>${state.PLUS_RESULTS.top4.subcampeon || '?'}</td>
              <td>${state.PLUS_RESULTS.top4.tercero || '?'}</td>
              <td>${state.PLUS_RESULTS.top4.cuarto || '?'}</td>
            </tr>` : ''}
            ${top4Html}
          </tbody>
        </table>
      </div>
    </div>

    <div class="plus-section">
      <h3 class="plus-title">📊 Posiciones de Grupos</h3>
      ${groupsHtml}
    </div>
  `;

  // ── GoOn section — only render if there are goOn entries ──
  const goOnMatches = state.PLUS_RESULTS?.goOn ?? [];
  if (goOnMatches.length > 0) {
    const goOnHtml = goOnMatches.map(real => {
      const match = state.RESULTS.find(r => r.id === real.matchId);
      const matchLabel = match ? `Partido ${match.id} — ${match.local} vs ${match.visita}` : `Partido ${real.matchId}`;
      const rows = state.PLAYERS.map(name => {
        const plus = state.PLUS_BETS[name];
        const pred = plus?.goOn?.find(g => g.matchId === real.matchId);
        const team = pred?.equipo || '–';
        const isHit = real.equipo && team === real.equipo;
        const isMiss = real.equipo && !isHit && team !== '–';
        return `<tr>
          <td><div class="player-cell">${avatar(name, 20)} ${name}</div></td>
          <td class="${isHit ? 'plus-hit' : isMiss ? 'plus-miss' : ''}">${team} ${isHit ? '<span class="hit-icon">✓</span>' : isMiss ? '<span class="hit-icon">✗</span>' : ''}</td>
        </tr>`;
      }).join('');

      return `<div class="goOn-match">
        <div class="goOn-label">${matchLabel}</div>
        <div class="plus-table-wrap">
          <table class="plus-table">
            <thead><tr><th>Jugador</th><th>Equipo apostado (${p.goOnPlus}pts) — Real: <strong>${real.equipo || '?'}</strong></th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>`;
    }).join('');

    container.innerHTML += `
      <div class="plus-section">
        <h3 class="plus-title">🚀 Equipo que avanza</h3>
        ${goOnHtml}
      </div>
    `;
  }
}
