import { state } from '../state';
import type { Bet, PlusBet, Result } from '../types';
import { activateTab } from '../tabs';
import { buildMatches } from './matches';
import { formatMatchDate, formatCountdown, tipoLabel } from '../match-display';

const COLOMBIA_PRESELECCIONADOS = [
  // --- ARQUEROS (6) ---
  'Kevin Mier', 'Alvaro Montero', 'Andrés Mosquera Marmolejo', 'David Ospina', 'Aldaír Quintana', 'Camilo Vargas',

  // --- DEFENSAS (17) ---
  'Álvaro Angulo', 'Santiago Arias', 'Cristian Borja', 'Juan David Cabal', 'Carlos Cuesta', 'Willer Ditta', 
  'Junior Hernández', 'Jhon Lucumí', 'Deiver Machado', 'Yerry Mina', 'Johan Mojica', 'Yerson Mosquera', 
  'Daniel Muñoz', 'Edier Ocampo', 'Andrés Román', 'Johan Romaña', 'Davinson Sánchez',

  // --- MEDIOCAMPISTAS (18) ---
  'Jhon Arias', 'Yaser Asprilla', 'Jordan Barrera', 'Wilmar Barrios', 'Jorge Carrascal', 'Kevin Castaño', 
  'Juan Guillermo Cuadrado', 'Nelson Deossa', 'Sebastián Gómez', 'Jefferson Lerma', 'Juan Camilo Portilla', 
  'Gustavo Puerta', 'Juan Fernando Quintero', 'Juan Manuel Rengifo', 'Johan Rojas', 'Jhon Solís', 
  'Richard Ríos', 'James Rodríguez',

  // --- DELANTEROS (14) ---
  'Rafael Santos Borré', 'Jaminton Campaz', 'Johan Carbonero', 'Edwuin Cetré', 'Jhon Córdoba', 'Jhon Durán', 
  'Carlos Andrés Gómez', 'Juan Camilo Hernández', 'Stiven Mendoza', 'Luis Suárez', 'Sebastián Villa', 'Neiser Villarreal', 
  'Kevin Viveros', 'Luis Díaz'
];

const GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
const TOP4_KEYS: Array<keyof PlusBet['top4']> = ['campeon', 'subcampeon', 'tercero', 'cuarto'];
const TOP4_LABELS: Record<keyof PlusBet['top4'], string> = {
  campeon: 'Campeón',
  subcampeon: 'Subcampeón',
  tercero: 'Tercero',
  cuarto: 'Cuarto'
};

type GetToken = () => Promise<string | null>;

type EditorData = {
  player: string;
  bets: Bet[];
  plus: PlusBet;
  basePath: string;
  updatedAt: string | null;
};

let editor: EditorData | null = null;
let getTokenFn: GetToken | null = null;

export function buildMisApuestas(basePath = './data', getToken?: GetToken) {
  getTokenFn = getToken ?? null;
  const container = document.getElementById('mis-apuestas-content');
  if (!container) return;

  const currentPlayer = state.CURRENT_PLAYER;
  if (!currentPlayer) {
    renderNotIdentified(container);
    return;
  }

  loadAndRenderEditor(container, basePath, currentPlayer);
}

