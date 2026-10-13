const test = require('node:test');
const assert = require('node:assert/strict');
const Occ = require('../docs/js/shared/occurrence.js');
const Lunar = require('../docs/js/shared/lunar.js');

const now = { y: 2026, m: 10, d: 12, hour: 9, minute: 0 };
const pick = (f) => f && { y: f.y, m: f.m, d: f.d, hour: f.hour, minute: f.minute };

test('một lần, ngày đã qua → rỗng', () => {
  const r = Occ.next({ repeatKind: 'once', hour: 8, minute: 0 }, { year: 2026, month: 10, day: 1 }, now, 3);
  assert.equal(r.length, 0);
});

test('một lần, ngày tương lai', () => {
  const r = Occ.next({ repeatKind: 'once', hour: 8, minute: 30 }, { year: 2026, month: 10, day: 12 }, { ...now, hour: 7 }, 3);
  assert.deepEqual(r.map(pick), [{ y: 2026, m: 10, d: 12, hour: 8, minute: 30 }]);
});

test('hằng năm dương 20/11', () => {
  const r = Occ.next({ repeatKind: 'yearlySolar', hour: 8, minute: 0 }, { year: 2020, month: 11, day: 20 }, now, 2);
  assert.deepEqual(r.map(pick), [
    { y: 2026, m: 11, d: 20, hour: 8, minute: 0 },
    { y: 2027, m: 11, d: 20, hour: 8, minute: 0 },
  ]);
});

test('hằng năm dương, nhắc trước 1 ngày', () => {
  const r = Occ.next({ repeatKind: 'yearlySolar', hour: 8, minute: 0, leadDays: 1 }, { year: 2020, month: 11, day: 20 }, now, 1);
  assert.deepEqual(pick(r[0]), { y: 2026, m: 11, d: 19, hour: 8, minute: 0 });
  assert.deepEqual(r[0].event, { y: 2026, m: 11, d: 20 });
});

test('29/2 hằng năm → năm không nhuận nhắc 28/2', () => {
  const r = Occ.next({ repeatKind: 'yearlySolar', hour: 8, minute: 0 }, { year: 2024, month: 2, day: 29 }, now, 2);
  assert.deepEqual(r.map((f) => `${f.d}/${f.m}/${f.y}`), ['28/2/2027', '29/2/2028']);
});

test('hằng năm âm 1/9', () => {
  const r = Occ.next({ repeatKind: 'yearlyLunar', lunarDay: 1, lunarMonth: 9, hour: 8, minute: 0 },
    { year: 2026, month: 10, day: 10 }, { y: 2026, m: 10, d: 1, hour: 0, minute: 0 }, 2);
  assert.deepEqual(pick(r[0]), { y: 2026, m: 10, d: 10, hour: 8, minute: 0 });
  assert.deepEqual(r[1].event, Lunar.toSolar({ day: 1, month: 9, year: 2027 }));
});

test('hằng năm âm 30 → tháng thiếu dùng ngày 29', () => {
  // tháng 8 âm 2026 thiếu
  const r = Occ.next({ repeatKind: 'yearlyLunar', lunarDay: 30, lunarMonth: 8, hour: 8, minute: 0 },
    { year: 2025, month: 1, day: 1 }, { y: 2026, m: 9, d: 1, hour: 0, minute: 0 }, 1);
  assert.deepEqual(r[0].event, Lunar.toSolar({ day: 29, month: 8, year: 2026 }));
});

test('hằng tháng âm ngày rằm', () => {
  const r = Occ.next({ repeatKind: 'monthlyLunar', lunarDay: 15, hour: 7, minute: 0 },
    { year: 2026, month: 1, day: 1 }, now, 3);
  for (const f of r) assert.equal(Lunar.toLunar(f).day, 15);
  assert.deepEqual(pick(r[0]), { ...Lunar.toSolar({ day: 15, month: 9, year: 2026 }), hour: 7, minute: 0 });
  assert.equal(r.length, 3);
});

test('between: cửa sổ 24 giờ qua', () => {
  const rem = { repeatKind: 'yearlySolar', hour: 8, minute: 0 };
  const note = { year: 2020, month: 11, day: 20 };
  const hit = Occ.between(rem, note, { y: 2026, m: 11, d: 19, hour: 10, minute: 0 }, { y: 2026, m: 11, d: 20, hour: 10, minute: 0 });
  assert.equal(hit.length, 1);
  assert.equal(hit[0].key, '2026-11-20');
  // mốc from không tính (đã xử lý ở lần chạy trước)
  const miss = Occ.between(rem, note, { y: 2026, m: 11, d: 20, hour: 8, minute: 0 }, { y: 2026, m: 11, d: 21, hour: 7, minute: 0 });
  assert.equal(miss.length, 0);
});
