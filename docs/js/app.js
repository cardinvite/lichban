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
  unlock: openPassword,
  sync: () => {
    if (!store.configured) { openSettings(); return; }
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

// Vuốt ngang để lật tháng: lịch trượt theo ngón tay, thả đủ xa thì lật, chưa đủ thì bật về
const grid = $('grid');
let swipe = null;
let swallowClick = false;

function resetGrid(animated) {
  grid.style.transition = animated ? 'transform .2s ease-out, opacity .2s ease-out' : 'none';
  grid.style.transform = '';
  grid.style.opacity = '';
}

grid.addEventListener('touchstart', (e) => {
  if (e.touches.length !== 1) { swipe = null; return; }
  const t = e.touches[0];
  swipe = { x: t.clientX, y: t.clientY, at: Date.now(), dx: 0, axis: null };
}, { passive: true });

// Nghe move/end ở document: ô ngày có thể bị vẽ lại giữa lúc vuốt (đồng bộ xong) mà vẫn nhận đủ sự kiện
document.addEventListener('touchmove', (e) => {
  if (!swipe) return;
  const t = e.touches[0];
  const dx = t.clientX - swipe.x, dy = t.clientY - swipe.y;
  if (!swipe.axis && Math.hypot(dx, dy) > 8) swipe.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
  if (swipe.axis !== 'x') return;
  e.preventDefault();
  swipe.dx = dx;
  grid.style.transition = 'none';
  grid.style.transform = `translateX(${dx * 0.7}px)`;
  grid.style.opacity = String(1 - Math.min(Math.abs(dx) / 700, 0.35));
}, { passive: false });

document.addEventListener('touchend', () => {
  if (!swipe) return;
  const { dx, axis, at } = swipe;
  swipe = null;
  if (axis !== 'x') return;
  swallowClick = true;
  setTimeout(() => { swallowClick = false; }, 350);
  const flick = Math.abs(dx) > 30 && Date.now() - at < 250;
  if (Math.abs(dx) < 70 && !flick) { resetGrid(true); return; }

  const step = dx < 0 ? 1 : -1;
  grid.style.transition = 'transform .14s ease-in, opacity .14s ease-in';
  grid.style.transform = `translateX(${-step * 35}%)`;
  grid.style.opacity = '0';
  setTimeout(() => {
    go(MonthGrid.shiftMonth(view.y, view.m, step));
    grid.style.transition = 'none';
    grid.style.transform = `translateX(${step * 25}%)`;
    void grid.offsetWidth; // áp vị trí bắt đầu trước khi trượt vào
    resetGrid(true);
  }, 140);
}, { passive: true });

document.addEventListener('touchcancel', () => { if (swipe) { swipe = null; resetGrid(true); } }, { passive: true });
// Vuốt xong thì không coi là chạm vào ngày
grid.addEventListener('click', (e) => { if (swallowClick) { e.stopPropagation(); e.preventDefault(); } }, true);

// Bảng trượt (điện thoại): kéo xuống từ đầu bảng để đóng
const isPhone = matchMedia('(max-width: 899px)');
for (const dlg of document.querySelectorAll('dialog')) {
  let drag = null;
  dlg.addEventListener('touchstart', (e) => {
    if (!isPhone.matches || dlg.scrollTop > 0 || e.touches.length !== 1 || e.target.closest('textarea, select, input')) return;
    drag = { y: e.touches[0].clientY, at: Date.now(), dy: 0, active: false };
  }, { passive: true });
  dlg.addEventListener('touchmove', (e) => {
    if (!drag) return;
    const dy = e.touches[0].clientY - drag.y;
    if (!drag.active) {
      if (dy < 6) { if (dy < -6) drag = null; return; }
      drag.active = true;
      dlg.classList.add('dragging');
    }
    e.preventDefault();
    drag.dy = Math.max(0, dy);
    dlg.style.transform = `translateY(${drag.dy}px)`;
  }, { passive: false });
  const end = () => {
    if (!drag) return;
    const { dy, at, active } = drag;
    drag = null;
    if (!active) return;
    dlg.classList.remove('dragging');
    dlg.classList.add('settling');
    const close = dy > 110 || (dy > 40 && Date.now() - at < 250);
    dlg.style.transform = close ? 'translateY(100%)' : '';
    setTimeout(() => {
      dlg.classList.remove('settling');
      if (close) { dlg.close(); dlg.style.transform = ''; }
    }, 220);
  };
  dlg.addEventListener('touchend', end, { passive: true });
  dlg.addEventListener('touchcancel', end, { passive: true });
}

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