async function loadAndRenderEditor(container: HTMLElement, basePath: string, player: string) {
  container.innerHTML = '<div class="mis-loading">Cargando apuestas…</div>';

  try {
    const token = await getTokenFn?.();
    const res = await fetch('/api/bets/me', {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!res.ok) throw new Error(`${res.status}`);

    const data = await res.json() as { bets: Bet[]; plus_bets: PlusBet | null; updated_at: string | null };

    editor = {
      player,
      bets: normalizeBets(data.bets ?? []),
      plus: normalizePlus(data.plus_bets ?? {}),
      basePath,
      updatedAt: data.updated_at,
    };
    renderEditor(container);
  } catch {
    container.innerHTML = '<div class="mis-shell"><div class="mis-hero"><p style="color:var(--red)">Error al cargar apuestas. Recarga la página.</p></div></div>';
  }
}

function renderNotIdentified(container: HTMLElement) {
  container.innerHTML = `
    <div class="mis-shell">
      <div class="mis-hero">
        <div>
          <div class="section-label">Mis Apuestas</div>
          <h2>Participante no identificado</h2>
          <p>Tu usuario de Clerk no coincide con ningún participante registrado.<br>
          Pide al administrador que configure tu nombre de usuario en Clerk para que coincida con tu nombre en la lista de participantes.</p>
        </div>
      </div>
    </div>`;
}

function renderEditor(container: HTMLElement) {
  if (!editor) return;
  const pending = state.RESULTS.filter(match => match.status === 'siguiente');
  const finishedCount = state.RESULTS.filter(
    match => match.status === 'finalizado' || match.status === 'jugando'
  ).length;
  const tournamentStarted = state.RESULTS.some(
    match => match.status === 'finalizado' || match.status === 'jugando'
  );
  const s = state.SETTINGS;
  const showConvocatoria = !tournamentStarted && s.mostrarConvocados;
  const showTop4 = s.mostrarCuadrodeHonor;
  const showGrupos = s.mostrarPosicionesGrupos;
  const top4Locked = tournamentStarted;
  const firstPanel = showConvocatoria ? 'convocatoria'
    : showTop4 ? 'top4'
    : showGrupos ? 'grupos'
    : 'partidos';

  container.innerHTML = `
    <div class="mis-shell">
      <div class="mis-editor-head">
        ${homeButton()}
        <div>
          <div class="section-label">Participante</div>
          <h2>${esc(editor.player)}</h2>
        </div>
        <div class="mis-editor-actions">
          <button class="mis-reset" id="mis-reset" type="button">Reiniciar</button>
          <button class="mis-primary" id="mis-save" type="button">Guardar apuestas</button>
          <span class="mis-save-status" id="mis-save-status"></span>
        </div>
      </div>
      <div class="mis-tabs" role="tablist">
        ${showConvocatoria ? `<button class="mis-subtab ${firstPanel === 'convocatoria' ? 'active' : ''}" data-panel="convocatoria">Convocatoria</button>` : ''}
        ${showTop4 ? `<button class="mis-subtab ${firstPanel === 'top4' ? 'active' : ''}" data-panel="top4">Top 4</button>` : ''}
        ${showGrupos ? `<button class="mis-subtab ${firstPanel === 'grupos' ? 'active' : ''}" data-panel="grupos">Grupos</button>` : ''}
        <button class="mis-subtab ${firstPanel === 'partidos' ? 'active' : ''}" data-panel="partidos">Partidos</button>
      </div>
      ${showConvocatoria ? `<div class="mis-panel ${firstPanel === 'convocatoria' ? 'active' : ''}" id="mis-panel-convocatoria">${renderConvocatoria()}</div>` : ''}
      ${showTop4 ? `<div class="mis-panel ${firstPanel === 'top4' ? 'active' : ''}" id="mis-panel-top4">${renderTop4(top4Locked)}</div>` : ''}
      ${showGrupos ? `<div class="mis-panel ${firstPanel === 'grupos' ? 'active' : ''}" id="mis-panel-grupos">${renderGroups()}</div>` : ''}
      <div class="mis-panel ${firstPanel === 'partidos' ? 'active' : ''}" id="mis-panel-partidos">${renderMatches(pending, finishedCount)}</div>
    </div>`;

  container.querySelector('.mis-home')?.addEventListener('click', goHome);
  container.querySelector('#mis-reset')?.addEventListener('click', () => resetEditor(container));

  container.querySelector('#mis-save')?.addEventListener('click', () => saveBets(container));
  container.querySelectorAll('.mis-subtab').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = (btn as HTMLElement).dataset.panel;
      container.querySelectorAll('.mis-subtab').forEach(item => item.classList.remove('active'));
      container.querySelectorAll('.mis-panel').forEach(item => item.classList.remove('active'));
      btn.classList.add('active');
      container.querySelector(`#mis-panel-${panel}`)?.classList.add('active');
    });
  });

  bindEditorInputs(container);
}

