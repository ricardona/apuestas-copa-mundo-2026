import './style.css';

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface Result {
  id: number;
  local: string;
  visita: string;
  gL: number;
  gV: number;
  status: 'finalizado' | 'pendiente';
  fase?: string;
  grupo?: string;
  tipo?: 'N' | 'E' | 'X';
}

interface Bet {
  matchId: number;
  gL: number;
  gV: number;
  goOn?: string; // team predicted to advance (knockout rounds)
}

interface PlusBet {
  posicionesGrupos: Record<string, string[]>; // group → [1st, 2nd, 3rd, 4th]
  top4: {
    campeon: string;
    subcampeon: string;
    tercero: string;
    cuarto: string;
  };
  goOn: Array<{ matchId: number; equipo: string }>;
}

interface Settings {
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
}

interface PlusResults {
  posicionesGrupos: Record<string, string[]>; // group → [1st, 2nd, 3rd, 4th]
  top4: {
    campeon: string;
    subcampeon: string;
    tercero: string;
    cuarto: string;
  };
  goOn: Array<{ matchId: number; equipo: string }>;
}

interface PlayerStats {
  name: string;
  pts: number;
  ptsMatch: number;
  ptsPlus: number;
  tend: number;
  miss: number;
  streak: string[];
}

// ─── State ────────────────────────────────────────────────────────────────────

let RESULTS: Result[] = [];
let PLAYERS: string[] = [];
let BETS: Record<string, Bet[]> = {};
let PLUS_BETS: Record<string, PlusBet> = {};
let PLUS_RESULTS: PlusResults | null = null;
let SETTINGS: Settings = {
  puntos: { score: 3, result: 1, groupPlus: 2, firstPlus: 8, secondPlus: 5, thirdPlus: 4, fourthPlus: 3, goOnPlus: 2 },
  multiplicadores: { N: 1, E: 2, X: 3 },
  tiposPartido: { N: 'Normal', E: 'Especial', X: 'Super Especial' }
};

const AV: Record<string, string> = {
  santiago: 'av-s',
  mauro: 'av-m',
  juan: 'av-j',
  andrea: 'av-a',
  lucas: 'av-l'
};

// ─── Scoring ──────────────────────────────────────────────────────────────────

function getMultiplier(tipo?: string): number {
  return SETTINGS.multiplicadores[tipo || 'N'] ?? 1;
}

/** Returns raw points (before multiplier) for a match bet, or null if not finished */
function calcMatchScore(bet: Bet, result: Result): { pts: number; type: 'score' | 'result' | 'miss' } | null {
  if (result.status !== 'finalizado') return null;
  if (bet.gL === result.gL && bet.gV === result.gV) {
    return { pts: SETTINGS.puntos.score, type: 'score' };
  }
  const rT = result.gL > result.gV ? 1 : result.gL < result.gV ? -1 : 0;
  const bT = bet.gL > bet.gV ? 1 : bet.gL < bet.gV ? -1 : 0;
  if (rT === bT) return { pts: SETTINGS.puntos.result, type: 'result' };
  return { pts: 0, type: 'miss' };
}


/** Points earned from Plus predictions */
function calcPlusScore(name: string): number {
  const plus = PLUS_BETS[name];
  if (!plus || !PLUS_RESULTS) return 0;
  const p = SETTINGS.puntos;
  let total = 0;

  // top4
  if (PLUS_RESULTS.top4.campeon && plus.top4.campeon === PLUS_RESULTS.top4.campeon) total += p.firstPlus;
  if (PLUS_RESULTS.top4.subcampeon && plus.top4.subcampeon === PLUS_RESULTS.top4.subcampeon) total += p.secondPlus;
  if (PLUS_RESULTS.top4.tercero && plus.top4.tercero === PLUS_RESULTS.top4.tercero) total += p.thirdPlus;
  if (PLUS_RESULTS.top4.cuarto && plus.top4.cuarto === PLUS_RESULTS.top4.cuarto) total += p.fourthPlus;

  // group positions
  Object.entries(PLUS_RESULTS.posicionesGrupos).forEach(([grp, real]) => {
    const pred = plus.posicionesGrupos[grp];
    if (!pred) return;
    real.forEach((team, idx) => {
      if (team && pred[idx] === team) total += p.groupPlus;
    });
  });

  // goOn (team advancing from knockout round)
  if (plus.goOn) {
    plus.goOn.forEach(bet => {
      const real = PLUS_RESULTS!.goOn?.find(r => r.matchId === bet.matchId);
      if (real && real.equipo && real.equipo === bet.equipo) total += p.goOnPlus;
    });
  }

  return total;
}

