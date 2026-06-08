import type { Bet } from '../types';
import { state } from '../state';
import { calcMatchScore, getMultiplier } from '../scoring';
import { avatar } from '../avatar';

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

  const formatMatchDate = (fecha?: string): string => {
    if (!fecha) return '';
    const d = new Date(fecha);
    const fmt = new Intl.DateTimeFormat('es-CO', {
      weekday: 'short', day: 'numeric', month: 'short',
      hour: '2-digit', minute: '2-digit', hour12: false,
      timeZone: 'America/Bogota'
    });
    const parts = fmt.formatToParts(d);
    const get = (t: string) => parts.find(p => p.type === t)?.value ?? '';
    return `${get('weekday')} ${get('day')} ${get('month')} · ${get('hour')}:${get('minute')}`;
  };

  const formatCountdown = (fecha?: string, status?: string): string => {
    if (status === 'finalizado' || !fecha) return '';
    const diffMs = new Date(fecha).getTime() - Date.now();
    if (diffMs <= 0) return '';
    const days = Math.floor(diffMs / 86400000);
    if (days >= 1) return `${days} ${days === 1 ? 'día' : 'días'}`;
    const hours = Math.floor(diffMs / 3600000);
    const mins = Math.floor((diffMs % 3600000) / 60000);
    if (hours >= 1) return `${hours}h ${mins}m`;
    return `${Math.max(1, mins)} min`;
  };

  const tipoLabel = (tipo?: string) => {
    if (!tipo || tipo === 'N') return '';
    const label = state.SETTINGS.tiposPartido[tipo] || tipo;
    const cls = tipo === 'X' ? 'tipo-x' : 'tipo-e';
    return `<span class="match-tipo ${cls}">×${getMultiplier(tipo)} ${label}</span>`;
  };

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
      const showBet = r.status === 'finalizado';
      const betScoreTxt = showBet ? `${b.gL} – ${b.gV}` : `? – ?`;

      return `<div class="bet-row">
        <div class="bet-left">${avatar(b.player, 22, state.AVATARS[b.player])} ${b.player}</div>
        <div class="bet-right">
          <span class="bet-score-txt">${betScoreTxt}</span>
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
          <span class="status ${r.status === 'finalizado' ? 'fin' : 'pen'}">${r.status}</span>
        </div>
      </div>
      <div class="score-row">
        <div class="team-name">${r.local}</div>
        <div class="score-display">${scoreHtml}</div>
        <div class="team-name right">${r.visita}</div>
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

  let html = '';
  sortedFases.forEach((faseName, index) => {
    const isOpen = index === 0 ? 'open' : '';
    const fMatches = fases[faseName] || [];
    const fFin = fMatches.filter(m => m.status === 'finalizado').length;
    let fStatusStr = '';
    if (fMatches.length > 0) {
      if (fFin === 0) fStatusStr = 'no iniciado';
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

      Object.keys(groups).sort().forEach((gName, gIndex) => {
        const isGroupOpen = gIndex === 0 ? 'open' : '';
        const gMatches = groups[gName] || [];
        const gFin = gMatches.filter(m => m.status === 'finalizado').length;
        let gStatusStr = '';
        if (gMatches.length > 0) {
          if (gFin === 0) gStatusStr = 'no iniciado';
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
