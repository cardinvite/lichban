/* Lưới tháng: tuần bắt đầu Thứ Hai, kèm số tuần ISO 8601. */
const MonthGrid = (() => {
  const toUtc = (s) => Date.UTC(s.y, s.m - 1, s.d);
  const fromUtc = (t) => { const x = new Date(t); return { y: x.getUTCFullYear(), m: x.getUTCMonth() + 1, d: x.getUTCDate() }; };
  const addDays = (s, n) => fromUtc(toUtc(s) + n * 86400000);
  const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  const isoWeekday = (s) => (new Date(toUtc(s)).getUTCDay() + 6) % 7; // 0 = Thứ Hai
  const sameDay = (a, b) => !!a && !!b && a.y === b.y && a.m === b.m && a.d === b.d;
  const key = (s) => s.y + '-' + String(s.m).padStart(2, '0') + '-' + String(s.d).padStart(2, '0');
  const compare = (a, b) => toUtc(a) - toUtc(b);

  function isoWeek(s) {
    const thursday = addDays(s, 3 - isoWeekday(s));
    return 1 + Math.floor((toUtc(thursday) - Date.UTC(thursday.y, 0, 1)) / 86400000 / 7);
  }

  /** Các tuần (4–6) phủ tháng: [{ week, days: [{ y, m, d, inMonth }] }] */
  function build(y, m) {
    const first = { y: y, m: m, d: 1 };
    const last = { y: y, m: m, d: daysInMonth(y, m) };
    let cur = addDays(first, -isoWeekday(first));
    const weeks = [];
    while (compare(cur, last) <= 0) {
      const days = [];
      for (let i = 0; i < 7; i++) {
        days.push({ y: cur.y, m: cur.m, d: cur.d, inMonth: cur.m === m });
        cur = addDays(cur, 1);
      }
      weeks.push({ week: isoWeek(days[0]), days: days });
    }
    return weeks;
  }

  function shiftMonth(y, m, delta) {
    const t = y * 12 + (m - 1) + delta;
    return { y: Math.floor(t / 12), m: ((t % 12) + 12) % 12 + 1 };
  }

  return { build, isoWeek, isoWeekday, addDays, daysInMonth, sameDay, key, compare, shiftMonth };
})();
if (typeof module !== 'undefined') module.exports = MonthGrid;
