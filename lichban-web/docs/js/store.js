// Dữ liệu phía client: hiện ngay từ localStorage, ghi lạc quan, đồng bộ nền với Apps Script.
import { callApi } from './api.js';

const KEYS = {
  data: 'lichban.data.v1',
  pending: 'lichban.pending.v1',
  settings: 'lichban.settings.v1',
};

const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
  : 'id-' + Date.now().toString(36) + Math.random().toString(36).slice(2));
const nowIso = () => new Date().toISOString();

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
}
function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { console.warn('localStorage đầy?', err); }
}

class Store extends EventTarget {
  constructor() {
    super();
    const data = readJson(KEYS.data, {});
    this.notes = new Map((data.notes || []).map((n) => [n.id, n]));
    this.reminders = new Map((data.reminders || []).map((r) => [r.id, r]));
    this.monthNotes = new Map((data.monthNotes || []).map((m) => [m.key, m]));
    this.lastSync = data.lastSync || '';
    this.pending = readJson(KEYS.pending, []);
    this.settings = readJson(KEYS.settings, { apiUrl: '', token: '' });
    this.status = this.configured ? (this.pending.length ? 'pending' : 'synced') : 'local';
    this.statusMessage = '';
    this.syncing = null;
    this.justSaved = null;
  }

  get configured() { return !!(this.settings.apiUrl && this.settings.token); }

  // ───── Đọc ─────
  notesForDay(key) {
    const [y, m, d] = key.split('-').map(Number);
    return [...this.notes.values()]
      .filter((n) => !n.deleted && n.year === y && n.month === m && n.day === d)
      .sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
  }

  notesIndex() {
    const idx = new Map();
    for (const n of this.notes.values()) {
      if (n.deleted) continue;
      const k = `${n.year}-${String(n.month).padStart(2, '0')}-${String(n.day).padStart(2, '0')}`;
      if (!idx.has(k)) idx.set(k, []);
      idx.get(k).push(n);
    }
    for (const list of idx.values()) list.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
    return idx;
  }

  reminderFor(noteId) {
    for (const r of this.reminders.values()) if (r.noteId === noteId && !r.deleted) return r;
    return null;
  }

  monthNote(key) { return this.monthNotes.get(key)?.text || ''; }

  // ───── Ghi ─────
  saveNote(input) {
    const prev = input.id ? this.notes.get(input.id) : null;
    const note = {
      ...(prev || {}),
      ...input,
      id: input.id || uuid(),
      createdAt: prev?.createdAt || nowIso(),
      updatedAt: nowIso(),
      deleted: false,
    };
    this.notes.set(note.id, note);
    this.justSaved = note.id;
    this.enqueue('upsertNote', note, note.id);
    return note;
  }

  deleteNote(id) {
    const note = this.notes.get(id);
    if (!note) return;
    note.deleted = true;
    note.updatedAt = nowIso();
    for (const r of this.reminders.values()) {
      if (r.noteId === id && !r.deleted) { r.deleted = true; r.updatedAt = note.updatedAt; this.dropPending(r.id); }
    }
    this.enqueue('deleteNote', { id }, id);
  }

  saveReminder(input) {
    const prev = input.id ? this.reminders.get(input.id) : null;
    const rem = { ...(prev || {}), ...input, id: input.id || uuid(), updatedAt: nowIso(), deleted: false };
    this.reminders.set(rem.id, rem);
    this.enqueue('upsertReminder', rem, rem.id);
    return rem;
  }

  deleteReminder(id) {
    const rem = this.reminders.get(id);
    if (!rem) return;
    rem.deleted = true;
    rem.updatedAt = nowIso();
    this.enqueue('deleteReminder', { id }, id);
  }

  saveMonthNote(key, text) {
    const mn = { key, text, updatedAt: nowIso() };
    this.monthNotes.set(key, mn);
    this.enqueue('upsertMonthNote', mn, 'month:' + key);
  }

  // ───── Hàng đợi đồng bộ ─────
  enqueue(action, payload, id) {
    // Gộp: thao tác mới trên cùng bản ghi thay thao tác cũ chưa gửi
    this.pending = this.pending.filter((op) => !(op.id === id && (op.action === action || action.startsWith('delete'))));
    this.pending.push({ action, payload, id });
    this.persist();
    this.emit();
    this.sync();
  }

  dropPending(id) { this.pending = this.pending.filter((op) => op.id !== id); }
  hasPending(id) { return this.pending.some((op) => op.id === id); }

  persist() {
    writeJson(KEYS.data, {
      notes: [...this.notes.values()],
      reminders: [...this.reminders.values()],
      monthNotes: [...this.monthNotes.values()],
      lastSync: this.lastSync,
    });
    writeJson(KEYS.pending, this.pending);
  }

  setStatus(status, message = '') {
    this.status = status;
    this.statusMessage = message;
    this.dispatchEvent(new Event('status'));
  }

  emit() { this.dispatchEvent(new Event('change')); }

