// ─── Tabs ─────────────────────────────────────────────────────────────────────

export function initTabs() {
  document.querySelectorAll('.tab, .header-action-link[data-target], .logo-home[data-target]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = (e.currentTarget as HTMLElement).dataset.target;
      if (!target) return;
      activateTab(target, true);
    });
  });

  const initial = currentRouteTarget();
  if (initial) activateTab(initial, false);

  window.addEventListener('hashchange', () => {
    const target = currentRouteTarget();
    if (target) activateTab(target, false);
  });
}

export function activateTab(target: string, updateHash = false) {
  document.body.classList.toggle('mis-apuestas-mode', target === 'mis-apuestas');
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.tab, .header-action-link[data-target], .logo-home[data-target]').forEach(t => t.classList.remove('active'));

  const tabEl = document.getElementById('tab-' + target);
  const btnEl = document.querySelector(`.tab[data-target="${target}"], .header-action-link[data-target="${target}"], .logo-home[data-target="${target}"]`);
  if (tabEl) tabEl.classList.add('active');
  if (btnEl) btnEl.classList.add('active');

  if (updateHash && window.location.hash !== `#/${target}`) {
    window.location.hash = `#/${target}`;
  }
}

function currentRouteTarget() {
  const hashTarget = window.location.hash.replace(/^#\/?/, '');
  const pathTarget = window.location.pathname.split('/').filter(Boolean).at(-1) ?? '';
  const target = hashTarget || pathTarget;
  return document.getElementById('tab-' + target) ? target : '';
}
