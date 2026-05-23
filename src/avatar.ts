// ─── Avatar ───────────────────────────────────────────────────────────────────

const AV: Record<string, string> = {
  santiago: 'av-s',
  mauro: 'av-m',
  juan: 'av-j',
  andrea: 'av-a',
  lucas: 'av-l'
};

export function initials(n: string) { return n.slice(0, 2).toUpperCase(); }

export function avatar(name: string, size = 32, url?: string) {
  if (url) {
    return `<img class="avatar" src="${url}" alt="${initials(name)}" title="${name}" style="width:${size}px;height:${size}px;object-fit:cover;">`;
  }
  const cls = AV[name] || 'av-s';
  const fontSize = Math.round(size * 0.34);
  return `<div class="avatar ${cls}" style="width:${size}px;height:${size}px;font-size:${fontSize}px">${initials(name)}</div>`;
}
