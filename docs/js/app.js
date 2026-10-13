// Điểm vào: điều hướng tháng, vẽ lại khi dữ liệu đổi, phím tắt, vuốt, service worker.
import { store } from './store.js';
import { renderHeader, renderGrid, renderAside } from './views/month.js';
import { openDay, refreshDayDialog } from './views/dayDialog.js';
import { openSettings } from './views/settings.js';
import { openPassword } from './views/password.js';
import { todayParts, toast } from './ui.js';

const $ = (id) => document.getElementById(id);

function viewFromHash() {
  const m = /^#(\d{4})-(\d{2})$/.exec(location.hash);
  if (m) return { y: Number(m[1]), m: Number(m[2]) };
  const t = todayParts();
  return { y: t.y, m: t.m };
}

let view = viewFromHash();

function go(next, opts = {}) {
  view = next;
  const hash = `#${view.y}-${String(view.m).padStart(2, '0')}`;
  if (location.hash !== hash) history.replaceState(null, '', hash);
  render(opts.direction);
}

const handlers = {
  prev: () => go(MonthGrid.shiftMonth(view.y, view.m, -1), { direction: 'prev' }),
  next: () => go(MonthGrid.shiftMonth(view.y, view.m, 1), { direction: 'next' }),
  today: () => { const t = todayParts(); go({ y: t.y, m: t.m }); },
  jump: (ym) => go(ym),
  settings: openSettings,
  sync: () => {
    if (!store.configured) { openSettings(); return; }
    if (store.status === 'auth') { openPassword(); return; }
    if (store.status === 'error') toast(store.statusMessage, 'error');
    store.sync();
  },
};

function render(direction) {
  renderHeader($('header'), view, handlers);
  renderGrid($('grid'), view, openDay);
  renderAside($('aside'), view, handlers);
  const page = $('page');
  page.dataset.flip = direction || '';
  if (direction) { page.classList.remove('flip'); void page.offsetWidth; page.classList.add('flip'); }
  document.title = `${CanChi.monthVi(view.m)} ${view.y} · Lịch Bàn`;
}

store.addEventListener('change', () => {
  // Không vẽ lại ô NOTES khi đang gõ
  const typing = document.activeElement?.id === 'monthNotes';
  renderGrid($('grid'), view, openDay);
  if (!typing) renderAside($('aside'), view, handlers);
  refreshDayDialog();
});
store.addEventListener('status', () => renderHeader($('header'), view, handlers));
store.addEventListener('auth', () => { if (!document.querySelector('dialog[open]')) openPassword(); });

// Phím tắt (khi không gõ chữ và không mở hộp thoại)
document.addEventListener('keydown', (e) => {
  if (document.querySelector('dialog[open]')) return;
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'ArrowLeft') handlers.prev();
  else if (e.key === 'ArrowRight') handlers.next();
  else if (e.key === 't' || e.key === 'T') handlers.today();
});

// Vuốt ngang để lật tháng
let touch = null;
$('grid').addEventListener('touchstart', (e) => { const t = e.touches[0]; touch = { x: t.clientX, y: t.clientY, at: Date.now() }; }, { passive: true });
$('grid').addEventListener('touchend', (e) => {
  if (!touch) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - touch.x, dy = t.clientY - touch.y;
  if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && Date.now() - touch.at < 600) {
    dx < 0 ? handlers.next() : handlers.prev();
  }
  touch = null;
}, { passive: true });

// Bấm ra ngoài hộp thoại để đóng
for (const dlg of document.querySelectorAll('dialog')) {
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
}

// Đồng bộ khi quay lại app, khi có mạng, và định kỳ
document.addEventListener('visibilitychange', () => { if (!document.hidden) { store.sync(); render(); } });
window.addEventListener('online', () => store.sync());
setInterval(() => { if (!document.hidden && store.pending.length) store.sync(); }, 30000);
window.addEventListener('hashchange', () => { view = viewFromHash(); render(); });
window.addEventListener('beforeunload', (e) => { if (store.pending.length && store.configured) { e.preventDefault(); e.returnValue = ''; } });

render();
store.sync();

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('SW:', err));
}
