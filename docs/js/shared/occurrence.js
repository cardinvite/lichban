/* Tính các lần nhắc của một reminder. Logic thuần, dùng chung cho web và Apps Script.
 * Thời điểm biểu diễn bằng parts { y, m, d, hour, minute } theo giờ Việt Nam.
 *
 * reminder: { repeatKind: 'once'|'yearlySolar'|'yearlyLunar'|'monthlyLunar',
 *             hour, minute, leadDays, lunarDay, lunarMonth }
 * note:     { year, month, day }  (ngày dương của ghi chú) */
const Occurrence = (() => {
  const L = (typeof Lunar !== 'undefined') ? Lunar : require('./lunar.js');

  const num = (v, def) => { const n = Number(v); return isFinite(n) && v !== '' && v !== null ? n : def; };
  const keyOf = (p) => ((p.y * 100 + p.m) * 100 + p.d) * 10000 + (p.hour || 0) * 100 + (p.minute || 0);
  const jdOf = (p) => L.jdFromDate(p);
  const isLeapYear = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const dim = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
  const dateKey = (p) => p.y + '-' + String(p.m).padStart(2, '0') + '-' + String(p.d).padStart(2, '0');

  /** Các ngày sự kiện (dương) nằm trong [fromJd, toJd]. */
  function eventDates(rem, note, fromJd, toJd) {
    const out = [];
    const push = (s) => { if (s) { const j = jdOf(s); if (j >= fromJd && j <= toJd) out.push(s); } };
    const kind = rem.repeatKind || 'once';
    const ny = num(note.year), nm = num(note.month), nd = num(note.day);

    if (kind === 'once') {
      push({ y: ny, m: nm, d: nd });
    } else if (kind === 'yearlySolar') {
      const y0 = L.jdToDate(fromJd).y, y1 = L.jdToDate(toJd).y;
      for (let y = y0; y <= y1; y++) {
        let d = nd;
        if (nm === 2 && nd === 29 && !isLeapYear(y)) d = 28;
        push({ y: y, m: nm, d: Math.min(d, dim(y, nm)) });
      }
    } else if (kind === 'yearlyLunar') {
      const ld = num(rem.lunarDay), lm = num(rem.lunarMonth);
      if (!ld || !lm) return out;
      const ly0 = L.fromJd(fromJd).year - 1, ly1 = L.fromJd(toJd).year + 1;
      for (let ly = ly0; ly <= ly1; ly++) {
        const len = L.monthLength(lm, ly, false);
        if (!len) continue;
        push(L.toSolar({ day: Math.min(ld, len), month: lm, year: ly, leap: false }));
      }
    } else if (kind === 'monthlyLunar') {
      const ld = num(rem.lunarDay);
      if (!ld) return out;
      let ms = L.fromJd(fromJd).monthStartJd;
      while (ms <= toJd) {
        const len = L.monthLengthAtJd(ms);
        const jd = ms + Math.min(ld, len) - 1;
        if (jd >= fromJd && jd <= toJd) out.push(L.jdToDate(jd));
        ms += len;
      }
    }
    return out;
  }

  /** Các lần nhắc có thời điểm trong (from, to], sắp xếp tăng dần.
   *  Mỗi phần tử: { y, m, d, hour, minute, event: {y,m,d}, key: 'yyyy-mm-dd' } */
  function between(rem, note, from, to) {
    const lead = Math.max(0, num(rem.leadDays, 0));
    const hour = num(rem.hour, 8), minute = num(rem.minute, 0);
    const fromK = keyOf(from), toK = keyOf(to);
    const events = eventDates(rem, note, jdOf(from) + lead - 1, jdOf(to) + lead + 1);
    const out = [];
    for (const ev of events) {
      const f = L.jdToDate(jdOf(ev) - lead);
      const fire = { y: f.y, m: f.m, d: f.d, hour: hour, minute: minute };
      const k = keyOf(fire);
      if (k > fromK && k <= toK) {
        fire.event = ev;
        fire.key = dateKey(f);
        out.push(fire);
      }
    }
    out.sort((a, b) => keyOf(a) - keyOf(b));
    return out;
  }

  /** count lần nhắc kế tiếp sau thời điểm now. */
  function next(rem, note, now, count) {
    const n = count || 1;
    const horizon = rem.repeatKind === 'monthlyLunar' ? Math.ceil(n / 12) + 1 : n + 1;
    const to = { y: now.y + horizon, m: 12, d: 31, hour: 23, minute: 59 };
    return between(rem, note, now, to).slice(0, n);
  }

  return { between, next, eventDates, keyOf, dateKey };
})();
if (typeof module !== 'undefined') module.exports = Occurrence;
