/**
 * LichBan API — backend cho web Lịch Bàn.
 *
 * Project Apps Script cần 2 file:
 *   - Code.gs   (file này)
 *   - Shared.gs (âm lịch, ngày lễ, tính lần nhắc — sinh từ docs/js/shared bằng scripts/build-gas.sh)
 *
 * Script Properties:
 *   APP_PASSWORD        mật khẩu mở lịch (để trống = ai có URL cũng dùng được)
 *   SHEET_ID            ID của Google Sheet (bỏ qua nếu script mở từ Tiện ích mở rộng của Sheet)
 *   TELEGRAM_BOT_TOKEN  token từ @BotFather
 *   TELEGRAM_CHAT_ID    chat id nhận nhắc nhở
 *
 * Chạy một lần trong editor: setup → selfTest → (sau khi có Telegram) testTelegram → installTriggers
 * Deploy: Ứng dụng web, Thực thi: Tôi, Quyền truy cập: Bất kỳ ai.
 * Mỗi lần sửa code: Triển khai → Quản lý các lần triển khai → ✏️ → Phiên bản mới → Triển khai.
 */

var TZ = 'Asia/Ho_Chi_Minh';
var LOG_MAX_ROWS = 500;
// Sai mật khẩu quá MAX_FAILS lần trong LOCK_SECONDS giây thì khoá tạm.
var MAX_FAILS = 10;
var LOCK_SECONDS = 600;

// Cột mới luôn thêm vào CUỐI để dữ liệu cũ vẫn đọc đúng.
var SCHEMA = {
  Notes: {
    key: 'id',
    cols: [['id', 'str'], ['year', 'int'], ['month', 'int'], ['day', 'int'], ['title', 'str'], ['body', 'str'],
      ['mark', 'str'], ['color', 'str'], ['createdAt', 'str'], ['updatedAt', 'str'], ['deleted', 'bool'],
      ['syncedAt', 'str']]
  },
  Reminders: {
    key: 'id',
    cols: [['id', 'str'], ['noteId', 'str'], ['repeatKind', 'str'], ['hour', 'int'], ['minute', 'int'],
      ['leadDays', 'int'], ['lunarDay', 'int'], ['lunarMonth', 'int'], ['enabled', 'bool'], ['lastSentKey', 'str'],
      ['updatedAt', 'str'], ['deleted', 'bool'], ['syncedAt', 'str']]
  },
  MonthNotes: {
    key: 'key',
    cols: [['key', 'str'], ['text', 'str'], ['updatedAt', 'str'], ['syncedAt', 'str']]
  },
  Log: {
    cols: [['time', 'str'], ['level', 'str'], ['message', 'str']]
  }
};

// Các trường chỉ máy chủ được ghi (client gửi lên sẽ bị bỏ qua).
var SERVER_FIELDS = ['syncedAt', 'lastSentKey'];
var REPEAT_KINDS = ['once', 'yearlySolar', 'yearlyLunar', 'monthlyLunar'];
var MARKS = ['circle', 'dot', 'underline', 'none'];

// ───────────────────────── HTTP ─────────────────────────

function doGet() {
  return json_({ ok: true, service: 'lichban', time: nowIso_() });
}

function doPost(e) {
  var body;
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    return json_({ ok: false, code: 'BAD_REQUEST', message: 'Body không phải JSON.' });
  }
  try {
    checkPassword_(body.password);
    return json_({ ok: true, data: dispatch_(body.action, body.payload || {}) });
  } catch (err) {
    if (err instanceof ApiError) return json_({ ok: false, code: err.code, message: err.message });
    console.error(err && err.stack ? err.stack : err);
    log_('ERROR', String(err && err.stack ? err.stack : err));
    return json_({ ok: false, code: 'SERVER', message: 'Lỗi máy chủ: ' + err });
  }
}

function dispatch_(action, p) {
  switch (action) {
    case 'getAll': return getAll_(p.since);
    case 'upsertNote': return withLock_(function () { return upsert_('Notes', cleanNote_(p)); });
    case 'deleteNote': return withLock_(function () { return deleteNote_(requireId_(p.id)); });
    case 'upsertReminder': return withLock_(function () { return upsert_('Reminders', cleanReminder_(p)); });
    case 'deleteReminder': return withLock_(function () { return softDelete_('Reminders', requireId_(p.id)); });
    case 'upsertMonthNote': return withLock_(function () { return upsert_('MonthNotes', cleanMonthNote_(p)); });
    case 'testTelegram':
      sendTelegram_('✅ <b>Lịch Bàn</b> kết nối Telegram thành công.');
      return { sent: true };
    default:
      throw new ApiError('BAD_REQUEST', 'Action không hợp lệ: ' + action);
  }
}