  /** Gửi hàng đợi rồi kéo thay đổi mới. Gọi nhiều lần cùng lúc chỉ chạy một. */
  sync() {
    if (!this.configured) { this.setStatus('local'); return Promise.resolve(); }
    if (this.syncing) { this.syncAgain = true; return this.syncing; }
    this.syncing = (async () => {
      this.setStatus('syncing');
      try {
        do {
          this.syncAgain = false;
          await this.flush();
          await this.pull();
        } while (this.syncAgain);
        this.setStatus(this.pending.length ? 'pending' : 'synced');
      } catch (err) {
        console.error(err);
        this.setStatus('error', err.message);
      } finally {
        this.syncing = null;
      }
    })();
    return this.syncing;
  }

  async flush() {
    while (this.pending.length) {
      const op = this.pending[0];
      const result = await callApi(this.settings, op.action, op.payload);
      if (this.pending[0] === op) this.pending.shift();
      this.applyServer(op.action, result);
      this.persist();
    }
  }

  applyServer(action, rec) {
    if (!rec) return;
    const table = action.includes('Note') && !action.includes('Month') ? this.notes
      : action.includes('Reminder') ? this.reminders : action.includes('MonthNote') ? this.monthNotes : null;
    if (table) this.merge(table, rec, table === this.monthNotes ? 'key' : 'id', true);
  }

  async pull() {
    const data = await callApi(this.settings, 'getAll', { since: this.lastSync || undefined });
    let changed = false;
    for (const n of data.notes || []) changed = this.merge(this.notes, n, 'id') || changed;
    for (const r of data.reminders || []) changed = this.merge(this.reminders, r, 'id') || changed;
    for (const m of data.monthNotes || []) changed = this.merge(this.monthNotes, m, 'key') || changed;
    this.lastSync = data.serverTime;
    this.persist();
    if (changed) this.emit();
  }

  /** Bản từ máy chủ thắng nếu không có thao tác chờ gửi và không cũ hơn bản đang có. */
  merge(table, rec, keyName, fromWrite = false) {
    const k = rec[keyName];
    const pendingId = table === this.monthNotes ? 'month:' + k : k;
    if (!fromWrite && this.hasPending(pendingId)) return false;
    const cur = table.get(k);
    if (cur && cur.updatedAt && rec.updatedAt && cur.updatedAt > rec.updatedAt) return false;
    if (cur && JSON.stringify(cur) === JSON.stringify(rec)) return false;
    table.set(k, rec);
    return true;
  }

  // ───── Cài đặt ─────
  saveSettings(settings) {
    const changedTarget = settings.apiUrl !== this.settings.apiUrl;
    this.settings = { apiUrl: settings.apiUrl.trim(), token: settings.token.trim() };
    writeJson(KEYS.settings, this.settings);
    if (changedTarget) {
      // Máy chủ mới: đẩy toàn bộ dữ liệu trên máy lên rồi tải lại từ đầu
      this.lastSync = '';
      for (const n of this.notes.values()) this.enqueueSilently('upsertNote', n, n.id);
      for (const r of this.reminders.values()) this.enqueueSilently('upsertReminder', r, r.id);
      for (const m of this.monthNotes.values()) this.enqueueSilently('upsertMonthNote', m, 'month:' + m.key);
      this.persist();
    }
    return this.sync();
  }

  enqueueSilently(action, payload, id) {
    if (!this.hasPending(id)) this.pending.push({ action, payload, id });
  }

  // ───── Sao lưu ─────
  exportJson() {
    return {
      app: 'lichban',
      version: 1,
      exportedAt: nowIso(),
      notes: [...this.notes.values()].filter((n) => !n.deleted),
      reminders: [...this.reminders.values()].filter((r) => !r.deleted),
      monthNotes: [...this.monthNotes.values()],
    };
  }

  importJson(obj, mode) {
    if (!obj || obj.app !== 'lichban' || obj.version !== 1) throw new Error('File không phải bản sao lưu Lịch Bàn.');
    const ids = new Set((obj.notes || []).map((n) => n.id));
    if (mode === 'replace') {
      for (const n of this.notes.values()) if (!n.deleted && !ids.has(n.id)) this.deleteNote(n.id);
    }
    for (const n of obj.notes || []) {
      this.notes.set(n.id, { ...n, updatedAt: nowIso(), deleted: false });
      this.enqueueSilently('upsertNote', this.notes.get(n.id), n.id);
    }
    for (const r of obj.reminders || []) {
      this.reminders.set(r.id, { ...r, updatedAt: nowIso(), deleted: false });
      this.enqueueSilently('upsertReminder', this.reminders.get(r.id), r.id);
    }
    for (const m of obj.monthNotes || []) {
      this.monthNotes.set(m.key, { ...m, updatedAt: nowIso() });
      this.enqueueSilently('upsertMonthNote', this.monthNotes.get(m.key), 'month:' + m.key);
    }
    this.persist();
    this.emit();
    this.sync();
    return (obj.notes || []).length;
  }

  clearLocal() {
    for (const k of Object.values(KEYS)) localStorage.removeItem(k);
  }

  testTelegram() { return callApi(this.settings, 'testTelegram', {}); }
  testConnection(settings) { return callApi(settings, 'getAll', { since: new Date().toISOString() }); }
}

export const store = new Store();