function getStats(name: string): PlayerStats {
  let ptsMatch = 0, tend = 0, miss = 0;
  const streak: string[] = [];

  RESULTS.forEach(r => {
    const b = BETS[name]?.find(x => x.matchId === r.id);
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
  return { name, pts: ptsMatch + ptsPlus, ptsMatch, ptsPlus, tend, miss, streak };
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function initials(n: string) { return n.slice(0, 2).toUpperCase(); }

function avatar(name: string, size = 32) {
  const cls = AV[name] || 'av-s';
  const fontSize = Math.round(size * 0.34);
  return `<div class="avatar ${cls}" style="width:${size}px;height:${size}px;font-size:${fontSize}px">${initials(name)}</div>`;
}

// ─── Metrics ──────────────────────────────────────────────────────────────────

function buildMetrics() {
  const stats = PLAYERS.map(getStats).sort((a, b) => b.pts - a.pts);
  const fin = RESULTS.filter(r => r.status === 'finalizado').length;
  const pen = RESULTS.filter(r => r.status === 'pendiente').length;

  const metricsEl = document.getElementById('metrics-row');
  if (metricsEl) {
    const liderInfo = stats.length > 0 ? `${stats[0].name} · ${stats[0].pts} pts` : 'N/A';
    metricsEl.innerHTML = `
      <div class="metric"><div class="metric-label">Partidos jugados</div><div class="metric-value">${fin}</div></div>
      <div class="metric"><div class="metric-label">Pendientes</div><div class="metric-value">${pen}</div></div>
      <div class="metric"><div class="metric-label">Líder</div><div class="metric-value sm">${liderInfo}</div></div>
    `;
  }
}

// ─── Ranking ──────────────────────────────────────────────────────────────────

function buildRanking() {
  const stats = PLAYERS.map(getStats).sort((a, b) => b.pts - a.pts || b.ptsPlus - a.ptsPlus);
  const posClass = (i: number) => i === 0 ? 'g' : i === 1 ? 's' : i === 2 ? 'b' : '';

  const bodyEl = document.getElementById('ranking-body');
  if (bodyEl) {
    bodyEl.innerHTML = stats.map((p, i) => `
      <tr>
        <td><span class="pos-num ${posClass(i)}">${i + 1}</span></td>
        <td>
          <div class="player-cell">
            ${avatar(p.name)}
            <div class="player-info">
              <div class="player-name">${p.name}</div>
              <div class="streak">${p.streak.slice(-5).map(s => `<div class="sc sc-${s}"></div>`).join('')}</div>
            </div>
          </div>
        </td>
        <td class="r"><span class="pts-big">${p.pts}</span></td>
        <td class="r"><span class="badge be" title="Pts partidos">${p.ptsMatch}</span></td>
        <td class="r"><span class="badge bt" title="Pts plus">${p.ptsPlus > 0 ? '+' + p.ptsPlus : p.ptsPlus}</span></td>
        <td class="r"><span class="badge bx">${p.miss}</span></td>
      </tr>
    `).join('');
  }
}

// ─── Matches ──────────────────────────────────────────────────────────────────

function buildMatches() {
  const byMatch: Record<number, (Bet & { player: string })[]> = {};

  PLAYERS.forEach(name => {
    if (!BETS[name]) return;
    BETS[name].forEach(b => {
      if (!byMatch[b.matchId]) byMatch[b.matchId] = [];
      byMatch[b.matchId].push({ ...b, player: name });
    });
  });

  const listEl = document.getElementById('matches-list');
  if (!listEl) return;

  const tipoLabel = (tipo?: string) => {
    if (!tipo || tipo === 'N') return '';
    const label = SETTINGS.tiposPartido[tipo] || tipo;
    const cls = tipo === 'X' ? 'tipo-x' : 'tipo-e';
    return `<span class="match-tipo ${cls}">×${getMultiplier(tipo)} ${label}</span>`;
  };

  const renderMatchCard = (r: Result) => {
    const bets = byMatch[r.id] || [];
    const scoreHtml = r.status === 'finalizado'
      ? `<span class="score-digit">${r.gL}</span><span class="score-sep">–</span><span class="score-digit">${r.gV}</span>`
      : `<span class="score-digit" style="color:#444">?</span><span class="score-sep">–</span><span class="score-digit" style="color:#444">?</span>`;

    const betsHtml = bets.map(b => {
      const raw = calcMatchScore(b, r);
      const mult = getMultiplier(r.tipo);
      const finalPts = raw !== null ? raw.pts * mult : null;
      const ptsStr = finalPts === null ? '–' : `+${finalPts}`;
      const ptsC = raw === null ? 'bp0' : raw.type === 'score' ? 'bp5' : raw.type === 'result' ? 'bp3' : 'bp0';
      return `<div class="bet-row">
        <div class="bet-left">${avatar(b.player, 22)} ${b.player}</div>
        <div class="bet-right">
          <span class="bet-score-txt">${b.gL} – ${b.gV}</span>
          <span class="bet-pts ${ptsC}">${ptsStr}</span>
        </div>
      </div>`;
    }).join('');

    return `<div class="match-card">
      <div class="match-top">
        <span class="match-num">Partido ${r.id}</span>
        ${tipoLabel(r.tipo)}
        <span class="status ${r.status === 'finalizado' ? 'fin' : 'pen'}">${r.status}</span>
      </div>
      <div class="score-row">
        <div class="team-name">${r.local}</div>
        <div class="score-display">${scoreHtml}</div>
        <div class="team-name right">${r.visita}</div>
      </div>
      ${bets.length ? `<div class="bets-section">${betsHtml}</div>` : ''}
    </div>`;
  };

  const fases: Record<string, Result[]> = {};
  RESULTS.forEach(r => {
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
      const groups: Record<string, Result[]> = {};
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
    totalMatchesEl.textContent = `${RESULTS.length} partidos registrados`;
  }
}

// ─── Plus Tab ─────────────────────────────────────────────────────────────────

function buildPlus() {
  const container = document.getElementById('plus-content');
  if (!container) return;

  const p = SETTINGS.puntos;

  // ── Top 4 section ──
  const top4Html = PLAYERS.map(name => {
    const plus = PLUS_BETS[name];
    if (!plus) return '';
    const real = PLUS_RESULTS?.top4;
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
    const realPos = PLUS_RESULTS?.posicionesGrupos[grp];
    const rows = PLAYERS.map(name => {
      const plus = PLUS_BETS[name];
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
            ${PLUS_RESULTS?.top4.campeon ? `<tr class="plus-real-row">
              <td><strong>Real</strong></td>
              <td>${PLUS_RESULTS.top4.campeon || '?'}</td>
              <td>${PLUS_RESULTS.top4.subcampeon || '?'}</td>
              <td>${PLUS_RESULTS.top4.tercero || '?'}</td>
              <td>${PLUS_RESULTS.top4.cuarto || '?'}</td>
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
  const goOnMatches = PLUS_RESULTS?.goOn ?? [];
  if (goOnMatches.length > 0) {
    const goOnHtml = goOnMatches.map(real => {
      const match = RESULTS.find(r => r.id === real.matchId);
      const matchLabel = match ? `Partido ${match.id} — ${match.local} vs ${match.visita}` : `Partido ${real.matchId}`;
      const rows = PLAYERS.map(name => {
        const plus = PLUS_BETS[name];
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

// ─── Tabs ─────────────────────────────────────────────────────────────────────

function initTabs() {
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = (e.currentTarget as HTMLElement).dataset.target;
      if (!target) return;

      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));

      const tabEl = document.getElementById('tab-' + target);
      if (tabEl) tabEl.classList.add('active');
      (e.currentTarget as HTMLElement).classList.add('active');
    });
  });
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

async function startApp() {
  const updatedEl = document.getElementById('last-updated');
  if (updatedEl) updatedEl.textContent = 'Cargando datos...';

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const dataFolder = urlParams.get('data') || (urlParams.has('test') ? 'test_data' : 'data');
    const basePath = `./${dataFolder}`;

    const [playersRes, resultsRes, settingsRes] = await Promise.all([
      fetch(`${basePath}/players.json`),
      fetch(`${basePath}/results.json`),
      fetch(`${basePath}/settings.json`)
    ]);

    const playersData = await playersRes.json();
    PLAYERS = playersData.participantes;
    RESULTS = await resultsRes.json();
    if (settingsRes.ok) SETTINGS = await settingsRes.json();

    // Load bets + plus bets in parallel
    await Promise.all(PLAYERS.map(async name => {
      try {
        const res = await fetch(`${basePath}/bets/${name}.json`);
        if (!res.ok) throw new Error();
        BETS[name] = await res.json();
      } catch {
        console.warn(`No se pudo cargar apuesta de ${name}`);
        BETS[name] = [];
      }

      try {
        const res = await fetch(`${basePath}/bets/${name}.plus.json`);
        if (res.ok) PLUS_BETS[name] = await res.json();
      } catch {
        console.warn(`No se pudo cargar plus de ${name}`);
      }
    }));

    // Load plus results (stored in results.json as separate key, or a dedicated file)
    try {
      const prRes = await fetch(`${basePath}/plus_results.json`);
      if (prRes.ok) PLUS_RESULTS = await prRes.json();
    } catch { /* optional file */ }

    buildMetrics();
    buildRanking();
    buildMatches();
    buildPlus();
    initTabs();

    if (updatedEl) {
      updatedEl.textContent = 'Actualizado: ' + new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
    }
  } catch (error) {
    console.error('Error al iniciar la aplicación:', error);
    if (updatedEl) updatedEl.textContent = 'Error al cargar';
  }
}

document.addEventListener('DOMContentLoaded', startApp);
