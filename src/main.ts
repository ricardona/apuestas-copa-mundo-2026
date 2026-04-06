import './style.css';

interface Result {
  id: number;
  local: string;
  visita: string;
  gL: number;
  gV: number;
  status: 'finalizado' | 'pendiente';
  fase?: string;
  grupo?: string;
}

interface Bet {
  matchId: number;
  gL: number;
  gV: number;
}

interface PlayerStats {
  name: string;
  pts: number;
  exact: number;
  tend: number;
  miss: number;
  streak: string[];
}

let RESULTS: Result[] = [];
let PLAYERS: string[] = [];
let BETS: Record<string, Bet[]> = {};

const AV: Record<string, string> = { 
  santiago: 'av-s', 
  mauro: 'av-m', 
  juan: 'av-j', 
  andrea: 'av-a', 
  lucas: 'av-l' 
};

function calcScore(bet: Bet, result: Result): number | null {
  if (result.status !== 'finalizado') return null;
  if (bet.gL === result.gL && bet.gV === result.gV) return 5;
  const rT = result.gL > result.gV ? 1 : result.gL < result.gV ? -1 : 0;
  const bT = bet.gL > bet.gV ? 1 : bet.gL < bet.gV ? -1 : 0;
  return rT === bT ? 3 : 0;
}

function getStats(name: string): PlayerStats {
  let pts = 0, exact = 0, tend = 0, miss = 0;
  const streak: string[] = [];
  
  RESULTS.forEach(r => {
    const b = BETS[name]?.find(x => x.matchId === r.id);
    if (!b) return;
    const s = calcScore(b, r);
    if (s === null) return;
    
    pts += s;
    if (s === 5) { exact++; streak.push('E'); }
    else if (s === 3) { tend++; streak.push('T'); }
    else { miss++; streak.push('X'); }
  });
  return { name, pts, exact, tend, miss, streak };
}

function initials(n: string) { 
  return n.slice(0,2).toUpperCase(); 
}

function avatar(name: string, size = 32) {
  const cls = AV[name] || 'av-s';
  const fontSize = Math.round(size * 0.34);
  return `<div class="avatar ${cls}" style="width:${size}px;height:${size}px;font-size:${fontSize}px">${initials(name)}</div>`;
}

// Metrics
function buildMetrics() {
  const stats = PLAYERS.map(getStats).sort((a, b) => b.pts - a.pts);
  const fin = RESULTS.filter(r => r.status === 'finalizado').length;
  const pen = RESULTS.filter(r => r.status === 'pendiente').length;
  const totalExact = stats.reduce((s, p) => s + p.exact, 0);
  
  const metricsEl = document.getElementById('metrics-row');
  if (metricsEl) {
    let liderInfo = 'N/A';
    if (stats.length > 0) {
      liderInfo = `${stats[0].name} · ${stats[0].pts} pts`;
    }
    metricsEl.innerHTML = `
      <div class="metric"><div class="metric-label">Partidos jugados</div><div class="metric-value">${fin}</div></div>
      <div class="metric"><div class="metric-label">Pendientes</div><div class="metric-value">${pen}</div></div>
      <div class="metric"><div class="metric-label">Líder</div><div class="metric-value sm">${liderInfo}</div></div>
      <div class="metric"><div class="metric-label">Total exactos</div><div class="metric-value">${totalExact}</div></div>
    `;
  }
}

// Ranking
function buildRanking() {
  const stats = PLAYERS.map(getStats).sort((a, b) => b.pts - a.pts || b.exact - a.exact);
  const posClass = (i: number) => i === 0 ? 'g' : i === 1 ? 's' : i === 2 ? 'b' : '';
  
  const bodyEl = document.getElementById('ranking-body');
  if (bodyEl) {
    bodyEl.innerHTML = stats.map((p, i) => `
      <tr>
        <td><span class="pos-num ${posClass(i)}">${i+1}</span></td>
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
        <td class="r"><span class="badge be">${p.exact}</span></td>
        <td class="r"><span class="badge bt">${p.tend}</span></td>
        <td class="r"><span class="badge bx">${p.miss}</span></td>
      </tr>
    `).join('');
  }
}

// Matches
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
  if (listEl) {
    const renderMatchCard = (r: Result) => {
      const bets = byMatch[r.id] || [];
      const scoreHtml = r.status === 'finalizado'
        ? `<span class="score-digit">${r.gL}</span><span class="score-sep">–</span><span class="score-digit">${r.gV}</span>`
        : `<span class="score-digit" style="color:#444">?</span><span class="score-sep">–</span><span class="score-digit" style="color:#444">?</span>`;

      const betsHtml = bets.map(b => {
        const s = calcScore(b, r);
        const ptsStr = s === null ? '–' : `+${s}`;
        const ptsC = s === 5 ? 'bp5' : s === 3 ? 'bp3' : 'bp0';
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
    const sortedFases = Object.keys(fases).sort((a,b) => {
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
  }
  
  const totalMatchesEl = document.getElementById('total-matches');
  if (totalMatchesEl) {
    totalMatchesEl.textContent = `${RESULTS.length} partidos registrados`;
  }
}

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

async function startApp() {
  const updatedEl = document.getElementById('last-updated');
  if (updatedEl) {
    updatedEl.textContent = 'Cargando datos...';
  }

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const dataFolder = urlParams.get('data') || (urlParams.has('test') ? 'test_data' : 'data');
    const basePath = `./${dataFolder}`;

    const [playersRes, resultsRes] = await Promise.all([
      fetch(`${basePath}/players.json`),
      fetch(`${basePath}/results.json`)
    ]);
    
    const playersData = await playersRes.json();
    PLAYERS = playersData.participantes;
    RESULTS = await resultsRes.json();
    
    const betPromises = PLAYERS.map(async (name) => {
      try {
        const res = await fetch(`${basePath}/bets/${name}.json`);
        if (!res.ok) throw new Error(`Failed to fetch ${name}.json`);
        BETS[name] = await res.json();
      } catch (e) {
        console.error(`No se pudo cargar la apuesta de ${name}`, e);
        BETS[name] = [];
      }
    });
    
    await Promise.all(betPromises);
    
    buildMetrics();
    buildRanking();
    buildMatches();
    initTabs();

    if (updatedEl) {
      updatedEl.textContent = 'Actualizado: ' + new Date().toLocaleTimeString('es-CO', {hour:'2-digit',minute:'2-digit'});
    }
  } catch (error) {
    console.error("Error al iniciar la aplicación:", error);
    if (updatedEl) {
      updatedEl.textContent = 'Error al cargar';
    }
  }
}

document.addEventListener('DOMContentLoaded', startApp);
