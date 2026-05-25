import { state } from '../state';
import { calcularPuntosConvocatoria, calcMatchScore, getMultiplier, getStats, normalizePlayerName } from '../scoring';
import { avatar } from '../avatar';

// ─── Ranking ──────────────────────────────────────────────────────────────────

export function buildPlayerDetail(name: string): string {
  const bets = state.BETS[name] || [];
  const plus = state.PLUS_BETS[name];
  const p = state.SETTINGS.puntos;
  const convocatoria = plus?.convocatoriaColombia ?? [];
  const oficiales = state.COLOMBIA_FINAL?.jugadoresOficiales ?? [];
  const oficialesNormalizados = new Set(oficiales.map(normalizePlayerName).filter(Boolean));
  const puntosConvocatoria = calcularPuntosConvocatoria(plus, oficiales);
  const convocatoriaValida = convocatoria.length === 26;
  const convocatoriaEvaluada = convocatoriaValida && oficiales.length === 26;

  // ── Matches section ──
  const finishedWithBet = state.RESULTS.filter(r =>
    r.status === 'finalizado' && bets.find(b => b.matchId === r.id)
  );

  let matchesHtml: string;
  if (finishedWithBet.length === 0) {
    matchesHtml = `<div class="detail-empty">Sin partidos jugados aún.</div>`;
  } else {
    matchesHtml = `<div class="detail-match-list">${finishedWithBet.map(r => {
      const bet = bets.find(b => b.matchId === r.id)!;
      const raw = calcMatchScore(bet, r)!;
      const mult = getMultiplier(r.tipo);
      const finalPts = raw.pts * mult;
      const ptsCls = raw.type === 'score' ? 'bp5' : raw.type === 'result' ? 'bp3' : 'bp0';
      const multHtml = r.tipo && r.tipo !== 'N'
        ? `<span class="detail-match-mult ${r.tipo === 'X' ? 'tipo-x' : 'tipo-e'}">×${mult}</span>`
        : '';
      return `<div class="detail-match-item">
        ${multHtml}
        <span class="detail-match-teams">${r.local} <span class="detail-vs">vs</span> ${r.visita}</span>
        <div class="detail-match-info">
          <span class="detail-match-bet">${bet.gL}–${bet.gV}</span>
          <span class="detail-match-arrow">→</span>
          <span class="detail-match-real">${r.gL}–${r.gV}</span>
          <span class="bet-pts ${ptsCls}">+${finalPts}</span>
        </div>
      </div>`;
    }).join('')}</div>`;
  }

  // ── Plus section ──
  let plusHtml = '';
  if (plus) {
    const isOwnPlayer = name === state.CURRENT_PLAYER;
    const convocatoriaRows = convocatoria.map(jugador => {
      const isHit = convocatoriaEvaluada && oficialesNormalizados.has(normalizePlayerName(jugador));
      const isMiss = convocatoriaEvaluada && !isHit;
      const cls = isHit ? 'plus-hit' : isMiss ? 'plus-miss' : '';
      const pts = isHit ? '<span class="bet-pts bp5">+1</span>' : isMiss ? '<span class="bet-pts bp0">+0</span>' : '';
      return `<tr>
        <td class="${cls}">${jugador || '–'}${isHit ? ' <span class="hit-icon">✓</span>' : isMiss ? ' <span class="hit-icon">✗</span>' : ''}</td>
        <td>${convocatoriaEvaluada ? pts : ''}</td>
      </tr>`;
    }).join('');
    const convocatoriaHtml = convocatoriaEvaluada
      ? `<details class="detail-collapsible">
          <summary>Convocatoria Colombia: ${!convocatoriaValida ? 'lista inválida, deben ser 26 jugadores' : `${puntosConvocatoria}/26 aciertos · +${puntosConvocatoria} pts`}</summary>
          <table class="detail-plus-table detail-convocatoria-table">
            <thead><tr><th>Jugador apostado</th><th>Pts</th></tr></thead>
            <tbody>${convocatoriaRows}</tbody>
          </table>
        </details>`
      : (convocatoria.length
        ? `<div class="detail-empty">Convocatoria registrada — visible al publicarse la lista oficial.</div>`
        : '');

    const top4Rows = [
      { label: `Campeón (${p.firstPlus}pts)`, pred: plus.top4.campeon, real: state.PLUS_RESULTS?.top4.campeon, pts: p.firstPlus },
      { label: `Sub-Campeón (${p.secondPlus}pts)`, pred: plus.top4.subcampeon, real: state.PLUS_RESULTS?.top4.subcampeon, pts: p.secondPlus },
      { label: `3er Puesto (${p.thirdPlus}pts)`, pred: plus.top4.tercero, real: state.PLUS_RESULTS?.top4.tercero, pts: p.thirdPlus },
      { label: `4to Puesto (${p.fourthPlus}pts)`, pred: plus.top4.cuarto, real: state.PLUS_RESULTS?.top4.cuarto, pts: p.fourthPlus },
    ].map(row => {
      const pred = (isOwnPlayer || !!row.real) ? (row.pred || '–') : (row.pred ? '?' : '–');
      const realStr = row.real || '?';
      const isHit = row.real && row.pred === row.real;
      const isMiss = row.real && !isHit;
      const cls = isHit ? 'plus-hit' : isMiss ? 'plus-miss' : '';
      const pts = isHit ? `<span class="bet-pts bp5">+${row.pts}</span>` : isMiss ? `<span class="bet-pts bp0">+0</span>` : '';
      return `<tr>
        <td>${row.label}</td>
        <td class="${cls}">${pred}${isHit ? ' <span class="hit-icon">✓</span>' : isMiss ? ' <span class="hit-icon">✗</span>' : ''}</td>
        <td>${realStr}</td>
        <td>${pts}</td>
      </tr>`;
    }).join('');

    const groupRows = ['A','B','C','D','E','F','G','H','I','J','K','L'].flatMap(grp => {
      const pred = plus.posicionesGrupos[grp];
      const realPos = state.PLUS_RESULTS?.posicionesGrupos[grp];
      if (!pred || pred.every(t => !t)) return [];
      return [0,1,2,3].map(i => {
        const rawTeam = pred[i] || '–';
        const team = (isOwnPlayer || !!realPos?.[i]) ? rawTeam : (pred[i] ? '?' : '–');
        const realTeam = realPos?.[i] || '?';
        const isHit = realPos?.[i] && pred[i] === realPos[i];
        const isMiss = realPos?.[i] && !isHit;
        const cls = isHit ? 'plus-hit' : isMiss ? 'plus-miss' : '';
        const pts = isHit ? `<span class="bet-pts bp5">+${p.groupPlus}</span>` : isMiss ? `<span class="bet-pts bp0">+0</span>` : '';
        return `<tr>
          <td>Grupo ${grp} — ${i + 1}º (${p.groupPlus}pts)</td>
          <td class="${cls}">${team}${isHit ? ' <span class="hit-icon">✓</span>' : isMiss ? ' <span class="hit-icon">✗</span>' : ''}</td>
          <td>${realTeam}</td>
          <td>${pts}</td>
        </tr>`;
      });
    }).join('');

    const goOnRows = (plus.goOn || []).map(bet => {
      const match = state.RESULTS.find(r => r.id === bet.matchId);
      const matchLabel = match ? `P${bet.matchId} ${match.local} vs ${match.visita}` : `P${bet.matchId}`;
      const real = state.PLUS_RESULTS?.goOn?.find(r => r.matchId === bet.matchId);
      const isHit = real?.equipo && bet.equipo === real.equipo;
      const isMiss = real?.equipo && !isHit;
      const cls = isHit ? 'plus-hit' : isMiss ? 'plus-miss' : '';
      const pts = isHit ? `<span class="bet-pts bp5">+${p.goOnPlus}</span>` : isMiss ? `<span class="bet-pts bp0">+0</span>` : '';
      const displayEquipo = (isOwnPlayer || !!real?.equipo) ? (bet.equipo || '–') : (bet.equipo ? '?' : '–');
      return `<tr>
        <td>${matchLabel} — avanza (${p.goOnPlus}pts)</td>
        <td class="${cls}">${displayEquipo}${isHit ? ' <span class="hit-icon">✓</span>' : isMiss ? ' <span class="hit-icon">✗</span>' : ''}</td>
        <td>${real?.equipo || '?'}</td>
        <td>${pts}</td>
      </tr>`;
    }).join('');

    const allPlusRows = top4Rows + groupRows + goOnRows;
    if (convocatoriaHtml || allPlusRows) {
      plusHtml = `${convocatoriaHtml}${allPlusRows ? `<table class="detail-plus-table">
        <thead><tr><th>Predicción</th><th>Tu apuesta</th><th>Real</th><th>Pts</th></tr></thead>
        <tbody>${allPlusRows}</tbody>
      </table>` : ''}`;
    }
  }

  return `<div class="player-detail">
    <div class="detail-section">
      <h4>Partidos finalizados</h4>
      ${matchesHtml}
    </div>
    ${plusHtml ? `<div class="detail-section"><h4>Plus</h4>${plusHtml}</div>` : ''}
  </div>`;
}

