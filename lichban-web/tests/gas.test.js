// Chạy Code.gs + Shared.gs trong môi trường Apps Script giả lập để kiểm tra API và trigger.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');

function fakeSheet(name) {
  const data = [];
  const sh = {
    name,
    data,
    getMaxRows: () => 1000,
    getLastRow: () => { for (let i = data.length - 1; i >= 0; i--) if ((data[i] || []).some((v) => v !== '')) return i + 1; return 0; },
    getLastColumn: () => Math.max(0, ...data.map((r) => { let n = 0; (r || []).forEach((v, i) => { if (v !== '') n = i + 1; }); return n; })),
    getRange(r, c, nr = 1, nc = 1) {
      const range = {
        setNumberFormat: () => range,
        setFontWeight: () => range,
        setValues(vals) {
          vals.forEach((row, i) => {
            data[r - 1 + i] = data[r - 1 + i] || [];
            row.forEach((v, j) => { data[r - 1 + i][c - 1 + j] = v; });
          });
          return range;
        },
        getValues() {
          const out = [];
          for (let i = 0; i < nr; i++) {
            const row = [];
            for (let j = 0; j < nc; j++) { const v = (data[r - 1 + i] || [])[c - 1 + j]; row.push(v === undefined ? '' : v); }
            out.push(row);
          }
          return out;
        },
      };
      return range;
    },
    setFrozenRows() {},
    deleteRow(r) { data.splice(r - 1, 1); },
    deleteRows(r, n) { data.splice(r - 1, n); },
  };
  return sh;
}

function makeEnv(props) {
  const sheets = {};
  const telegram = [];
  let fakeNow = null;
  const RealDate = Date;
  class FakeDate extends RealDate {
    constructor(...a) { if (a.length === 0 && fakeNow) super(fakeNow); else super(...a); }
  }
  const ss = {
    getSheetByName: (n) => sheets[n] || null,
    insertSheet: (n) => (sheets[n] = fakeSheet(n)),
    getUrl: () => 'https://sheet',
  };
  const ctx = {
    console, Date: FakeDate, JSON, Math, String, Number, Object, Array, Error, isFinite,
    SpreadsheetApp: { getActiveSpreadsheet: () => ss, openById: () => ss },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props[k] || null }) },
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (s) => ({ s, setMimeType() { return this; } }) },
    LockService: { getScriptLock: () => ({ tryLock: () => true, waitLock() {}, releaseLock() {} }) },
    Utilities: {
      getUuid: () => crypto.randomUUID(),
      formatDate(d, tz) {
        const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', hourCycle: 'h23' })
          .formatToParts(d).map((x) => [x.type, x.value]));
        return [p.year, p.month, p.day, p.hour, p.minute].join('-');
      },
    },
    UrlFetchApp: { fetch: (url, opt) => { telegram.push(JSON.parse(opt.payload)); return { getResponseCode: () => 200, getContentText: () => '{}' }; } },
    Logger: { log() {} },
    ScriptApp: { getProjectTriggers: () => [], newTrigger() { const b = { timeBased: () => b, everyHours: () => b, everyDays: () => b, atHour: () => b, inTimezone: () => b, create: () => b }; return b; } },
  };
  vm.createContext(ctx);
  const dir = path.join(__dirname, '..', 'apps-script');
  vm.runInContext(fs.readFileSync(path.join(dir, 'Shared.gs'), 'utf8') + '\n' + fs.readFileSync(path.join(dir, 'Code.gs'), 'utf8'), ctx);
  const call = (action, payload, token = props.API_TOKEN) => {
    vm.runInContext('sheetMemo_ = {}', ctx);
    return JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify({ token, action, payload }) } }).s);
  };
  return { ctx, call, sheets, telegram, setNow: (iso) => { fakeNow = iso; } };
}

const PROPS = { API_TOKEN: 'secret-123', TELEGRAM_BOT_TOKEN: 'bot', TELEGRAM_CHAT_ID: '42' };
const note = (over) => Object.assign({ id: 'n1', year: 2025, month: 11, day: 20, title: 'Sinh nhật mẹ', body: '', mark: 'circle', color: '#C42B2B', updatedAt: '2026-10-01T00:00:00.000Z' }, over);

test('sai token bị từ chối', () => {
  const env = makeEnv(PROPS);
  const r = env.call('getAll', {}, 'sai');
  assert.equal(r.ok, false);
  assert.equal(r.code, 'UNAUTHORIZED');
});