class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function checkPassword_(given) {
  var expected = PropertiesService.getScriptProperties().getProperty('APP_PASSWORD');
  if (!expected) return;
  var cache = CacheService.getScriptCache();
  var fails = Number(cache.get('pwFails') || 0);
  if (fails >= MAX_FAILS) {
    throw new ApiError('LOCKED', 'Nhập sai mật khẩu quá nhiều lần. Thử lại sau ' + (LOCK_SECONDS / 60) + ' phút.');
  }
  given = String(given || '');
  var diff = given.length === expected.length ? 0 : 1;
  for (var i = 0; i < expected.length; i++) {
    diff |= expected.charCodeAt(i) ^ (given.charCodeAt(i) || 0);
  }
  if (diff !== 0) {
    if (given) cache.put('pwFails', String(fails + 1), LOCK_SECONDS); // để trống không tính là đoán sai
    throw new ApiError('UNAUTHORIZED', 'Mật khẩu không đúng.');
  }
}

// ───────────────────────── Sheet ─────────────────────────

function spreadsheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) return ss;
  var id = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  if (!id) {
    throw new ApiError('CONFIG', 'Thiếu Script Property SHEET_ID (đoạn giữa /d/ và /edit trong URL của Google Sheet).');
  }
  return SpreadsheetApp.openById(id);
}

var sheetMemo_ = {};

/** Lấy tab, tự tạo + thêm cột còn thiếu. Mọi ô định dạng văn bản để Sheet không tự đổi kiểu. */
function sheet_(name) {
  if (sheetMemo_[name]) return sheetMemo_[name];
  var ss = spreadsheet_();
  var sh = ss.getSheetByName(name);
  var names = SCHEMA[name].cols.map(function (c) { return c[0]; });
  if (!sh) {
    sh = ss.insertSheet(name);
    sh.getRange(1, 1, sh.getMaxRows(), names.length).setNumberFormat('@');
    sh.getRange(1, 1, 1, names.length).setValues([names]).setFontWeight('bold');
    sh.setFrozenRows(1);
  } else {
    var lastCol = Math.max(sh.getLastColumn(), 1);
    var header = sh.getRange(1, 1, 1, lastCol).getValues()[0].map(String);
    var missing = names.filter(function (n) { return header.indexOf(n) < 0; });
    if (missing.length) {
      var start = header.filter(String).length + 1;
      sh.getRange(1, start, sh.getMaxRows(), missing.length).setNumberFormat('@');
      sh.getRange(1, start, 1, missing.length).setValues([missing]).setFontWeight('bold');
    }
  }
  sheetMemo_[name] = sh;
  return sh;
}

function header_(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
}

function typeOf_(table, col) {
  var c = SCHEMA[table].cols.filter(function (x) { return x[0] === col; })[0];
  return c ? c[1] : 'str';
}

function fromCell_(v, type) {
  if (type === 'int') return v === '' || v === null ? null : Number(v);
  if (type === 'bool') return String(v).toUpperCase() === 'TRUE';
  if (v instanceof Date) return v.toISOString();
  return v === null || v === undefined ? '' : String(v);
}

function toCell_(v, type) {
  if (type === 'bool') return v ? 'TRUE' : 'FALSE';
  if (v === null || v === undefined) return '';
  return String(v);
}

/** Đọc toàn bộ tab → [{ obj, row }] (row tính từ 1, gồm cả header). */
function readTable_(table) {
  var sh = sheet_(table);
  var lastRow = sh.getLastRow();
  if (lastRow < 2) return [];
  var header = header_(sh);
  var values = sh.getRange(2, 1, lastRow - 1, header.length).getValues();
  return values.map(function (r, i) {
    var obj = {};
    header.forEach(function (h, j) { if (h) obj[h] = fromCell_(r[j], typeOf_(table, h)); });
    return { obj: obj, row: i + 2 };
  }).filter(function (x) {
    var key = SCHEMA[table].key;
    return !key || x.obj[key];
  });
}

