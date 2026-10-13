// ⚠️ FILE SINH TỰ ĐỘNG từ docs/js/shared bằng scripts/build-gas.sh — đừng sửa tay.
// Sửa ở docs/js/shared rồi chạy lại: npm run build:gas

// ───── lunar.js ─────
/* Âm lịch Việt Nam — thuật toán Hồ Ngọc Đức, múi giờ UTC+7.
 * Chạy được ở trình duyệt, Google Apps Script và Node.
 * Ngày dương biểu diễn bằng { y, m, d } (số nguyên), không dùng Date. */
const Lunar = (() => {
  const TZ = 7;
  const PI = Math.PI;
  const INT = Math.floor;

  function jdFromDate(dd, mm, yy) {
    const a = INT((14 - mm) / 12);
    const y = yy + 4800 - a;
    const m = mm + 12 * a - 3;
    let jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - INT(y / 100) + INT(y / 400) - 32045;
    if (jd < 2299161) jd = dd + INT((153 * m + 2) / 5) + 365 * y + INT(y / 4) - 32083;
    return jd;
  }

  function jdToDate(jd) {
    let b, c;
    if (jd > 2299160) {
      const a = jd + 32044;
      b = INT((4 * a + 3) / 146097);
      c = a - INT((b * 146097) / 4);
    } else {
      b = 0;
      c = jd + 32082;
    }
    const d = INT((4 * c + 3) / 1461);
    const e = c - INT((1461 * d) / 4);
    const m = INT((5 * e + 2) / 153);
    return {
      y: b * 100 + d - 4800 + INT(m / 10),
      m: m + 3 - 12 * INT(m / 10),
      d: e - INT((153 * m + 2) / 5) + 1,
    };
  }

  function newMoon(k) {
    const T = k / 1236.85;
    const T2 = T * T, T3 = T2 * T, dr = PI / 180;
    let jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
    jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * dr);
    const M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
    const Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
    const F = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
    let C1 = (0.1734 - 0.000393 * T) * Math.sin(M * dr) + 0.0021 * Math.sin(2 * dr * M);
    C1 = C1 - 0.4068 * Math.sin(Mpr * dr) + 0.0161 * Math.sin(dr * 2 * Mpr);
    C1 = C1 - 0.0004 * Math.sin(dr * 3 * Mpr);
    C1 = C1 + 0.0104 * Math.sin(dr * 2 * F) - 0.0051 * Math.sin(dr * (M + Mpr));
    C1 = C1 - 0.0074 * Math.sin(dr * (M - Mpr)) + 0.0004 * Math.sin(dr * (2 * F + M));
    C1 = C1 - 0.0004 * Math.sin(dr * (2 * F - M)) - 0.0006 * Math.sin(dr * (2 * F + Mpr));
    C1 = C1 + 0.0010 * Math.sin(dr * (2 * F - Mpr)) + 0.0005 * Math.sin(dr * (2 * Mpr + M));
    const deltat = T < -11
      ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
      : -0.000278 + 0.000265 * T + 0.000262 * T2;
    return jd1 + C1 - deltat;
  }

  function sunLongitude(jdn) {
    const T = (jdn - 2451545.0) / 36525;
    const T2 = T * T, dr = PI / 180;
    const M = 357.52910 + 35999.05030 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    const L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
    let DL = (1.914600 - 0.004817 * T - 0.000014 * T2) * Math.sin(dr * M);
    DL += (0.019993 - 0.000101 * T) * Math.sin(dr * 2 * M) + 0.000290 * Math.sin(dr * 3 * M);
    let L = (L0 + DL) * dr;
    L -= PI * 2 * INT(L / (PI * 2));
    return L;
  }

  const getSunLongitude = (dayNumber) => INT(sunLongitude(dayNumber - 0.5 - TZ / 24) / PI * 6);
  const getNewMoonDay = (k) => INT(newMoon(k) + 0.5 + TZ / 24);

  function getLunarMonth11(yy) {
    const off = jdFromDate(31, 12, yy) - 2415021;
    const k = INT(off / 29.530588853);
    let nm = getNewMoonDay(k);
    if (getSunLongitude(nm) >= 9) nm = getNewMoonDay(k - 1);
    return nm;
  }

  function getLeapMonthOffset(a11) {
    const k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
    let last, i = 1;
    let arc = getSunLongitude(getNewMoonDay(k + i));
    do {
      last = arc;
      i++;
      arc = getSunLongitude(getNewMoonDay(k + i));
    } while (arc !== last && i < 14);
    return i - 1;
  }

  /** Julian day → âm lịch: { day, month, year, leap, jd, monthStartJd } */
  function fromJd(dayNumber) {
    const k = INT((dayNumber - 2415021.076998695) / 29.530588853);
    let monthStart = getNewMoonDay(k + 1);
    if (monthStart > dayNumber) monthStart = getNewMoonDay(k);
    const yy = jdToDate(dayNumber).y;
    let a11 = getLunarMonth11(yy);
    let b11 = a11;
    let lunarYear;
    if (a11 >= monthStart) {
      lunarYear = yy;
      a11 = getLunarMonth11(yy - 1);
    } else {
      lunarYear = yy + 1;
      b11 = getLunarMonth11(yy + 1);
    }
    const day = dayNumber - monthStart + 1;
    const diff = INT((monthStart - a11) / 29);
    let leap = false;
    let month = diff + 11;
    if (b11 - a11 > 365) {
      const leapMonthDiff = getLeapMonthOffset(a11);
      if (diff >= leapMonthDiff) {
        month = diff + 10;
        if (diff === leapMonthDiff) leap = true;
      }
    }
    if (month > 12) month -= 12;
    if (month >= 11 && diff < 4) lunarYear -= 1;
    return { day, month, year: lunarYear, leap, jd: dayNumber, monthStartJd: monthStart };
  }

  function toLunar(s) {
    return fromJd(jdFromDate(s.d, s.m, s.y));
  }

  /** Âm → dương. null nếu ngày âm không tồn tại (sai tháng nhuận, ngày 30 của tháng thiếu). */
  function toSolar(l) {
    const day = l.day, month = l.month, year = l.year;
    const leap = !!l.leap;
    let a11, b11;
    if (month < 11) {
      a11 = getLunarMonth11(year - 1);
      b11 = getLunarMonth11(year);
    } else {
      a11 = getLunarMonth11(year);
      b11 = getLunarMonth11(year + 1);
    }
    const k = INT(0.5 + (a11 - 2415021.076998695) / 29.530588853);
    let off = month - 11;
    if (off < 0) off += 12;
    if (b11 - a11 > 365) {
      const leapOff = getLeapMonthOffset(a11);
      let leapMonth = leapOff - 2;
      if (leapMonth < 0) leapMonth += 12;
      if (leap && month !== leapMonth) return null;
      if (leap || off >= leapOff) off += 1;
    } else if (leap) {
      return null;
    }
    const jd = getNewMoonDay(k + off) + day - 1;
    const back = fromJd(jd);
    if (back.day !== day || back.month !== month || back.leap !== leap) return null;
    return jdToDate(jd);
  }

  /** Độ dài (29/30) của tháng âm chứa ngày jd. */
  function monthLengthAtJd(jd) {
    const start = fromJd(jd).monthStartJd;
    return fromJd(start + 29).day === 30 ? 30 : 29;
  }

  function monthLength(month, year, leap) {
    const s = toSolar({ day: 1, month: month, year: year, leap: !!leap });
    if (!s) return 0;
    return monthLengthAtJd(jdFromDate(s.d, s.m, s.y));
  }

  /** Tháng nhuận của năm âm, hoặc null. */
  function leapMonth(year) {
    for (let m = 1; m <= 12; m++) {
      if (toSolar({ day: 1, month: m, year: year, leap: true })) return m;
    }
    return null;
  }

  return {
    jdFromDate: (s) => jdFromDate(s.d, s.m, s.y),
    jdToDate,
    fromJd,
    toLunar,
    toSolar,
    monthLength,
    monthLengthAtJd,
    leapMonth,
  };
})();
if (typeof module !== 'undefined') module.exports = Lunar;

