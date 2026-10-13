// Hộp thoại một ngày: xem ngày lễ, danh sách ghi chú, thêm/sửa ghi chú và nhắc nhở.
import { h, fill, penMark, dmy, dayKey, pad2, todayParts, toast } from '../ui.js';
import { store } from '../store.js';

const COLORS = [
  ['#C42B2B', 'Đỏ'], ['#1F5FBF', 'Xanh dương'], ['#3F8A3A', 'Xanh lá'],
  ['#8A3F9B', 'Tím'], ['#D97A00', 'Cam'], ['#2E2E33', 'Đen'],
];
const MARKS = [['circle', 'Khoanh tròn'], ['dot', 'Chấm'], ['underline', 'Gạch chân'], ['none', 'Không đánh dấu']];
const REPEATS = [
  ['once', 'Một lần'],
  ['yearlySolar', 'Hằng năm (dương lịch)'],
  ['yearlyLunar', 'Hằng năm (âm lịch)'],
  ['monthlyLunar', 'Hằng tháng (âm lịch)'],
];
const LEADS = [[0, 'Đúng ngày'], [1, 'Trước 1 ngày'], [3, 'Trước 3 ngày'], [7, 'Trước 1 tuần']];

const dialog = () => document.getElementById('dayDialog');
let current = null; // ngày đang mở

export function openDay(s) {
  current = { y: s.y, m: s.m, d: s.d };
  renderList();
  const dlg = dialog();
  if (!dlg.open) dlg.showModal();
}

export function refreshDayDialog() {
  const dlg = dialog();
  if (dlg.open && current && !dlg.querySelector('form.editor')) renderList();
}

function header(s) {
  const lunar = Lunar.toLunar(s);
  return h('header', { class: 'dlg-head' },
    h('div', {},
      h('h2', { class: 'dlg-title', text: `${CanChi.weekday(s)}, ${dmy(s)}` }),
      h('p', { class: 'dlg-sub', text: CanChi.lunarLong(lunar) }),
    ),
    h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Đóng', onclick: () => dialog().close() }, '×'),
  );
}

function reminderSummary(rem, note) {
  if (!rem) return null;
  const kind = REPEATS.find(([k]) => k === rem.repeatKind)?.[1] || '';
  const lead = LEADS.find(([k]) => k === Number(rem.leadDays))?.[1] || '';
  const next = Occurrence.next(rem, note, todayParts(), 1)[0];
  const nextText = next ? `lần tới ${pad2(next.d)}/${pad2(next.m)}/${next.y} lúc ${pad2(next.hour)}:${pad2(next.minute)}` : 'không còn lần nhắc nào';
  return h('p', { class: 'rem-summary' + (rem.enabled === false ? ' off' : '') },
    `🔔 ${kind}, ${lead.toLowerCase()}, ${nextText}`);
}

function renderList() {
  const s = current;
  const lunar = Lunar.toLunar(s);
  const holidays = Holidays.forDay(s, lunar);
  const notes = store.notesForDay(dayKey(s));

  const list = notes.length
    ? h('ul', { class: 'note-list' }, notes.map((n) => h('li', {},
      h('button', { class: 'note-item', type: 'button', onclick: () => renderEditor(n) },
        h('span', { class: 'swatch', style: `background:${n.color}` }),
        h('span', { class: 'note-text' },
          h('strong', { text: n.title || '(không tiêu đề)' }),
          n.body ? h('span', { class: 'note-body', text: n.body }) : null,
          reminderSummary(store.reminderFor(n.id), n)),
      ))))
    : h('p', { class: 'empty', text: 'Chưa có ghi chú cho ngày này.' });

  fill(dialog(),
    header(s),
    holidays.length ? h('ul', { class: 'holiday-list' }, holidays.map((x) => h('li', { text: x.name }))) : null,
    list,
    h('footer', { class: 'dlg-foot' },
      h('button', { class: 'primary', type: 'button', onclick: () => renderEditor(null) }, 'Thêm ghi chú')),
  );
}

