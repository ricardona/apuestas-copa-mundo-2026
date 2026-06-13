import { state } from './state';
import { getMultiplier } from './scoring';

export function formatMatchDate(fecha?: string): string {
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
}

export function formatCountdown(fecha?: string, status?: string): string {
  if (status === 'finalizado' || status === 'jugando' || !fecha) return '';
  const diffMs = new Date(fecha).getTime() - Date.now();
  if (diffMs <= 0) return '';
  const days = Math.floor(diffMs / 86400000);
  if (days >= 1) return `${days} ${days === 1 ? 'día' : 'días'}`;
  const hours = Math.floor(diffMs / 3600000);
  const mins = Math.floor((diffMs % 3600000) / 60000);
  if (hours >= 1) return `${hours}h ${mins}m`;
  return `${Math.max(1, mins)} min`;
}

export function tipoLabel(tipo?: string): string {
  if (!tipo || tipo === 'N') return '';
  const label = state.SETTINGS.tiposPartido[tipo] || tipo;
  const cls = tipo === 'X' ? 'tipo-x' : 'tipo-e';
  return `<span class="match-tipo ${cls}">×${getMultiplier(tipo)} ${label}</span>`;
}
