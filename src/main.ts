import './style.css';
import { state } from './state';
import { buildMetrics } from './components/metrics';
import { buildRanking } from './components/ranking';
import { buildMatches } from './components/matches';
import { buildPlus } from './components/plus';
import { initTabs } from './tabs';

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
    state.PLAYERS = playersData.participantes;
    state.RESULTS = await resultsRes.json();
    if (settingsRes.ok) state.SETTINGS = await settingsRes.json();

    // Load bets + plus bets in parallel
    await Promise.all(state.PLAYERS.map(async name => {
      try {
        const res = await fetch(`${basePath}/bets/${name}.json`);
        if (!res.ok) throw new Error();
        state.BETS[name] = await res.json();
      } catch {
        console.warn(`No se pudo cargar apuesta de ${name}`);
        state.BETS[name] = [];
      }

      try {
        const res = await fetch(`${basePath}/bets/${name}.plus.json`);
        if (res.ok) state.PLUS_BETS[name] = await res.json();
      } catch {
        console.warn(`No se pudo cargar plus de ${name}`);
      }
    }));

    // Load plus results (stored in results.json as separate key, or a dedicated file)
    try {
      const prRes = await fetch(`${basePath}/plus_results.json`);
      if (prRes.ok) state.PLUS_RESULTS = await prRes.json();
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