export function buildRanking() {
  const stats = state.PLAYERS.map(getStats).sort((a, b) =>
    b.pts - a.pts || b.ptsPlus - a.ptsPlus
  );
  const posClass = (i: number) => i === 0 ? 'g' : i === 1 ? 's' : i === 2 ? 'b' : '';

  const bodyEl = document.getElementById('ranking-body');
  if (bodyEl) {
    bodyEl.innerHTML = stats.map((p, i) => `
      <tr class="r-player-row" data-player="${p.name}">
        <td><span class="pos-num ${posClass(i)}">${i + 1}</span></td>
        <td>
          <div class="player-cell">
            ${avatar(p.name, 32, state.AVATARS[p.name])}
            <div class="player-info">
              <div class="player-name">${p.name}</div>
              <div class="streak">${p.streak.slice(-5).map(s => `<div class="sc sc-${s}"></div>`).join('')}</div>
            </div>
          </div>
        </td>
        <td class="r"><span class="pts-big">${p.pts}</span></td>
        <td class="r"><span class="badge be" title="Pts partidos">${p.ptsMatch}</span></td>
        <td class="r"><span class="badge bt" title="Pts plus">${p.ptsPlus > 0 ? '+' + p.ptsPlus : p.ptsPlus}</span></td>
        <td class="r"><span class="badge bx">${p.miss}</span> <span class="row-chevron">▾</span></td>
      </tr>
      <tr class="detail-row" data-for="${p.name}">
        <td colspan="6" class="detail-cell"></td>
      </tr>
    `).join('');

    bodyEl.addEventListener('click', (e: MouseEvent) => {
      const row = (e.target as HTMLElement).closest('.r-player-row') as HTMLElement | null;
      if (!row) return;
      const playerName = row.dataset.player;
      if (!playerName) return;
      const detailRow = bodyEl.querySelector(`.detail-row[data-for="${playerName}"]`) as HTMLElement | null;
      if (!detailRow) return;
      const isOpen = detailRow.classList.toggle('open');
      row.classList.toggle('detail-open', isOpen);
      if (isOpen) {
        const cell = detailRow.querySelector('.detail-cell') as HTMLElement | null;
        if (cell && !cell.innerHTML.trim()) {
          cell.innerHTML = buildPlayerDetail(playerName);
        }
      }
    });
  }
}
