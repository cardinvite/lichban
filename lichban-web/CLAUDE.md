# LichBan Web — ghi chú cho Claude Code

Lịch để bàn (PWA) trên GitHub Pages, dữ liệu ở Google Sheet qua Apps Script, nhắc nhở qua Telegram.
Code đã chạy đủ chức năng; file này mô tả cấu trúc để sửa tiếp cho đúng.

## Cấu trúc

```
docs/                     GitHub Pages phục vụ thư mục này (đường dẫn luôn TƯƠNG ĐỐI)
  index.html
  css/style.css           token màu ở :root, dark mode, breakpoint 899px
  sw.js                   cache app shell — TĂNG CACHE_VERSION mỗi lần sửa giao diện
  js/shared/*.js          ★ code dùng chung browser + Apps Script + Node (script thường, biến toàn cục)
    lunar.js              âm lịch Hồ Ngọc Đức, UTC+7 (KHÔNG dùng lịch chinese của Intl)
    canchi.js holidays.js monthGrid.js occurrence.js
  js/app.js               điều hướng tháng (#yyyy-mm), phím tắt, vuốt, đăng ký SW
  js/store.js             state + localStorage + hàng đợi đồng bộ (optimistic, last-write-wins)
  js/api.js               gọi Apps Script: POST text/plain, token trong body
  js/ui.js                h()/fill()/penMark()/toast
  js/views/month.js       header, lưới, lịch mini, ô NOTES
  js/views/dayDialog.js   chi tiết ngày, sửa ghi chú + nhắc nhở
  js/views/settings.js    kết nối, thử Telegram, sao lưu
apps-script/
  Code.gs                 API (doPost), Sheet, Telegram, trigger hourlyTick/morningDigest
  Shared.gs               SINH TỰ ĐỘNG từ docs/js/shared — không sửa tay
  appsscript.json
scripts/build-gas.sh      sinh Shared.gs
tests/                    node --test (âm lịch, lần nhắc, backend Apps Script giả lập)
```

## Quy tắc

- Không framework, không bundler, không thư viện ngoài.
- Không dùng `innerHTML` với dữ liệu người dùng; dùng `h()` / `textContent`. Escape HTML khi gửi Telegram.
- Request tới Apps Script: chỉ POST `text/plain;charset=utf-8`, không header tuỳ chỉnh (tránh CORS preflight).
- Ngày lịch luôn là `{ y, m, d }` số nguyên; không lưu `Date` cho ngày.
- Sheet: cột mới chỉ thêm vào CUỐI `SCHEMA` trong Code.gs. Xoá là xoá mềm (`deleted`). `syncedAt`, `lastSentKey` chỉ máy chủ ghi.
- Sửa `docs/js/shared/*` → chạy `npm test` và `npm run build:gas`, rồi nhắc người dùng dán lại Shared.gs vào Apps Script.
- Sửa Code.gs → nhắc người dùng dán lại và tạo **phiên bản deployment mới** (không thì web vẫn chạy code cũ).
- Sửa giao diện → tăng `CACHE_VERSION` trong `docs/sw.js`.
- Luôn chạy `npm test` trước khi báo xong.

## Lệnh

```bash
npm test            # toàn bộ test
npm run build:gas   # sinh apps-script/Shared.gs
npm run serve       # http://localhost:8000
```

## Tham khảo

Repo `cardinvite/goldhome-edu-dangky` dùng cùng kiến trúc (GitHub Pages + Apps Script). Không dùng chung Sheet hay Web App của repo đó.