function renderMatches(matches: Result[], finishedCount: number) {
  const rows = matches.map(match => {
    const bet = ensureBet(match.id);
    const dateStr = formatMatchDate(match.fecha);
    const countdown = formatCountdown(match.fecha, match.status);
    return `<div class="mis-match-row">
      <div class="mis-match-info">
        <span class="mis-match-id">#${match.id}</span>
        <strong>${esc(match.local)}</strong>
        <span>vs</span>
        <strong>${esc(match.visita)}</strong>
        <small>${esc(match.fase ?? '')}${match.grupo ? ` · Grupo ${esc(match.grupo)}` : ''}${dateStr ? ` · ${dateStr}` : ''}</small>
        <div class="mis-match-badges">
          ${countdown ? `<span class="match-countdown">${countdown}</span>` : ''}
          ${tipoLabel(match.tipo)}
        </div>
      </div>
      <div class="mis-match-actions">
        <div class="mis-score-inputs">
          <input type="number" min="0" max="30" value="${bet.gL}" data-bet="${match.id}" data-side="gL" aria-label="Goles ${esc(match.local)}" />
          <span>-</span>
          <input type="number" min="0" max="30" value="${bet.gV}" data-bet="${match.id}" data-side="gV" aria-label="Goles ${esc(match.visita)}" />
        </div>
        ${renderGoOnSelect(match)}
      </div>
    </div>`;
  }).join('');

  const matchWord = matches.length === 1 ? 'partido abierto para apostar' : 'partidos abiertos para apostar';
  const finishedWord = finishedCount === 1 ? 'finalizado queda oculto y preservado' : 'finalizados quedan ocultos y preservados';
  return `
    <div class="mis-status">Se ${matches.length === 1 ? 'muestra' : 'muestran'} ${matches.length} ${matchWord}. ${finishedCount} ${finishedWord}.</div>
    <div class="mis-list">${rows || '<div class="mis-empty">No hay partidos pendientes para editar.</div>'}</div>`;
}

function renderGoOnSelect(match: Result) {
  if (!isKnockoutMatch(match)) return '';
  const value = editor?.plus.goOn.find(item => item.matchId === match.id)?.equipo ?? '';
  const teams = goOnTeams(match);
  return selectHtml(`data-goon="${match.id}"`, 'Avanza', teams, value);
}

function renderConvocatoria() {
  if (!editor) return '';
  const selected = new Set(editor.plus.convocatoriaColombia ?? []);
  const limitReached = selected.size >= 26;
  const items = COLOMBIA_PRESELECCIONADOS.map(name => `<label class="mis-check ${selected.has(name) ? 'selected' : ''}">
    <input type="checkbox" data-convocatoria="${esc(name)}" ${selected.has(name) ? 'checked' : ''} ${limitReached && !selected.has(name) ? 'disabled' : ''} />
    <span>${esc(name)}</span>
  </label>`).join('');
  return `
    <div class="mis-status" id="mis-convocatoria-status">${selected.size} / 26 seleccionados</div>
    <div class="mis-check-grid">${items}</div>`;
}

function renderGroups() {
  return GROUPS.map(group => {
    const teams = groupTeams(group);
    const values = editor?.plus.posicionesGrupos[group] ?? ['', '', '', ''];
    return `<div class="mis-group-card">
      <h3>Grupo ${group}</h3>
      <div class="mis-select-grid">
        ${[0, 1, 2, 3].map(i => selectHtml(`data-group="${group}" data-pos="${i}"`, `${i + 1}º`, teams, values[i] ?? '')).join('')}
      </div>
    </div>`;
  }).join('');
}

function renderTop4(locked: boolean) {
  if (locked) return lockedBox('Oculto y bloqueado por inicio del torneo');
  const teams = allTeams();
  return `<div class="mis-select-grid top4">
    ${TOP4_KEYS.map(key => selectHtml(`data-top4="${key}"`, TOP4_LABELS[key], teams, editor?.plus.top4[key] ?? '')).join('')}
  </div>`;
}

function bindEditorInputs(container: HTMLElement) {
  container.querySelectorAll<HTMLInputElement>('input[data-bet]').forEach(input => {
    input.addEventListener('input', () => {
      const bet = ensureBet(Number(input.dataset.bet));
      const side = input.dataset.side as 'gL' | 'gV';
      bet[side] = Math.max(0, Number(input.value || 0));
    });
  });

  container.querySelectorAll<HTMLInputElement>('input[data-convocatoria]').forEach(input => {
    input.addEventListener('change', () => toggleConvocatoria(input, container));
  });

  container.querySelectorAll<HTMLSelectElement>('select[data-group]').forEach(select => {
    select.addEventListener('change', () => updateGroup(select, container));
  });

  container.querySelectorAll<HTMLSelectElement>('select[data-top4]').forEach(select => {
    select.addEventListener('change', () => {
      if (!editor) return;
      const key = select.dataset.top4 as keyof PlusBet['top4'];
      editor.plus.top4[key] = select.value;
      refreshDuplicateOptions(container, `select[data-top4]`);
    });
  });

  container.querySelectorAll<HTMLSelectElement>('select[data-goon]').forEach(select => {
    select.addEventListener('change', () => updateGoOn(select));
  });

  GROUPS.forEach(group => refreshDuplicateOptions(container, `select[data-group="${group}"]`));
  refreshDuplicateOptions(container, `select[data-top4]`);
}

