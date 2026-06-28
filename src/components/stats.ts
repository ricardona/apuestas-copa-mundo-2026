import Chart from 'chart.js/auto';
import { state } from '../state';
import { calcularPuntosConvocatoria, calcMatchScore, getMultiplier } from '../scoring';

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

  const maxId = matches[matches.length - 1]?.id ?? -1;
  const groupPlusChartAfterMatchId = 73;
  const labels = matches.flatMap(m => (
    m.id === groupPlusChartAfterMatchId ? [`P${m.id}`, 'Plus grupos'] : [`P${m.id}`]
  ));

  const pStats = state.PLAYERS.map(player => {
    let cumulativeMatch = 0;
    let cumulativeGoOn = 0;
    let cumulativeGroup = 0;
    let cumulativeTop4 = 0;
    
    const plusBet = state.PLUS_BETS[player];
    const pSettings = state.SETTINGS.puntos;
    const convocatoriaPoints = calcularPuntosConvocatoria(plusBet, state.COLOMBIA_FINAL?.jugadoresOficiales);

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

      if (m.id === maxId) {
        cumulativeTop4 += top4Points;
        knockoutPts += (cumulativeGoOn + top4Points);
      }

      let stepTotal = cumulativeMatch + cumulativeGoOn + cumulativeGroup + cumulativeTop4;
      data.push(stepTotal);

      if (m.id === groupPlusChartAfterMatchId) {
        cumulativeGroup += groupPoints;
        groupsPts += groupPoints;
        stepTotal = cumulativeMatch + cumulativeGoOn + cumulativeGroup + cumulativeTop4;
        data.push(stepTotal);
      }
    });

    return { 
      player, data, exacts, tend, comodinPts, maxStreak, miss, 
      convocatoriaPoints,
      plusPts: cumulativeGoOn + cumulativeGroup + cumulativeTop4,
      total: data[data.length-1],
      tiesBet, transitions, matchPts: cumulativeMatch,
      arranqueScore: groupsPts - knockoutPts,
      tortugaScore: knockoutPts - groupsPts
    };
  });

  // Helper to find players tied for a maximum metric
  const getMaxPlayers = (metric: (p: any) => number, minThreshold: number = 0) => {
    let maxVal = -Infinity;
    let players: string[] = [];
    
    pStats.forEach(p => {
      const val = metric(p);
      if (val > maxVal) {
        maxVal = val;
        players = [p.player];
      } else if (val === maxVal) {
        players.push(p.player);
      }
    });

    if (maxVal <= minThreshold && minThreshold !== -Infinity) return { val: maxVal, str: '-' };
    return { val: maxVal, str: players.join(', ') };
  };

  // Helper to find players tied for a minimum metric
  const getMinPlayers = (metric: (p: any) => number, maxThreshold: number = Infinity) => {
    let minVal = Infinity;
    let players: string[] = [];
    
    pStats.forEach(p => {
      const val = metric(p);
      if (val < minVal) {
        minVal = val;
        players = [p.player];
      } else if (val === minVal) {
        players.push(p.player);
      }
    });

    if (minVal >= maxThreshold && maxThreshold !== Infinity) return { val: minVal, str: '-' };
    return { val: minVal, str: players.join(', ') };
  };

  const videnteData = getMaxPlayers(p => p.exacts);
  const vidente = videnteData.str;
  const maxE = videnteData.val;

  const rachaData = getMaxPlayers(p => p.maxStreak);
  const racha = rachaData.str;
  const maxS = rachaData.val;

  const apostadorData = getMaxPlayers(p => p.comodinPts);
  const apostador = apostadorData.str;
  const maxC = apostadorData.val;

  const troncoData = getMaxPlayers(p => p.miss);
  const tronco = troncoData.str;
  const maxM = troncoData.val;

  const nostradamusData = getMaxPlayers(p => p.plusPts);
  const nostradamus = nostradamusData.str;
  const maxP = nostradamusData.val;

  const convocatoriaData = getMaxPlayers(p => p.convocatoriaPoints);
  const convocatoria = convocatoriaData.str;
  const maxConvocatoria = convocatoriaData.val;

  const alPaloData = getMaxPlayers(p => p.tend);
  const alPalo = alPaloData.str;
  const maxTend = alPaloData.val;

  const conservadorData = getMaxPlayers(p => p.tiesBet);
  const conservador = conservadorData.str;
  const maxTies = conservadorData.val;

  const caballoData = getMaxPlayers(p => p.arranqueScore, -Infinity);
  const caballo = caballoData.str;

  const tortugaData = getMaxPlayers(p => p.tortugaScore, -Infinity);
  const tortuga = tortugaData.str;

  const montanaData = getMaxPlayers(p => p.transitions);
  const montana = montanaData.str;
  const maxTrans = montanaData.val;

  const ovejaData = getMinPlayers(p => p.matchPts);
  const oveja = ovejaData.str;
  const minMatch = ovejaData.val;

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
      <div class="stat-icon">🇨🇴</div>
      <div class="stat-title">Maturana</div>
      <div class="stat-value">${convocatoria}</div>
      <div class="stat-desc">Más aciertos en la lista final (${maxConvocatoria})</div>
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
      <div class="stat-desc">Menos puntos en partidos (${minMatch} pts)</div>
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
