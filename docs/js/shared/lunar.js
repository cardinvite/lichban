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