test('upsert + getAll + since + last-write-wins', () => {
  const env = makeEnv(PROPS);
  env.ctx.setup();
  assert.equal(env.call('upsertNote', note()).ok, true);
  let all = env.call('getAll', {}).data;
  assert.equal(all.notes.length, 1);
  assert.equal(all.notes[0].title, 'Sinh nhật mẹ');
  assert.equal(all.notes[0].year, 2025);

  // bản cũ hơn không ghi đè
  env.call('upsertNote', note({ title: 'cũ', updatedAt: '2026-09-01T00:00:00.000Z' }));
  assert.equal(env.call('getAll', {}).data.notes[0].title, 'Sinh nhật mẹ');
  // bản mới hơn ghi đè
  env.call('upsertNote', note({ title: 'mới', updatedAt: '2026-10-02T00:00:00.000Z' }));
  assert.equal(env.call('getAll', {}).data.notes[0].title, 'mới');

  const future = new Date(Date.now() + 60000).toISOString();
  assert.equal(env.call('getAll', { since: future }).data.notes.length, 0);

  env.call('upsertMonthNote', { key: '2026-10', text: 'Tháng bận', updatedAt: '2026-10-01T00:00:00.000Z' });
  assert.equal(env.call('getAll', {}).data.monthNotes[0].text, 'Tháng bận');
});

test('xoá ghi chú → xoá mềm cả nhắc nhở', () => {
  const env = makeEnv(PROPS);
  env.call('upsertNote', note());
  env.call('upsertReminder', { id: 'r1', noteId: 'n1', repeatKind: 'yearlySolar', hour: 8, minute: 0, leadDays: 0, enabled: true, updatedAt: '2026-10-01T00:00:00.000Z' });
  env.call('deleteNote', { id: 'n1' });
  const all = env.call('getAll', {}).data;
  assert.equal(all.notes[0].deleted, true);
  assert.equal(all.reminders[0].deleted, true);
});

test('hourlyTick gửi Telegram đúng lúc, không gửi trùng, client không ghi đè lastSentKey', () => {
  const env = makeEnv(PROPS);
  env.call('upsertNote', note());
  const rem = { id: 'r1', noteId: 'n1', repeatKind: 'yearlySolar', hour: 8, minute: 0, leadDays: 1, enabled: true, updatedAt: '2026-10-01T00:00:00.000Z' };
  env.call('upsertReminder', rem);

  env.setNow('2026-11-19T00:30:00Z'); // 7:30 giờ VN, chưa tới giờ
  env.ctx.hourlyTick();
  assert.equal(env.telegram.length, 0);

  env.setNow('2026-11-19T01:05:00Z'); // 8:05 giờ VN ngày 19/11 (nhắc trước 1 ngày)
  env.ctx.hourlyTick();
  assert.equal(env.telegram.length, 1);
  assert.match(env.telegram[0].text, /Sinh nhật mẹ/);
  assert.match(env.telegram[0].text, /Còn 1 ngày nữa/);
  assert.equal(env.telegram[0].chat_id, '42');

  env.setNow('2026-11-19T02:05:00Z');
  env.ctx.hourlyTick();
  assert.equal(env.telegram.length, 1, 'không gửi trùng');

  // client sửa reminder (gửi kèm lastSentKey rỗng) → máy chủ giữ lastSentKey
  env.setNow(null);
  env.call('upsertReminder', Object.assign({}, rem, { lastSentKey: '', updatedAt: '2026-11-19T02:10:00.000Z' }));
  env.setNow('2026-11-19T03:05:00Z');
  env.ctx.hourlyTick();
  assert.equal(env.telegram.length, 1);
  assert.equal(env.call('getAll', {}).data.reminders[0].lastSentKey, undefined, 'không lộ lastSentKey ra client');
});

test('morningDigest có ngày lễ 7 ngày tới', () => {
  const env = makeEnv(PROPS);
  env.setNow('2026-10-12T23:10:00Z'); // 6:10 sáng 13/10 giờ VN
  env.ctx.morningDigest();
  assert.equal(env.telegram.length, 1);
  assert.match(env.telegram[0].text, /Doanh nhân Việt Nam/);
  assert.match(env.telegram[0].text, /Phụ nữ Việt Nam/);
});
