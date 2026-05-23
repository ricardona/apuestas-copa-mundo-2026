import './style.css';
import { state } from './state';
import { buildMetrics } from './components/metrics';
import { buildRanking } from './components/ranking';
import { buildMatches } from './components/matches';
import { buildPlus } from './components/plus';
import { buildStats } from './components/stats';
import { buildMisApuestas } from './components/mis-apuestas';
import { initTabs } from './tabs';

// ─── Bootstrap ────────────────────────────────────────────────────────────────

/**
 * Initialise the vanilla app.
 * Called by the React auth layer once the user is confirmed signed-in.
 * @param currentPlayer - Clerk username (or email local-part) matched against
 *   data/players.json. Stored in state.CURRENT_PLAYER for use by components
 *   such as mis-apuestas to pre-select the logged-in player.
 */
export async function startApp(currentPlayer?: string, getToken?: () => Promise<string | null>) {
  state.CURRENT_PLAYER = currentPlayer ?? null;

  try {
    const urlParams = new URLSearchParams(window.location.search);
    const dataFolder = urlParams.get('data') || (urlParams.has('test') ? 'test_data' : 'data');
    const basePath = `./${dataFolder}`;

    const [resultsRes, settingsRes, playersRes] = await Promise.all([
      fetch(`${basePath}/results.json`),
      fetch(`${basePath}/settings.json`),
      fetch('/api/players'),
    ]);

    if (!playersRes.ok) throw new Error('No se pudieron cargar los jugadores.');
    const playersData = await playersRes.json() as { participantes: string[]; avatars?: Record<string, string> };
    state.PLAYERS = playersData.participantes;
    state.AVATARS = playersData.avatars ?? {};
    state.RESULTS = await resultsRes.json();
    if (settingsRes.ok) state.SETTINGS = await settingsRes.json();

    // Load bets from DB (one fast request)
    const betsRes = await fetch('/api/bets');
    if (!betsRes.ok) throw new Error('No se pudieron cargar las apuestas.');
    const betsData = await betsRes.json() as { bets?: Record<string, unknown>; plus?: Record<string, unknown> };
    state.BETS = (betsData.bets ?? {}) as typeof state.BETS;
    state.PLUS_BETS = (betsData.plus ?? {}) as typeof state.PLUS_BETS;

    // Load plus results (stored in results.json as separate key, or a dedicated file)
    try {
      const prRes = await fetch(`${basePath}/plus_results.json`);
      if (prRes.ok) state.PLUS_RESULTS = await prRes.json();
    } catch { /* optional file */ }

    try {
      const colombiaRes = await fetch(`${basePath}/colombia_final.json`);
      if (colombiaRes.ok) state.COLOMBIA_FINAL = await colombiaRes.json();
    } catch { /* optional file */ }

    buildMetrics();
    buildRanking();
    buildMatches();
    buildPlus();
    buildStats();
    buildMisApuestas(basePath, getToken);
    initTabs();

    const loaderEl = document.getElementById('global-loader');
    if (loaderEl) loaderEl.classList.add('hidden');
  } catch (error) {
    console.error('Error al iniciar la aplicación:', error);

    const loaderEl = document.getElementById('global-loader');
    if (loaderEl) {
      loaderEl.innerHTML = '<div class="loader-text" style="color: var(--red);">Error al cargar datos.</div>';
    }
  }
}