function toggleConvocatoria(input: HTMLInputElement, container: HTMLElement) {
  if (!editor) return;
  const name = input.dataset.convocatoria ?? '';
  const selected = new Set(editor.plus.convocatoriaColombia ?? []);
  if (input.checked && selected.size >= 26 && !selected.has(name)) {
    input.checked = false;
    const status = container.querySelector('#mis-convocatoria-status');
    if (status) status.textContent = 'Máximo 26 jugadores. Desmarca uno para cambiar.';
    return;
  }
  input.checked ? selected.add(name) : selected.delete(name);
  editor.plus.convocatoriaColombia = [...selected];
  input.closest('.mis-check')?.classList.toggle('selected', input.checked);
  refreshConvocatoriaLimit(container);
  const status = container.querySelector('#mis-convocatoria-status');
  if (status) status.textContent = `${selected.size} / 26 seleccionados`;
}

function refreshConvocatoriaLimit(container: HTMLElement) {
  if (!editor) return;
  const selected = new Set(editor.plus.convocatoriaColombia ?? []);
  const limitReached = selected.size >= 26;

  container.querySelectorAll<HTMLInputElement>('input[data-convocatoria]').forEach(input => {
    const name = input.dataset.convocatoria ?? '';
    input.disabled = limitReached && !selected.has(name);
  });
}

function updateGroup(select: HTMLSelectElement, container: HTMLElement) {
  if (!editor) return;
  const group = select.dataset.group ?? '';
  const pos = Number(select.dataset.pos);
  const current = editor.plus.posicionesGrupos[group] ?? ['', '', '', ''];
  current[pos] = select.value;
  if (pos <= 2) autoFillFourthGroupPosition(group, current, container);
  editor.plus.posicionesGrupos[group] = current;
  refreshDuplicateOptions(container, `select[data-group="${group}"]`);
}

function autoFillFourthGroupPosition(group: string, current: string[], container: HTMLElement) {
  if (!current[2]) {
    current[3] = '';
  } else {
    const usedTopThree = new Set(current.slice(0, 3).filter(Boolean));
    const remaining = groupTeams(group).filter(team => !usedTopThree.has(team));
    if (remaining.length === 1) current[3] = remaining[0];
  }

  const fourthSelect = container.querySelector<HTMLSelectElement>(`select[data-group="${group}"][data-pos="3"]`);
  if (fourthSelect) fourthSelect.value = current[3] ?? '';
}

function updateGoOn(select: HTMLSelectElement) {
  if (!editor) return;
  const matchId = Number(select.dataset.goon);
  editor.plus.goOn = editor.plus.goOn.filter(item => item.matchId !== matchId);
  if (select.value) editor.plus.goOn.push({ matchId, equipo: select.value });
}

function refreshDuplicateOptions(container: HTMLElement, selector: string) {
  const selects = [...container.querySelectorAll<HTMLSelectElement>(selector)];
  const chosen = new Set(selects.map(select => select.value).filter(Boolean));
  selects.forEach(select => {
    [...select.options].forEach(option => {
      option.disabled = !!option.value && option.value !== select.value && chosen.has(option.value);
    });
  });
}

function ensureBet(matchId: number) {
  if (!editor) throw new Error('Editor no inicializado');
  let bet = editor.bets.find(item => item.matchId === matchId);
  if (!bet) {
    bet = { matchId, gL: 0, gV: 0 };
    editor.bets.push(bet);
  }
  return bet;
}

function defaultPlus(): PlusBet {
  return {
    convocatoriaColombia: [],
    posicionesGrupos: Object.fromEntries(GROUPS.map(group => [group, ['', '', '', '']])) as Record<string, string[]>,
    top4: { campeon: '', subcampeon: '', tercero: '', cuarto: '' },
    goOn: []
  };
}

