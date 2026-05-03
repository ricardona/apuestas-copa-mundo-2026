import { state } from '../state';
import { getStats } from '../scoring';

// ─── Metrics ──────────────────────────────────────────────────────────────────

export function buildMetrics() {
  const stats = state.PLAYERS.map(getStats).sort((a, b) => b.pts - a.pts);
  const fin = state.RESULTS.filter(r => r.status === 'finalizado').length;
  const pen = state.RESULTS.filter(r => r.status === 'pendiente').length;

  const metricsEl = document.getElementById('metrics-row');
  if (metricsEl) {
    const liderInfo = stats.length > 0 && stats[0].pts > 0 ? `${stats[0].name} · ${stats[0].pts} pts` : '-';
    metricsEl.innerHTML = `
      <div class="metric"><div class="metric-label">Partidos jugados</div><div class="metric-value">${fin}</div></div>
      <div class="metric"><div class="metric-label">Pendientes</div><div class="metric-value">${pen}</div></div>
      <div class="metric"><div class="metric-label">Líder</div><div class="metric-value sm">${liderInfo}</div></div>
    `;
  }
}
