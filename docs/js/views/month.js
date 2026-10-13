// Tờ lịch một tháng: header, lưới ngày, lịch mini, ô NOTES.
import { h, fill, penMark, dayKey, todayParts, debounce } from '../ui.js';
import { store } from '../store.js';

const WEEKDAYS = [
  ['Thứ Hai', 'Mon', 'T2'], ['Thứ Ba', 'Tue', 'T3'], ['Thứ Tư', 'Wed', 'T4'], ['Thứ Năm', 'Thu', 'T5'],
  ['Thứ Sáu', 'Fri', 'T6'], ['Thứ Bảy', 'Sat', 'T7'], ['Chủ Nhật', 'Sun', 'CN'],
];
const MINI_WEEKDAYS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

/** Nhãn âm lịch trong ô: "21", hoặc "1/9 (Đ)" vào mùng 1. */
function lunarLabel(l) {
  if (l.day !== 1) return String(l.day);
  const len = Lunar.monthLengthAtJd(l.jd);
  return `${l.day}/${l.month}${l.leap ? 'N' : ''} (${len === 30 ? 'Đ' : 'T'})`;
}

export function renderHeader(root, view, handlers) {
  const statusText = {
    local: 'Đang lưu trên máy này',
    synced: 'Đã lưu lên Google Sheet',
    syncing: 'Đang đồng bộ…',
    pending: 'Chờ gửi lên Google Sheet',
    error: 'Lỗi đồng bộ: ' + store.statusMessage,
    locked: 'Ghi chú đang khoá — chạm để nhập mật khẩu',
  }[store.status];

  fill(root,
    h('div', { class: 'year-block' },
      h('span', { class: 'year-num', text: String(view.y) }),
      h('span', { class: 'year-canchi', text: CanChi.year(view.y) }),
    ),
    h('h1', { class: 'month-title' },
      h('span', { class: 'month-en', text: CanChi.monthEn(view.m) }),
      h('span', { class: 'month-vi', text: CanChi.monthVi(view.m) }),
    ),
    h('nav', { class: 'toolbar', 'aria-label': 'Điều hướng tháng' },
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Tháng trước', title: 'Tháng trước (←)', onclick: handlers.prev }, '‹'),
      h('button', { class: 'today-btn', type: 'button', title: 'Về hôm nay (T)', onclick: handlers.today }, 'Hôm nay'),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Tháng sau', title: 'Tháng sau (→)', onclick: handlers.next }, '›'),
      store.locked
        ? h('button', { class: 'icon-btn lock-btn', type: 'button', title: statusText, 'aria-label': statusText, onclick: handlers.unlock }, '🔒')
        : h('button', { class: 'sync-dot', type: 'button', dataset: { status: store.status }, title: statusText, 'aria-label': statusText, onclick: handlers.sync }),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Cài đặt', title: 'Cài đặt', onclick: handlers.settings }, '⚙'),
    ),
  );
}

export function renderGrid(root, view, onOpenDay) {
  const today = todayParts();
  const notesIdx = store.notesIndex();
  const weeks = MonthGrid.build(view.y, view.m);

  const head = h('div', { class: 'grid-row grid-head', role: 'row' },
    h('div', { class: 'wk-head', 'aria-hidden': 'true', text: 'W' }),
    WEEKDAYS.map(([vi, en, short], i) => h('div', { class: 'dow' + (i === 5 ? ' sat' : '') + (i === 6 ? ' sun' : ''), role: 'columnheader', 'aria-label': vi },
      h('span', { class: 'dow-vi', text: vi }), h('span', { class: 'dow-en', text: en }), h('span', { class: 'dow-short', text: short }))),
  );

  const rows = weeks.map((w) => h('div', { class: 'grid-row', role: 'row' },
    h('div', { class: 'wk', 'aria-label': 'Tuần ' + w.week }, h('span', { text: String(w.week) })),
    w.days.map((s, i) => dayCell(s, i, today, notesIdx, onOpenDay)),
  ));

  root.style.setProperty('--weeks', weeks.length);
  root.replaceChildren(head, ...rows);
  store.justSaved = null;
}