function normalizeBets(data: Bet[]) {
  if (!Array.isArray(data)) throw new Error('El archivo de partidos debe ser un array JSON.');
  const byId = new Map<number, Bet>(data.map(item => [Number(item.matchId), { matchId: Number(item.matchId), gL: Number(item.gL ?? 0), gV: Number(item.gV ?? 0), goOn: item.goOn }]));
  state.RESULTS.forEach(match => {
    if (!byId.has(match.id)) byId.set(match.id, { matchId: match.id, gL: 0, gV: 0 });
  });
  return [...byId.values()].sort((a, b) => a.matchId - b.matchId);
}

function normalizePlus(data: Partial<PlusBet>) {
  const base = defaultPlus();
  return {
    convocatoriaColombia: Array.isArray(data.convocatoriaColombia) ? data.convocatoriaColombia : [],
    posicionesGrupos: { ...base.posicionesGrupos, ...(data.posicionesGrupos ?? {}) },
    top4: { ...base.top4, ...(data.top4 ?? {}) },
    goOn: Array.isArray(data.goOn) ? data.goOn : []
  };
}

function groupTeams(group: string) {
  return [...new Set(state.RESULTS.filter(match => match.grupo === group).flatMap(match => [match.local, match.visita]))].sort();
}

function allTeams() {
  return [...new Set(state.RESULTS.filter(match => match.grupo).flatMap(match => [match.local, match.visita]))].sort();
}

function isKnockoutMatch(match: Result) {
  return !!match.fase && match.fase !== 'Grupos';
}

function goOnTeams(match: Result) {
  return [match.local, match.visita].filter(team => !/^Clasificado|^Ganador|^Perdedor/.test(team));
}

function selectHtml(attrs: string, label: string, options: string[], value: string) {
  const opts = options.map(option => `<option value="${esc(option)}" ${option === value ? 'selected' : ''}>${esc(option)}</option>`).join('');
  return `<label class="mis-field compact"><span>${esc(label)}</span><select ${attrs}><option value="">Sin seleccionar</option>${opts}</select></label>`;
}

function lockedBox(message: string) {
  return `<div class="mis-locked"><div class="mis-lock-icon">🔒</div><strong>${esc(message)}</strong><p>Los datos cargados quedan preservados íntegramente en la descarga.</p></div>`;
}

function homeButton() {
  return `<button class="mis-home" type="button">← Regresar</button>`;
}

function goHome() {
  activateTab('ranking', true);
}

function resetEditor(container: HTMLElement) {
  if (!editor) return;
  const confirmed = window.confirm('Se perderán los cambios no guardados. ¿Confirmas?');
  if (!confirmed) return;
  loadAndRenderEditor(container, editor.basePath, editor.player);
}


async function saveBets(container: HTMLElement) {
  if (!editor) return;

  const statusEl = container.querySelector('#mis-save-status');
  const btn = container.querySelector('#mis-save') as HTMLButtonElement | null;

  const token = await getTokenFn?.();
  if (!token) {
    if (statusEl) statusEl.textContent = 'Debes iniciar sesión para guardar.';
    return;
  }

  if (btn) btn.disabled = true;
  if (statusEl) statusEl.textContent = 'Guardando…';

  try {
    const res = await fetch('/api/bets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ bets: editor.bets, plus_bets: editor.plus, updated_at: editor.updatedAt }),
    });

    if (res.status === 409) {
      if (statusEl) statusEl.textContent = 'Conflicto: alguien guardó cambios más recientes. Recargando…';
      setTimeout(() => { if (editor) loadAndRenderEditor(container, editor.basePath, editor.player); }, 1500);
      return;
    }

    if (!res.ok) throw new Error(`${res.status}`);

    const result = await res.json() as { ok: boolean; updated_at?: string | null };
    if (result.updated_at) editor.updatedAt = result.updated_at;
    if (state.CURRENT_PLAYER) {
      state.BETS[state.CURRENT_PLAYER] = [...editor.bets];
    }
    buildMatches();
    if (statusEl) statusEl.textContent = 'Guardado correctamente.';
  } catch {
    if (statusEl) statusEl.textContent = 'Error al guardar. Intenta de nuevo.';
  } finally {
    if (btn) btn.disabled = false;
  }
}


function esc(value: string | number) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char] ?? char);
}
