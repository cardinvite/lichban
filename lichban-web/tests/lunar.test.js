const test = require('node:test');
const assert = require('node:assert/strict');
const Lunar = require('../docs/js/shared/lunar.js');
const CanChi = require('../docs/js/shared/canchi.js');
const MonthGrid = require('../docs/js/shared/monthGrid.js');
const Holidays = require('../docs/js/shared/holidays.js');

// Lấy từ tờ lịch thật tháng 10/2026
const CASES = [
  [[2026, 9, 28], [18, 8]],
  [[2026, 10, 1], [21, 8]],
  [[2026, 10, 5], [25, 8]],
  [[2026, 10, 10], [1, 9]],
  [[2026, 10, 11], [2, 9]],
  [[2026, 10, 18], [9, 9]],
  [[2026, 10, 26], [17, 9]],
  [[2026, 10, 31], [22, 9]],
  [[2026, 11, 1], [23, 9]],
];

test('dương → âm khớp tờ lịch tháng 10/2026', () => {
  for (const [[y, m, d], [ld, lm]] of CASES) {
    const l = Lunar.toLunar({ y, m, d });
    assert.equal(`${l.day}/${l.month}`, `${ld}/${lm}`, `${d}/${m}/${y}`);
    assert.equal(l.year, 2026);
    assert.equal(l.leap, false);
  }
});

test('độ dài tháng âm 2026: tháng 8 thiếu, tháng 9 đủ', () => {
  assert.equal(Lunar.monthLength(8, 2026, false), 29);
  assert.equal(Lunar.monthLength(9, 2026, false), 30);
});

test('Tết Nguyên Đán', () => {
  assert.deepEqual(Lunar.toSolar({ day: 1, month: 1, year: 2024 }), { y: 2024, m: 2, d: 10 });
  assert.deepEqual(Lunar.toSolar({ day: 1, month: 1, year: 2025 }), { y: 2025, m: 1, d: 29 });
  assert.deepEqual(Lunar.toSolar({ day: 1, month: 1, year: 2026 }), { y: 2026, m: 2, d: 17 });
});

test('tháng nhuận', () => {
  assert.equal(Lunar.leapMonth(2020), 4);
  assert.equal(Lunar.leapMonth(2023), 2);
  assert.equal(Lunar.leapMonth(2025), 6);
  assert.equal(Lunar.leapMonth(2026), null);
  assert.equal(Lunar.toSolar({ day: 1, month: 7, year: 2025, leap: true }), null);
});

test('ngày 30 của tháng thiếu không tồn tại', () => {
  assert.equal(Lunar.toSolar({ day: 30, month: 8, year: 2026 }), null);
  assert.ok(Lunar.toSolar({ day: 30, month: 9, year: 2026 }));
});

test('chuyển đổi hai chiều 2020–2035', () => {
  let jd = Lunar.jdFromDate({ y: 2020, m: 1, d: 1 });
  const end = Lunar.jdFromDate({ y: 2035, m: 12, d: 31 });
  for (; jd <= end; jd++) {
    const s = Lunar.jdToDate(jd);
    const l = Lunar.toLunar(s);
    assert.deepEqual(Lunar.toSolar(l), s, JSON.stringify(s));
  }
});

test('can chi năm', () => {
  assert.equal(CanChi.year(2026), 'Bính Ngọ');
  assert.equal(CanChi.year(2025), 'Ất Tỵ');
  assert.equal(CanChi.year(2024), 'Giáp Thìn');
});

test('lưới tháng 10/2026 giống tờ lịch', () => {
  const weeks = MonthGrid.build(2026, 10);
  assert.equal(weeks.length, 5);
  assert.deepEqual(weeks.map((w) => w.week), [40, 41, 42, 43, 44]);
  assert.deepEqual(weeks[0].days[0], { y: 2026, m: 9, d: 28, inMonth: false });
  assert.deepEqual(weeks[4].days[6], { y: 2026, m: 11, d: 1, inMonth: false });
});

test('ngày lễ', () => {
  const names = (y, m, d) => Holidays.forDay({ y, m, d }).map((h) => h.name);
  assert.ok(names(2026, 10, 20).includes('Phụ nữ Việt Nam'));
  assert.ok(names(2026, 2, 17).includes('Tết Nguyên Đán'));
  assert.ok(names(2026, 2, 16).includes('Giao thừa'));
  assert.ok(names(2026, 9, 25).includes('Tết Trung thu')); // 15/8 âm 2026
});
