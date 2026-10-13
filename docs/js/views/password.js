// Nhập mật khẩu (APP_PASSWORD trong Apps Script). Mỗi máy nhập một lần, lưu trong localStorage.
import { h, toast } from '../ui.js';
import { store } from '../store.js';

const dialog = () => document.getElementById('passwordDialog');

export function openPassword() {
  const dlg = dialog();
  if (dlg.open) return;

  const input = h('input', { type: 'password', name: 'password', autocomplete: 'current-password', required: true, enterkeyhint: 'go' });
  const result = h('p', { class: 'result', 'aria-live': 'polite' });
  const submit = h('button', { class: 'primary', type: 'submit' }, 'Mở lịch');

  const form = h('form', { class: 'settings' },
    h('header', { class: 'dlg-head' },
      h('h2', { class: 'dlg-title', text: 'Nhập mật khẩu' }),
      h('button', { class: 'icon-btn', type: 'button', 'aria-label': 'Đóng', onclick: () => dlg.close() }, '×')),
    h('p', { class: 'hint', text: 'Lịch được khoá bằng mật khẩu đặt trong Apps Script (APP_PASSWORD). Chỉ cần nhập một lần trên máy này.' }),
    h('label', { class: 'field' }, 'Mật khẩu', input),
    result,
    h('footer', { class: 'dlg-foot' }, h('span', { class: 'spacer' }), submit),
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    submit.disabled = true;
    result.textContent = 'Đang kiểm tra…';
    result.dataset.type = '';
    try {
      await store.login(input.value);
      dlg.close();
      toast('Đã mở khoá. Đang đồng bộ…');
    } catch (err) {
      result.textContent = err.message;
      result.dataset.type = 'error';
      input.select();
    } finally {
      submit.disabled = false;
    }
  });

  dlg.replaceChildren(form);
  dlg.showModal();
  input.focus();
}
