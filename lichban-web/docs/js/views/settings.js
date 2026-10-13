// Cài đặt: kết nối Apps Script, thử Telegram, sao lưu.
import { h, toast } from '../ui.js';
import { store } from '../store.js';

const dialog = () => document.getElementById('settingsDialog');

export function openSettings() {
  const url = h('input', { type: 'url', name: 'apiUrl', placeholder: 'https://script.google.com/macros/s/…/exec', autocomplete: 'off', spellcheck: 'false' });
  url.value = store.settings.apiUrl;
  const token = h('input', { type: 'password', name: 'token', autocomplete: 'off', placeholder: 'API_TOKEN trong Script Properties' });
  token.value = store.settings.token;
  const result = h('p', { class: 'result', 'aria-live': 'polite' });

  const run = async (btn, fn) => {
    btn.disabled = true;
    result.textContent = 'Đang kiểm tra…';
    result.dataset.type = '';
    try {
      result.textContent = await fn();
      result.dataset.type = 'ok';
    } catch (err) {
      result.textContent = err.message;
      result.dataset.type = 'error';
    } finally {
      btn.disabled = false;
    }
  };

  const testBtn = h('button', { type: 'button' }, 'Kiểm tra kết nối');
  testBtn.addEventListener('click', () => run(testBtn, async () => {
    await store.testConnection({ apiUrl: url.value.trim(), token: token.value.trim() });
    return 'Kết nối được với Google Sheet.';
  }));

  const tgBtn = h('button', { type: 'button' }, 'Gửi tin thử qua Telegram');
  tgBtn.addEventListener('click', () => run(tgBtn, async () => {
    if (!store.configured) throw new Error('Lưu kết nối trước rồi thử Telegram.');
    await store.testTelegram();
    return 'Đã gửi. Mở Telegram để kiểm tra.';
  }));

  const form = h('form', { class: 'settings' },
    h('header', { class: 'dlg-head' },
      h('h2', { class: 'dlg-title', text: 'Cài đặt' }),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Đóng', onclick: () => dialog().close() }, '×')),
    h('fieldset', {},
      h('legend', { text: 'Kết nối Google Sheet' }),
      h('label', { class: 'field' }, 'URL ứng dụng web (Apps Script)', url),
      h('label', { class: 'field' }, 'Token', token),
      h('div', { class: 'row-btns' }, testBtn, tgBtn),
      result,
      h('button', { class: 'primary', type: 'submit' }, 'Lưu kết nối')),
    h('fieldset', {},
      h('legend', { text: 'Sao lưu' }),
      h('p', { class: 'hint', text: 'Dữ liệu đã nằm trong Google Sheet. File sao lưu dùng khi muốn giữ một bản riêng hoặc chuyển sang tài khoản khác.' }),
      h('div', { class: 'row-btns' },
        h('button', { type: 'button', onclick: exportFile }, 'Tải bản sao lưu'),
        h('label', { class: 'file-btn' }, 'Khôi phục từ file',
          h('input', { type: 'file', accept: 'application/json,.json', onchange: importFile })))),
    h('fieldset', {},
      h('legend', { text: 'Trên máy này' }),
      h('p', { class: 'hint', text: 'Xoá dữ liệu lưu tạm và kết nối trên trình duyệt này. Dữ liệu trên Google Sheet không bị ảnh hưởng.' }),
      h('button', { class: 'danger', type: 'button', onclick: clearLocal }, 'Xoá dữ liệu trên máy này')),
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (url.value && !/^https:\/\/script\.google\.com\/macros\/s\/.+\/exec$/.test(url.value.trim())) {
      result.textContent = 'URL phải có dạng https://script.google.com/macros/s/…/exec';
      result.dataset.type = 'error';
      return;
    }
    store.saveSettings({ apiUrl: url.value, token: token.value });
    toast(store.configured ? 'Đã lưu kết nối. Đang đồng bộ…' : 'Đã tắt kết nối, dữ liệu lưu trên máy này.');
    dialog().close();
  });

  dialog().replaceChildren(form);
  if (!dialog().open) dialog().showModal();
}

function exportFile() {
  const data = JSON.stringify(store.exportJson(), null, 2);
  const d = new Date();
  const name = `lichban-backup-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}.json`;
  const a = h('a', { href: URL.createObjectURL(new Blob([data], { type: 'application/json' })), download: name });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

async function importFile(e) {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file) return;
  try {
    const obj = JSON.parse(await file.text());
    const replace = confirm('Bấm OK để THAY THẾ toàn bộ ghi chú hiện có bằng bản sao lưu.\nBấm Huỷ để GỘP bản sao lưu vào ghi chú hiện có.');
    const n = store.importJson(obj, replace ? 'replace' : 'merge');
    toast(`Đã khôi phục ${n} ghi chú.`);
  } catch (err) {
    toast(err.message, 'error');
  }
}

function clearLocal() {
  if (!confirm('Xoá dữ liệu lưu tạm và kết nối trên trình duyệt này?')) return;
  store.clearLocal();
  location.reload();
}
