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