// ───── canchi.js ─────
/* Can chi, tên tháng, tên thứ (tiếng Việt). */
const CanChi = (() => {
  const CAN = ['Giáp', 'Ất', 'Bính', 'Đinh', 'Mậu', 'Kỷ', 'Canh', 'Tân', 'Nhâm', 'Quý'];
  const CHI = ['Tý', 'Sửu', 'Dần', 'Mão', 'Thìn', 'Tỵ', 'Ngọ', 'Mùi', 'Thân', 'Dậu', 'Tuất', 'Hợi'];
  const MONTH_VI = ['Tháng Một', 'Tháng Hai', 'Tháng Ba', 'Tháng Tư', 'Tháng Năm', 'Tháng Sáu',
    'Tháng Bảy', 'Tháng Tám', 'Tháng Chín', 'Tháng Mười', 'Tháng Mười Một', 'Tháng Mười Hai'];
  const MONTH_EN = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST',
    'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
  const LUNAR_MONTH = ['Giêng', 'Hai', 'Ba', 'Tư', 'Năm', 'Sáu', 'Bảy', 'Tám', 'Chín', 'Mười', 'Một', 'Chạp'];
  const WEEKDAY = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

  const year = (y) => CAN[(y + 6) % 10] + ' ' + CHI[(y + 8) % 12];
  const monthVi = (m) => MONTH_VI[m - 1];
  const monthEn = (m) => MONTH_EN[m - 1];
  const lunarMonthName = (m) => LUNAR_MONTH[m - 1];
  const weekday = (s) => WEEKDAY[new Date(Date.UTC(s.y, s.m - 1, s.d)).getUTCDay()];

  /** "Mùng 1 tháng Chín năm Bính Ngọ" */
  function lunarLong(l) {
    const dayText = l.day <= 10 ? 'Mùng ' + l.day : (l.day === 15 ? 'Rằm' : 'Ngày ' + l.day);
    return dayText + ' tháng ' + lunarMonthName(l.month) + (l.leap ? ' nhuận' : '') + ' năm ' + year(l.year);
  }

  return { year, monthVi, monthEn, lunarMonthName, weekday, lunarLong };
})();
if (typeof module !== 'undefined') module.exports = CanChi;