function writeRow_(table, row, obj) {
  var sh = sheet_(table);
  var header = header_(sh);
  var values = header.map(function (h) { return toCell_(obj[h], typeOf_(table, h)); });
  var target = row || sh.getLastRow() + 1;
  sh.getRange(target, 1, 1, header.length).setNumberFormat('@').setValues([values]);
}

function findByKey_(table, keyValue) {
  var key = SCHEMA[table].key;
  return readTable_(table).filter(function (x) { return x.obj[key] === keyValue; })[0] || null;
}

/** Ghi đè theo khoá, last-write-wins theo updatedAt. Trả về bản ghi đang lưu. */
function upsert_(table, incoming) {
  var key = SCHEMA[table].key;
  var existing = findByKey_(table, incoming[key]);
  if (existing && existing.obj.updatedAt && incoming.updatedAt && existing.obj.updatedAt > incoming.updatedAt) {
    return existing.obj; // bản trên Sheet mới hơn → giữ nguyên
  }
  var obj = Object.assign({}, existing ? existing.obj : {}, incoming);
  SERVER_FIELDS.forEach(function (f) {
    if (existing && f in existing.obj) obj[f] = existing.obj[f];
    else if (f !== 'syncedAt') obj[f] = '';
  });
  obj.syncedAt = nowIso_();
  writeRow_(table, existing ? existing.row : null, obj);
  return obj;
}

function softDelete_(table, id) {
  var existing = findByKey_(table, id);
  if (!existing) return { id: id };
  var obj = existing.obj;
  obj.deleted = true;
  obj.updatedAt = nowIso_();
  obj.syncedAt = obj.updatedAt;
  writeRow_(table, existing.row, obj);
  return obj;
}

function deleteNote_(id) {
  var note = softDelete_('Notes', id);
  readTable_('Reminders').forEach(function (x) {
    if (x.obj.noteId === id && !x.obj.deleted) softDelete_('Reminders', x.obj.id);
  });
  return note;
}

function getAll_(since) {
  // Lùi 5 giây để không lỡ bản ghi ghi cùng lúc với lần đồng bộ trước.
  var cutoff = since ? new Date(new Date(since).getTime() - 5000).toISOString() : '';
  var pick = function (table) {
    return readTable_(table).map(function (x) { return x.obj; })
      .filter(function (o) { return !cutoff || o.syncedAt > cutoff; })
      .map(function (o) { var c = Object.assign({}, o); delete c.lastSentKey; return c; });
  };
  return {
    notes: pick('Notes'),
    reminders: pick('Reminders'),
    monthNotes: pick('MonthNotes'),
    serverTime: nowIso_()
  };
}

// ───────────────────────── Kiểm tra dữ liệu vào ─────────────────────────

function requireId_(id) {
  if (!id || typeof id !== 'string' || id.length > 64) throw new ApiError('BAD_REQUEST', 'Thiếu id.');
  return id;
}

function intIn_(v, min, max, name) {
  var n = Number(v);
  if (!isFinite(n) || Math.floor(n) !== n || n < min || n > max) {
    throw new ApiError('BAD_REQUEST', 'Giá trị không hợp lệ: ' + name);
  }
  return n;
}

function cleanNote_(p) {
  return {
    id: requireId_(p.id),
    year: intIn_(p.year, 1900, 2199, 'year'),
    month: intIn_(p.month, 1, 12, 'month'),
    day: intIn_(p.day, 1, 31, 'day'),
    title: String(p.title || '').slice(0, 200),
    body: String(p.body || '').slice(0, 5000),
    mark: MARKS.indexOf(p.mark) >= 0 ? p.mark : 'circle',
    color: /^#[0-9a-fA-F]{6}$/.test(p.color || '') ? p.color : '#C42B2B',
    createdAt: String(p.createdAt || nowIso_()),
    updatedAt: String(p.updatedAt || nowIso_()),
    deleted: !!p.deleted
  };
}