function renderEditor(note) {
  const s = current;
  const lunar = Lunar.toLunar(s);
  const rem = note ? store.reminderFor(note.id) : null;
  const color0 = note?.color || COLORS[0][0];
  const mark0 = note?.mark || 'circle';

  const title = h('input', { name: 'title', required: true, maxlength: 200, autocomplete: 'off', placeholder: 'VD: Sinh nhật mẹ' });
  title.value = note?.title || '';
  const body = h('textarea', { name: 'body', rows: 3, maxlength: 5000, placeholder: 'Chi tiết (không bắt buộc)' });
  body.value = note?.body || '';

  const colorPick = h('div', { class: 'colors', role: 'radiogroup', 'aria-label': 'Màu bút' },
    COLORS.map(([c, name]) => h('label', { class: 'color', title: name },
      h('input', { type: 'radio', name: 'color', value: c, checked: c === color0 }),
      h('span', { style: `background:${c}` }), h('span', { class: 'sr', text: name }))));

  const markPick = h('div', { class: 'marks', role: 'radiogroup', 'aria-label': 'Kiểu đánh dấu' },
    MARKS.map(([k, name]) => h('label', { class: 'mark-opt' },
      h('input', { type: 'radio', name: 'mark', value: k, checked: k === mark0 }),
      h('span', { class: 'mark-demo' }, h('span', { text: String(s.d) }), penMark(k, '#C42B2B', 'demo' + k, false)),
      h('span', { text: name }))));

  // ── Nhắc nhở ──
  const remOn = h('input', { type: 'checkbox', name: 'remOn', checked: !!rem && rem.enabled !== false });
  const repeat = h('select', { name: 'repeatKind' }, REPEATS.map(([k, n]) => h('option', { value: k, selected: (rem?.repeatKind || 'yearlySolar') === k }, n)));
  const time = h('input', { type: 'time', name: 'time', value: rem ? `${pad2(rem.hour)}:${pad2(rem.minute)}` : '08:00', required: true });
  const lead = h('select', { name: 'leadDays' }, LEADS.map(([k, n]) => h('option', { value: k, selected: Number(rem?.leadDays || 0) === k }, n)));
  const lunarDay = h('input', { type: 'number', name: 'lunarDay', min: 1, max: 30, value: rem?.lunarDay || lunar.day });
  const lunarMonth = h('input', { type: 'number', name: 'lunarMonth', min: 1, max: 12, value: rem?.lunarMonth || lunar.month });
  const lunarRow = h('div', { class: 'row lunar-row' },
    h('label', {}, 'Ngày âm', lunarDay),
    h('label', { class: 'lunar-month-field' }, 'Tháng âm', lunarMonth));
  const preview = h('p', { class: 'rem-preview', 'aria-live': 'polite' });
  const remFields = h('div', { class: 'rem-fields' },
    h('div', { class: 'row' }, h('label', {}, 'Lặp lại', repeat), h('label', {}, 'Giờ', time)),
    h('div', { class: 'row' }, h('label', {}, 'Nhắc', lead)),
    lunarRow, preview);

  const draftReminder = () => {
    const [hh, mm] = (time.value || '08:00').split(':').map(Number);
    return {
      repeatKind: repeat.value, hour: hh, minute: mm, leadDays: Number(lead.value),
      lunarDay: Number(lunarDay.value) || null, lunarMonth: Number(lunarMonth.value) || null,
    };
  };
  const update = () => {
    remFields.hidden = !remOn.checked;
    const isLunar = repeat.value === 'yearlyLunar' || repeat.value === 'monthlyLunar';
    lunarRow.hidden = !isLunar;
    lunarRow.querySelector('.lunar-month-field').hidden = repeat.value !== 'yearlyLunar';
    const next = Occurrence.next(draftReminder(), { year: s.y, month: s.m, day: s.d }, todayParts(), 1)[0];
    preview.textContent = next
      ? `Lần nhắc tới: ${CanChi.weekday(next)}, ${pad2(next.d)}/${pad2(next.m)}/${next.y} lúc ${pad2(next.hour)}:${pad2(next.minute)} qua Telegram`
      : 'Ngày này đã qua, sẽ không có lần nhắc nào.';
  };
  [remOn, repeat, time, lead, lunarDay, lunarMonth].forEach((el) => el.addEventListener('input', update));

  const form = h('form', { class: 'editor', novalidate: true },
    header(s),
    h('label', { class: 'field' }, 'Tiêu đề', title),
    h('label', { class: 'field' }, 'Ghi chú', body),
    h('fieldset', {}, h('legend', { text: 'Đánh dấu trên lịch' }), markPick, colorPick),
    h('fieldset', { class: 'rem' },
      h('legend', {}, h('label', { class: 'switch' }, remOn, h('span', { text: 'Nhắc qua Telegram' }))),
      remFields),
    h('footer', { class: 'dlg-foot' },
      note ? h('button', { class: 'danger', type: 'button', onclick: () => remove(note) }, 'Xoá ghi chú') : null,
      h('span', { class: 'spacer' }),
      h('button', { type: 'button', onclick: renderList }, 'Huỷ'),
      h('button', { class: 'primary', type: 'submit' }, 'Lưu ghi chú')),
  );

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!title.value.trim()) { title.focus(); toast('Nhập tiêu đề cho ghi chú.', 'error'); return; }
    const fd = new FormData(form);
    const saved = store.saveNote({
      id: note?.id, year: s.y, month: s.m, day: s.d,
      title: title.value.trim(), body: body.value.trim(),
      mark: fd.get('mark'), color: fd.get('color'),
    });
    if (remOn.checked) {
      const r = draftReminder();
      if (r.repeatKind !== 'yearlyLunar') r.lunarMonth = null;
      if (r.repeatKind !== 'yearlyLunar' && r.repeatKind !== 'monthlyLunar') r.lunarDay = null;
      store.saveReminder({ ...r, id: rem?.id, noteId: saved.id, enabled: true });
    } else if (rem) {
      store.deleteReminder(rem.id);
    }
    toast('Đã lưu ghi chú.');
    renderList();
  });

  dialog().replaceChildren(form);
  update();
  title.focus();
}

function remove(note) {
  if (!confirm(`Xoá ghi chú "${note.title}"?`)) return;
  store.deleteNote(note.id);
  toast('Đã xoá ghi chú.');
  renderList();
}
