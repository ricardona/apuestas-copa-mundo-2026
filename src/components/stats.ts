import Chart from 'chart.js/auto';
import { state } from '../state';
import { calcMatchScore, getMultiplier } from '../scoring';

// ─── Stats and Trends ────────────────────────────────────────────────────────

export function buildStats() {
  const chartCanvas = document.getElementById('pointsChart') as HTMLCanvasElement;
  const statsGrid = document.getElementById('stats-grid');
  if (!chartCanvas || !statsGrid) return;

  const matches = state.RESULTS.filter(r => r.status === 'finalizado').sort((a,b) => a.id - b.id);
  if (matches.length === 0) {
    statsGrid.innerHTML = '<div style="color:#888;">No hay suficientes datos aún.</div>';
    return;
  }

  const maxId = matches[matches.length - 1].id;
  const labels = matches.map(m => `P${m.id}`);

  // Determine the ID of the last finalized group match so we know when to add group points
  const finalizedGroupMatches = matches.filter(m => m.fase === 'Grupos');
  const lastFinalizedGroupMatchId = finalizedGroupMatches.length > 0 ? finalizedGroupMatches[finalizedGroupMatches.length - 1].id : -1;

  // Pre-calculate Oveja Negra (players who were the ONLY ones to score in a match)
  const matchScorers = matches.map(m => {
    let scorers = 0;
    let scorerName = '';
    state.PLAYERS.forEach(p => {
      const b = state.BETS[p]?.find(x => x.matchId === m.id);
      if (b) {
        const raw = calcMatchScore(b, m);
        if (raw && raw.pts > 0) { scorers++; scorerName = p; }
      }
    });
    return { matchId: m.id, scorers, scorerName };
  });

  const pStats = state.PLAYERS.map(player => {
    let cumulativeMatch = 0;
    let cumulativeGoOn = 0;
    let cumulativeGroup = 0;
    let cumulativeTop4 = 0;
    
    const plusBet = state.PLUS_BETS[player];
    const pSettings = state.SETTINGS.puntos;

    let groupPoints = 0;
    if (plusBet && plusBet.posicionesGrupos && state.PLUS_RESULTS && state.PLUS_RESULTS.posicionesGrupos) {
      Object.entries(state.PLUS_RESULTS.posicionesGrupos).forEach(([grp, real]) => {
        const pred = plusBet.posicionesGrupos[grp];
        if (!pred) return;
        real.forEach((team, idx) => {
          if (team && pred[idx] === team) groupPoints += pSettings.groupPlus;
        });
      });
    }

    let top4Points = 0;
    if (plusBet && plusBet.top4 && state.PLUS_RESULTS && state.PLUS_RESULTS.top4) {
      if (state.PLUS_RESULTS.top4.campeon && plusBet.top4.campeon === state.PLUS_RESULTS.top4.campeon) top4Points += pSettings.firstPlus;
      if (state.PLUS_RESULTS.top4.subcampeon && plusBet.top4.subcampeon === state.PLUS_RESULTS.top4.subcampeon) top4Points += pSettings.secondPlus;
      if (state.PLUS_RESULTS.top4.tercero && plusBet.top4.tercero === state.PLUS_RESULTS.top4.tercero) top4Points += pSettings.thirdPlus;
      if (state.PLUS_RESULTS.top4.cuarto && plusBet.top4.cuarto === state.PLUS_RESULTS.top4.cuarto) top4Points += pSettings.fourthPlus;
    }

    const data: number[] = [];
    let exacts = 0;
    let tend = 0;
    let comodinPts = 0;
    let miss = 0;
    let currentStreak = 0;
    let maxStreak = 0;
    let tiesBet = 0;
    let groupsPts = 0;
    let knockoutPts = 0;
    let transitions = 0;
    let lastWasZero = true; // start assuming 0
    let aloneHits = matchScorers.filter(ms => ms.scorers === 1 && ms.scorerName === player).length;

    matches.forEach((m, idx) => {
      const bet = state.BETS[player]?.find(b => b.matchId === m.id);
      let mPts = 0;
      if (bet) {
        if (bet.gL === bet.gV) tiesBet++;
        
        const raw = calcMatchScore(bet, m);
        if (raw) {
          mPts = raw.pts * getMultiplier(m.tipo);
          cumulativeMatch += mPts;
          if (m.tipo !== 'N') comodinPts += mPts;
          
          if (raw.type === 'score') {
            exacts++;
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
          } else if (raw.type === 'result') {
            tend++;
            currentStreak = 0;
          } else {
            miss++;
            currentStreak = 0;
          }
        } else {
            currentStreak = 0;
        }
      } else {
        currentStreak = 0;
      }

      const isZero = mPts === 0;
      if (idx > 0 && isZero !== lastWasZero) transitions++;
      lastWasZero = isZero;

      if (m.fase === 'Grupos') {
        groupsPts += mPts;
      } else {
        knockoutPts += mPts;
      }

      if (plusBet && plusBet.goOn && state.PLUS_RESULTS && state.PLUS_RESULTS.goOn) {
        const goOnReal = state.PLUS_RESULTS.goOn.find(g => g.matchId === m.id);
        if (goOnReal && goOnReal.equipo) {
          const myBet = plusBet.goOn.find(b => b.matchId === m.id);
          if (myBet && myBet.equipo === goOnReal.equipo) {
            cumulativeGoOn += pSettings.goOnPlus;
          }
        }
      }

      if (m.id === lastFinalizedGroupMatchId) {
        cumulativeGroup += groupPoints;
        groupsPts += groupPoints;
      }
      
      if (m.id === maxId) {
        cumulativeTop4 += top4Points;
        knockoutPts += (cumulativeGoOn + top4Points);
      }

      let stepTotal = cumulativeMatch + cumulativeGoOn + cumulativeGroup + cumulativeTop4;
      data.push(stepTotal);
    });

    return { 
      player, data, exacts, tend, comodinPts, maxStreak, miss, 
      plusPts: cumulativeGoOn + cumulativeGroup + cumulativeTop4, 
      total: data[data.length-1],
      tiesBet, transitions, aloneHits,
      arranqueScore: groupsPts - knockoutPts,
      tortugaScore: knockoutPts - groupsPts
    };
  });

  // Calculate facts
  let maxE = 0, vidente = '-';
  let maxS = 0, racha = '-';
  let maxC = 0, apostador = '-';
  let maxM = 0, tronco = '-';
  let maxP = 0, nostradamus = '-';
  
  let maxTend = 0, alPalo = '-';
  let maxTies = 0, conservador = '-';
  let maxArranque = 0, caballo = '-';
  let maxTortuga = 0, tortuga = '-';
  let maxTrans = 0, montana = '-';
  let maxAlone = 0, oveja = '-';

  pStats.forEach(p => {
    if (p.exacts > maxE) { maxE = p.exacts; vidente = p.player; }
    if (p.maxStreak > maxS) { maxS = p.maxStreak; racha = p.player; }
    if (p.comodinPts > maxC) { maxC = p.comodinPts; apostador = p.player; }
    if (p.miss > maxM) { maxM = p.miss; tronco = p.player; }
    if (p.plusPts > maxP) { maxP = p.plusPts; nostradamus = p.player; }
    
    if (p.tend > maxTend) { maxTend = p.tend; alPalo = p.player; }
    if (p.tiesBet > maxTies) { maxTies = p.tiesBet; conservador = p.player; }
    if (p.arranqueScore > maxArranque) { maxArranque = p.arranqueScore; caballo = p.player; }
    if (p.tortugaScore > maxTortuga) { maxTortuga = p.tortugaScore; tortuga = p.player; }
    if (p.transitions > maxTrans) { maxTrans = p.transitions; montana = p.player; }
    if (p.aloneHits > maxAlone) { maxAlone = p.aloneHits; oveja = p.player; }
  });

  statsGrid.innerHTML = `
    <div class="stat-card">
      <div class="stat-icon">🎯</div>
      <div class="stat-title">El Vidente</div>
      <div class="stat-value">${vidente}</div>
      <div class="stat-desc">Más marcadores exactos (${maxE})</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">🔥</div>
      <div class="stat-title">Racha de Fuego</div>
      <div class="stat-value">${racha}</div>
      <div class="stat-desc">Aciertos exactos seguidos (${maxS})</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">🤑</div>
      <div class="stat-title">El Apostador</div>
      <div class="stat-value">${apostador}</div>
      <div class="stat-desc">Puntos en part. especiales (${maxC})</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">🪵</div>
      <div class="stat-title">El Tronco</div>
      <div class="stat-value">${tronco}</div>
      <div class="stat-desc">Más partidos con 0 pts (${maxM})</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">🔮</div>
      <div class="stat-title">Nostradamus</div>
      <div class="stat-value">${nostradamus}</div>
      <div class="stat-desc">Más puntos en fase Plus (${maxP})</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">🥅</div>
      <div class="stat-title">El "Al Palo"</div>
      <div class="stat-value">${alPalo}</div>
      <div class="stat-desc">Acierta quién gana, no el score (${maxTend})</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">🥱</div>
      <div class="stat-title">El Conservador</div>
      <div class="stat-value">${conservador}</div>
      <div class="stat-desc">Apostó al empate más veces (${maxTies})</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">🐴</div>
      <div class="stat-title">Caballo de Arranque</div>
      <div class="stat-value">${caballo}</div>
      <div class="stat-desc">Rey en grupos, mal en finales</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">🐢</div>
      <div class="stat-title">Tortuga Ninja</div>
      <div class="stat-value">${tortuga}</div>
      <div class="stat-desc">Remontador en fases finales</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">🎢</div>
      <div class="stat-title">Montaña Rusa</div>
      <div class="stat-value">${montana}</div>
      <div class="stat-desc">Más inconstante (rachas rotas ${maxTrans})</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">🐑</div>
      <div class="stat-title">La Oveja Negra</div>
      <div class="stat-value">${oveja}</div>
      <div class="stat-desc">Único en puntuar en un partido (${maxAlone})</div>
    </div>
  `;

  // Colors sequence
  const colors = [
    '#4a9eff', '#4caf7d', '#f0a500', '#ff5252', '#a855f7', '#ec4899', '#14b8a6', '#f97316'
  ];

  // Destroy previous chart instance if exists
  if ((window as any).__pointsChart) {
    (window as any).__pointsChart.destroy();
  }

  const lineEndLabelsPlugin = {
    id: 'lineEndLabels',
    afterDraw(chart: any) {
      const { ctx } = chart;
      chart.data.datasets.forEach((dataset: any, i: number) => {
        const meta = chart.getDatasetMeta(i);
        if (!meta.hidden && meta.data.length > 0) {
          const lastPoint = meta.data[meta.data.length - 1];
          ctx.fillStyle = dataset.borderColor;
          ctx.font = '600 11px "DM Sans", sans-serif';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(dataset.label, lastPoint.x + 6, lastPoint.y);
        }
      });
    }
  };

  (window as any).__pointsChart = new Chart(chartCanvas, {
    type: 'line',
    data: {
      labels,
      datasets: pStats.map((p, i) => ({
        label: p.player,
        data: p.data,
        borderColor: colors[i % colors.length],
        backgroundColor: colors[i % colors.length],
        tension: 0.2,
        pointRadius: 2
      }))
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      layout: {
        padding: { right: 50 } // Espacio para que quepan los nombres al final
      },
      plugins: {
        legend: {
          labels: { color: '#dde1e6' }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
        }
      },
      scales: {
        x: {
          ticks: { color: '#999' },
          grid: { color: '#333' }
        },
        y: {
          ticks: { color: '#999' },
          grid: { color: '#333' }
        }
      }
    },
    plugins: [lineEndLabelsPlugin]
  });
}