function cleanReminder_(p) {
  var kind = REPEAT_KINDS.indexOf(p.repeatKind) >= 0 ? p.repeatKind : 'once';
  var lunar = kind === 'yearlyLunar' || kind === 'monthlyLunar';
  return {
    id: requireId_(p.id),
    noteId: requireId_(p.noteId),
    repeatKind: kind,
    hour: intIn_(p.hour, 0, 23, 'hour'),
    minute: intIn_(p.minute, 0, 59, 'minute'),
    leadDays: intIn_(p.leadDays || 0, 0, 60, 'leadDays'),
    lunarDay: lunar ? intIn_(p.lunarDay, 1, 30, 'lunarDay') : null,
    lunarMonth: kind === 'yearlyLunar' ? intIn_(p.lunarMonth, 1, 12, 'lunarMonth') : null,
    enabled: p.enabled !== false,
    updatedAt: String(p.updatedAt || nowIso_()),
    deleted: !!p.deleted
  };
}

function cleanMonthNote_(p) {
  if (!/^\d{4}-\d{2}$/.test(String(p.key || ''))) throw new ApiError('BAD_REQUEST', 'key phải dạng yyyy-mm.');
  return {
    key: p.key,
    text: String(p.text || '').slice(0, 5000),
    updatedAt: String(p.updatedAt || nowIso_())
  };
}

// ───────────────────────── Nhắc nhở ─────────────────────────

/** Trigger mỗi giờ: gửi các lần nhắc rơi vào 24 giờ vừa qua mà chưa gửi. */
function hourlyTick() {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(30000)) return;
  try {
    var now = new Date();
    var to = partsOf_(now);
    var from = partsOf_(new Date(now.getTime() - 24 * 3600 * 1000));
    var notes = {};
    readTable_('Notes').forEach(function (x) { notes[x.obj.id] = x.obj; });

    readTable_('Reminders').forEach(function (x) {
      var rem = x.obj;
      var note = notes[rem.noteId];
      if (!rem.enabled || rem.deleted || !note || note.deleted) return;
      try {
        var fires = Occurrence.between(rem, note, from, to);
        if (!fires.length) return;
        var fire = fires[fires.length - 1];
        if (rem.lastSentKey === fire.key) return;
        sendTelegram_(reminderMessage_(note, fire));
        rem.lastSentKey = fire.key;
        writeRow_('Reminders', x.row, rem);
      } catch (err) {
        log_('ERROR', 'Nhắc ' + rem.id + ': ' + err);
      }
    });
  } finally {
    lock.releaseLock();
  }
}

/** Trigger mỗi sáng: tóm tắt hôm nay + 7 ngày tới. Không gửi nếu không có gì. */
function morningDigest() {
  var today = partsOf_(new Date());
  var notesByDay = {};
  readTable_('Notes').forEach(function (x) {
    var n = x.obj;
    if (n.deleted) return;
    var k = MonthGrid.key({ y: n.year, m: n.month, d: n.day });
    (notesByDay[k] = notesByDay[k] || []).push(n);
  });

  var lines = [];
  var todayLunar = Lunar.toLunar(today);
  lines.push('☀️ <b>' + CanChi.weekday(today) + ', ' + dmy_(today) + '</b>');
  lines.push(esc_(CanChi.lunarLong(todayLunar)));

  var hasContent = false;
  var todayItems = dayItems_(today, todayLunar, notesByDay);
  if (todayItems.length) {
    hasContent = true;
    lines.push('');
    lines.push('<b>Hôm nay</b>');
    lines = lines.concat(todayItems);
  }

  var upcoming = [];
  for (var i = 1; i <= 7; i++) {
    var s = MonthGrid.addDays(today, i);
    var items = dayItems_(s, Lunar.toLunar(s), notesByDay);
    if (items.length) {
      upcoming.push('<i>' + CanChi.weekday(s) + ' ' + s.d + '/' + s.m + '</i>');
      upcoming = upcoming.concat(items);
    }
  }
  if (upcoming.length) {
    hasContent = true;
    lines.push('');
    lines.push('<b>7 ngày tới</b>');
    lines = lines.concat(upcoming);
  }
  if (hasContent) sendTelegram_(lines.join('\n'));
}

function dayItems_(s, lunar, notesByDay) {
  var out = [];
  Holidays.forDay(s, lunar).forEach(function (h) { out.push('🎌 ' + esc_(h.name)); });
  (notesByDay[MonthGrid.key(s)] || []).forEach(function (n) { out.push('📝 ' + esc_(n.title || '(không tiêu đề)')); });
  return out;
}

