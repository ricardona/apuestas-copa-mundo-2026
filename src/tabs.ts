// ─── Tabs ─────────────────────────────────────────────────────────────────────

export function initTabs() {
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
