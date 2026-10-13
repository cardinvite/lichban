// Cài đặt: kiểm tra kết nối Apps Script, thử Telegram, sao lưu.
import { h, toast } from '../ui.js';
import { store } from '../store.js';
import { openPassword } from './password.js';

const dialog = () => document.getElementById('settingsDialog');

export function openSettings() {
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
    await store.testConnection();
    store.sync();
    return 'Kết nối được với Google Sheet.';
  }));

  const tgBtn = h('button', { type: 'button' }, 'Gửi tin thử Telegram');
  tgBtn.addEventListener('click', () => run(tgBtn, async () => {
    await store.testTelegram();
    return 'Đã gửi. Mở Telegram để kiểm tra.';
  }));

  const connection = store.configured
    ? h('fieldset', {},
      h('legend', { text: 'Google Sheet' }),
      h('p', { class: 'hint', text: 'Ghi chú tự lưu lên Google Sheet qua Apps Script và dùng chung trên mọi thiết bị.' }),
      h('div', { class: 'row-btns' }, testBtn, tgBtn,
        h('button', { type: 'button', onclick: () => { dialog().close(); openPassword(); } }, 'Nhập mật khẩu')),
      result)
    : h('fieldset', {},
      h('legend', { text: 'Google Sheet' }),
      h('p', { class: 'hint', text: 'Chưa liên kết Apps Script: ghi chú chỉ lưu trên trình duyệt này. Dán URL Web App vào docs/js/config.js rồi push lên GitHub.' }));

  const form = h('div', { class: 'settings' },
    h('header', { class: 'dlg-head' },
      h('h2', { class: 'dlg-title', text: 'Cài đặt' }),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Đóng', onclick: () => dialog().close() }, '×')),
    connection,
    h('fieldset', {},
      h('legend', { text: 'Sao lưu' }),
      h('p', { class: 'hint', text: 'Dữ liệu đã nằm trong Google Sheet. File sao lưu dùng khi muốn giữ một bản riêng hoặc chuyển sang tài khoản khác.' }),
      h('div', { class: 'row-btns' },
        h('button', { type: 'button', onclick: exportFile }, 'Tải bản sao lưu'),
        h('label', { class: 'file-btn' }, 'Khôi phục từ file',
          h('input', { type: 'file', accept: 'application/json,.json', onchange: importFile })))),
    h('fieldset', {},
      h('legend', { text: 'Trên máy này' }),
      h('p', { class: 'hint', text: 'Xoá dữ liệu lưu tạm trên trình duyệt này. Dữ liệu trên Google Sheet không bị ảnh hưởng.' }),
      h('button', { class: 'danger', type: 'button', onclick: clearLocal }, 'Xoá dữ liệu trên máy này')),
  );

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
  if (!confirm('Xoá dữ liệu lưu tạm trên trình duyệt này?')) return;
  store.clearLocal();
  location.reload();
}