function reminderMessage_(note, fire) {
  var ev = fire.event;
  var lunar = Lunar.toLunar(ev);
  var daysLeft = Lunar.jdFromDate(ev) - Lunar.jdFromDate(fire);
  var lines = [
    '🔔 <b>' + esc_(note.title || 'Nhắc nhở') + '</b>',
    '📅 ' + CanChi.weekday(ev) + ', ' + dmy_(ev) + ' · ' + lunar.day + '/' + lunar.month + (lunar.leap ? ' nhuận' : '') + ' âm lịch',
    daysLeft > 0 ? '⏰ Còn ' + daysLeft + ' ngày nữa' : '⏰ Hôm nay'
  ];
  if (note.body) lines.push('', esc_(String(note.body).slice(0, 500)));
  return lines.join('\n');
}

// ───────────────────────── Telegram ─────────────────────────

function sendTelegram_(html) {
  var props = PropertiesService.getScriptProperties();
  var token = props.getProperty('TELEGRAM_BOT_TOKEN');
  var chatId = props.getProperty('TELEGRAM_CHAT_ID');
  if (!token || !chatId) {
    throw new ApiError('CONFIG', 'Chưa đặt TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID trong Script Properties.');
  }
  var res = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({ chat_id: chatId, text: html, parse_mode: 'HTML', disable_web_page_preview: true }),
    muteHttpExceptions: true
  });
  if (res.getResponseCode() !== 200) {
    throw new ApiError('TELEGRAM', 'Telegram trả lỗi ' + res.getResponseCode() + ': ' + res.getContentText().slice(0, 200));
  }
}

function esc_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ───────────────────────── Tiện ích ─────────────────────────

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) throw new ApiError('BUSY', 'Máy chủ đang bận, thử lại sau vài giây.');
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function nowIso_() {
  return new Date().toISOString();
}

function partsOf_(date) {
  var a = Utilities.formatDate(date, TZ, 'yyyy-M-d-H-m').split('-').map(Number);
  return { y: a[0], m: a[1], d: a[2], hour: a[3], minute: a[4] };
}

function dmy_(s) {
  return ('0' + s.d).slice(-2) + '/' + ('0' + s.m).slice(-2) + '/' + s.y;
}

function log_(level, message) {
  try {
    var sh = sheet_('Log');
    writeRow_('Log', null, { time: nowIso_(), level: level, message: String(message).slice(0, 1000) });
    var extra = sh.getLastRow() - 1 - LOG_MAX_ROWS;
    if (extra > 50) sh.deleteRows(2, extra);
  } catch (err) {
    console.error(err);
  }
}

// ───────────────────────── Chạy tay trong editor ─────────────────────────

/** Tạo các tab + header. Chạy lại bao nhiêu lần cũng được. */
function setup() {
  ['Notes', 'Reminders', 'MonthNotes', 'Log'].forEach(sheet_);
  Logger.log('✅ Đã tạo/kiểm tra các tab trong: ' + spreadsheet_().getUrl());
}

/** Kiểm tra đọc/ghi Sheet và lịch âm. */
function selfTest() {
  var l = Lunar.toLunar({ y: 2026, m: 10, d: 10 });
  if (l.day !== 1 || l.month !== 9) throw new Error('Âm lịch sai: ' + JSON.stringify(l));

  var id = 'selftest-' + Utilities.getUuid();
  upsert_('Notes', cleanNote_({ id: id, year: 2026, month: 10, day: 10, title: 'selfTest' }));
  var found = findByKey_('Notes', id);
  if (!found || found.obj.title !== 'selfTest') throw new Error('Không đọc lại được ghi chú vừa ghi.');
  sheet_('Notes').deleteRow(found.row);
  Logger.log('✅ selfTest OK — đọc/ghi Sheet và âm lịch đều đúng.');
}

function testTelegram() {
  sendTelegram_('✅ <b>Lịch Bàn</b> kết nối Telegram thành công.');
  Logger.log('✅ Đã gửi tin thử. Kiểm tra Telegram.');
}

/** Tạo trigger hourlyTick (mỗi giờ) + morningDigest (6–7h sáng). Chạy lại không bị trùng. */
function installTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    var fn = t.getHandlerFunction();
    if (fn === 'hourlyTick' || fn === 'morningDigest') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('hourlyTick').timeBased().everyHours(1).create();
  ScriptApp.newTrigger('morningDigest').timeBased().everyDays(1).atHour(6).inTimezone(TZ).create();
  Logger.log('✅ Đã tạo trigger hourlyTick (mỗi giờ) và morningDigest (6–7h sáng).');
}