function dayCell(s, col, today, notesIdx, onOpenDay) {
  const lunar = Lunar.toLunar(s);
  const holidays = Holidays.forDay(s, lunar);
  const key = dayKey(s);
  const notes = notesIdx.get(key) || [];
  const isToday = MonthGrid.sameDay(s, today);
  const dayOff = col === 6 || holidays.some((x) => x.dayOff);

  const cls = ['cell'];
  if (!s.inMonth) cls.push('out');
  if (isToday) cls.push('today');
  if (dayOff) cls.push('off');
  if (col === 5) cls.push('sat');
  if (lunar.day === 1) cls.push('lunar-first');
  if (holidays.length) cls.push('has-holiday');

  const first = notes[0];
  const hasReminder = notes.some((n) => store.reminderFor(n.id));
  const label = [
    CanChi.weekday(s), `${s.d}/${s.m}/${s.y}`, `âm lịch ${lunar.day}/${lunar.month}`,
    ...holidays.map((x) => x.name),
    notes.length ? `${notes.length} ghi chú` : '',
  ].filter(Boolean).join(', ');

  const numWrap = h('span', { class: 'num-wrap' }, h('span', { class: 'num', text: String(s.d) }));
  if (first && first.mark !== 'none') {
    const mark = penMark(first.mark || 'circle', first.color || '#C42B2B', first.id, store.justSaved === first.id);
    if (mark) numWrap.append(mark);
  }

  return h('button', { class: cls.join(' '), type: 'button', role: 'gridcell', 'aria-label': label, dataset: { key }, onclick: () => onOpenDay(s) },
    numWrap,
    h('span', { class: 'lunar', text: lunarLabel(lunar) }),
    holidays.length ? h('span', { class: 'holiday', text: holidays.map((x) => x.name).join(' · ') }) : null,
    first ? h('span', { class: 'note-line', style: `color:${first.color || '#C42B2B'}`, text: first.title || '…' }) : null,
    notes.length > 1 ? h('span', { class: 'more', text: '+' + (notes.length - 1) }) : null,
    hasReminder ? h('span', { class: 'bell', 'aria-hidden': 'true', text: '🔔' }) : null,
  );
}

export function renderAside(root, view, handlers) {
  const prev = MonthGrid.shiftMonth(view.y, view.m, -1);
  const next = MonthGrid.shiftMonth(view.y, view.m, 1);
  const key = `${view.y}-${String(view.m).padStart(2, '0')}`;
  const notesIdx = store.notesIndex();

  const textarea = h('textarea', { id: 'monthNotes', rows: 6, placeholder: 'Việc cần nhớ trong tháng…', 'aria-label': 'Ghi chú tháng' });
  textarea.value = store.monthNote(key);
  const save = debounce(() => store.saveMonthNote(key, textarea.value), 800);
  textarea.addEventListener('input', save);
  textarea.addEventListener('blur', () => { if (textarea.value !== store.monthNote(key)) store.saveMonthNote(key, textarea.value); });

  fill(root,
    h('div', { class: 'minis' }, ...[prev, next].map((ym) => miniMonth(ym, handlers.jump, notesIdx))),
    store.locked
      ? h('div', { class: 'notes-box' },
        h('span', { class: 'notes-label', text: 'Notes' }),
        h('button', { class: 'unlock-btn', type: 'button', onclick: handlers.unlock }, '🔒 Nhập mật khẩu để xem ghi chú'))
      : h('label', { class: 'notes-box', for: 'monthNotes' }, h('span', { class: 'notes-label', text: 'Notes' }), textarea),
    store.configured || store.locked ? null : h('p', { class: 'local-hint' },
      'Ghi chú đang lưu trên máy này. ',
      h('button', { class: 'link-btn', type: 'button', onclick: handlers.settings }, 'Xem cách liên kết Google Sheet'),
      '.'),
  );
}

function miniMonth(ym, onJump, notesIdx) {
  const today = todayParts();
  const weeks = MonthGrid.build(ym.y, ym.m);
  return h('section', { class: 'mini', 'aria-label': `${CanChi.monthVi(ym.m)} ${ym.y}` },
    h('button', { class: 'mini-title', type: 'button', onclick: () => onJump(ym) },
      h('span', { class: 'mini-num', text: String(ym.m).padStart(2, '0') }),
      h('span', { text: CanChi.monthEn(ym.m) })),
    h('div', { class: 'mini-grid' },
      MINI_WEEKDAYS.map((d, i) => h('span', { class: 'mini-dow' + (i === 6 ? ' sun' : ''), text: d })),
      weeks.flatMap((w) => w.days.map((s, i) => {
        if (!s.inMonth) return h('span', { class: 'mini-day empty' });
        const note = notesIdx.get(dayKey(s))?.[0];
        const cls = 'mini-day' + (i === 6 ? ' sun' : '') + (MonthGrid.sameDay(s, today) ? ' today' : '') + (note ? ' has-note' : '');
        return h('span', { class: cls, style: note ? `--note:${note.color || '#C42B2B'}` : null, title: note ? note.title : null, text: String(s.d) });
      })),
    ),
  );
}
