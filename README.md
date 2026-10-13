# Lịch Bàn

Lịch để bàn kiểu Việt Nam, dùng tốt trên điện thoại: ngày âm, ngày lễ, ghi chú khoanh tròn bằng nét bút, nhắc nhở qua Telegram.
Dữ liệu lưu trong Google Sheet của bạn qua Google Apps Script.

- Web: https://cardinvite.github.io/lichban/
- Liên kết Apps Script: dán URL Web App vào `docs/js/config.js`
- Hướng dẫn cài đặt: [HUONG_DAN.md](HUONG_DAN.md)
- Ghi chú cho Claude Code: [CLAUDE.md](CLAUDE.md)

```bash
npm test          # kiểm tra âm lịch, lần nhắc, backend
npm run serve     # chạy thử http://localhost:8000
npm run build:gas # sinh apps-script/Shared.gs
```