// ───── holidays.js ─────
/* Ngày lễ Việt Nam. Sửa LIST để thêm/bớt. dayOff = ngày nghỉ (tô đỏ số ngày). */
const Holidays = (() => {
  const L = (typeof Lunar !== 'undefined') ? Lunar : require('./lunar.js');

  const LIST = [
    { type: 'solar', m: 1, d: 1, name: 'Tết Dương lịch', dayOff: true },
    { type: 'solar', m: 2, d: 3, name: 'Thành lập Đảng CSVN' },
    { type: 'solar', m: 2, d: 14, name: 'Lễ Tình nhân' },
    { type: 'solar', m: 3, d: 8, name: 'Quốc tế Phụ nữ' },
    { type: 'solar', m: 4, d: 30, name: 'Giải phóng miền Nam', dayOff: true },
    { type: 'solar', m: 5, d: 1, name: 'Quốc tế Lao động', dayOff: true },
    { type: 'solar', m: 6, d: 1, name: 'Quốc tế Thiếu nhi' },
    { type: 'solar', m: 9, d: 2, name: 'Quốc khánh', dayOff: true },
    { type: 'solar', m: 10, d: 10, name: 'Giải phóng Thủ đô' },
    { type: 'solar', m: 10, d: 13, name: 'Doanh nhân Việt Nam' },
    { type: 'solar', m: 10, d: 20, name: 'Phụ nữ Việt Nam' },
    { type: 'solar', m: 11, d: 20, name: 'Nhà giáo Việt Nam' },
    { type: 'solar', m: 12, d: 22, name: 'Quân đội Nhân dân' },
    { type: 'solar', m: 12, d: 24, name: 'Giáng sinh' },
    { type: 'lunar', m: 1, d: 1, name: 'Tết Nguyên Đán', dayOff: true },
    { type: 'lunar', m: 1, d: 2, name: 'Mùng 2 Tết', dayOff: true },
    { type: 'lunar', m: 1, d: 3, name: 'Mùng 3 Tết', dayOff: true },
    { type: 'lunar', m: 1, d: 15, name: 'Rằm tháng Giêng' },
    { type: 'lunar', m: 3, d: 10, name: 'Giỗ Tổ Hùng Vương', dayOff: true },
    { type: 'lunar', m: 4, d: 15, name: 'Phật đản' },
    { type: 'lunar', m: 5, d: 5, name: 'Tết Đoan Ngọ' },
    { type: 'lunar', m: 7, d: 15, name: 'Vu Lan' },
    { type: 'lunar', m: 8, d: 15, name: 'Tết Trung thu' },
    { type: 'lunar', m: 12, d: 23, name: 'Ông Công Ông Táo' },
  ];

  /** Ngày lễ của ngày dương s (truyền sẵn lunar nếu đã tính để khỏi tính lại). */
  function forDay(s, lunar) {
    const l = lunar || L.toLunar(s);
    const out = [];
    for (const h of LIST) {
      if (h.type === 'solar' && h.m === s.m && h.d === s.d) out.push(h);
      if (h.type === 'lunar' && !l.leap && h.m === l.month && h.d === l.day) out.push(h);
    }
    if (l.month === 12 && !l.leap) {
      const next = L.fromJd(l.jd + 1);
      if (next.day === 1 && next.month === 1) out.push({ type: 'lunar', name: 'Giao thừa', dayOff: true });
    }
    return out;
  }

  return { LIST, forDay };
})();
if (typeof module !== 'undefined') module.exports = Holidays;

// ───── monthGrid.js ─────
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

// ───── occurrence.js ─────
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
