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
