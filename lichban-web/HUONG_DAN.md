# Hướng dẫn cài đặt Lịch Bàn

Code đã viết xong. Bạn chỉ cần làm 6 bước dưới đây, mất khoảng 20 phút.

```
Bước 0  Thử trên máy (không cần Google)
Bước 1  Tạo Google Sheet + Apps Script     ← dán 2 file Code.gs, Shared.gs
Bước 2  Đặt token, chạy setup, deploy
Bước 3  Telegram bot
Bước 4  Đưa lên GitHub Pages
Bước 5  Mở trên Mac + iPhone, nhập URL + token
```

---

## Bước 0. Thử trên máy

```bash
cd lichban-web
npm test          # 23 test phải xanh
npm run serve     # hoặc: python3 -m http.server -d docs 8000
```

Mở http://localhost:8000. Lúc này ghi chú chỉ lưu trong trình duyệt (chấm trạng thái màu xám). Thêm thử vài ghi chú để quen giao diện. Khi kết nối Google Sheet ở Bước 5, các ghi chú này sẽ tự được đẩy lên.

---

## Bước 1. Tạo Google Sheet và Apps Script

1. Vào **sheets.google.com** → tạo bảng tính trống → đặt tên **LichBan Data**.
2. Trong Sheet đó: **Tiện ích mở rộng → Apps Script**. Một tab mới mở ra.
3. Bấm vào chữ *Dự án không có tiêu đề* ở góc trên → đổi tên thành **LichBan API**.

**File 1 — Code.gs**

4. Trong editor đã có sẵn file `Mã.gs` (hoặc `Code.gs`). Xoá hết nội dung trong đó.
5. Mở file `apps-script/Code.gs` trong repo → copy toàn bộ → dán vào.

**File 2 — Shared.gs**

6. Bấm dấu **+** cạnh chữ *Tệp* → **Tập lệnh** → đặt tên `Shared` (Google tự thêm đuôi `.gs`).
7. Mở file `apps-script/Shared.gs` trong repo → copy toàn bộ → dán vào.
8. Bấm biểu tượng 💾 **Lưu dự án** (hoặc ⌘S).

**Múi giờ**

9. Thanh bên trái → ⚙️ **Cài đặt dự án** → **Múi giờ**: chọn `(GMT+07:00) Giờ Đông Dương - Hà Nội` (hoặc Bangkok).
10. Quay lại Google Sheet → **Tệp → Cài đặt → Múi giờ** → cũng chọn GMT+7.

> Vì script được tạo từ bên trong Sheet nên nó tự biết Sheet nào, **không cần** `SHEET_ID`.

---

## Bước 2. Token, setup, deploy

**2.1. Tạo token bí mật**

Trên Mac chạy:
```bash
openssl rand -hex 32
```
Copy chuỗi kết quả. Lưu vào trình quản lý mật khẩu (Keychain/Bitwarden…), bạn sẽ nhập nó trên Mac và iPhone.

**2.2. Đặt Script Properties**

⚙️ **Cài đặt dự án** → kéo xuống **Thuộc tính tập lệnh** → **Thêm thuộc tính tập lệnh**:

| Thuộc tính | Giá trị |
|---|---|
| `API_TOKEN` | chuỗi vừa tạo |

→ **Lưu thuộc tính tập lệnh**.

**2.3. Chạy `setup` để tạo các tab**

1. Quay lại **Trình chỉnh sửa** (biểu tượng `< >`), mở file **Code.gs**.
2. Trên thanh công cụ, ô chọn hàm: chọn **setup** → bấm **▶ Chạy**.
3. Lần đầu Google hỏi quyền: **Xem xét quyền** → chọn tài khoản → màn hình *"Google chưa xác minh ứng dụng này"* → bấm **Nâng cao** → **Đi tới LichBan API (không an toàn)** → **Cho phép**.
   (Đây là script của chính bạn, cảnh báo này hiện với mọi Apps Script mới.)
4. Nhật ký hiện `✅ Đã tạo/kiểm tra các tab…`. Mở Sheet sẽ thấy 4 tab: **Notes, Reminders, MonthNotes, Log**.
5. Chọn hàm **selfTest** → **▶ Chạy** → phải thấy `✅ selfTest OK`.

**2.4. Deploy thành Web App**

1. Góc trên phải: **Triển khai → Tuỳ chọn triển khai mới**.
2. Bánh răng cạnh *Chọn loại* → **Ứng dụng web**.
3. Điền:
   - Mô tả: `v1`
   - Thực thi dưới dạng: **Tôi (email của bạn)**
   - Người có quyền truy cập: **Bất kỳ ai**
4. **Triển khai** → copy **URL ứng dụng web** (dạng `https://script.google.com/macros/s/AKfy…/exec`).
5. Dán URL đó vào trình duyệt → phải thấy `{"ok":true,"service":"lichban",…}`.

> "Bất kỳ ai" chỉ có nghĩa là không cần đăng nhập Google để gọi. Không có `API_TOKEN` thì mọi request đều bị từ chối.

---

## Bước 3. Telegram bot

1. Mở Telegram, tìm **@BotFather** → gửi `/newbot` → đặt tên (VD: `Lịch Bàn`) → đặt username kết thúc bằng `bot` (VD: `lichban_thanh_bot`).
2. BotFather trả về **token** dạng `123456789:AAH…`. Copy lại.
3. Bấm vào link bot vừa tạo → **Start** → gửi một tin bất kỳ, ví dụ `hi`.
4. Lấy **chat id**: mở trình duyệt, thay `<TOKEN>` bằng token của bạn:
   ```
   https://api.telegram.org/bot<TOKEN>/getUpdates
   ```
   Tìm đoạn `"chat":{"id":123456789,…`. Số đó là chat id.
5. Apps Script → ⚙️ **Cài đặt dự án** → **Thuộc tính tập lệnh** → thêm:

| Thuộc tính | Giá trị |
|---|---|
| `TELEGRAM_BOT_TOKEN` | token từ BotFather |
| `TELEGRAM_CHAT_ID` | chat id |

6. Trình chỉnh sửa → chọn hàm **testTelegram** → **▶ Chạy** → Telegram nhận được *"✅ Lịch Bàn kết nối Telegram thành công."*
7. Chọn hàm **installTriggers** → **▶ Chạy** (cấp thêm quyền nếu được hỏi).
8. Kiểm tra thanh bên trái → ⏰ **Trình kích hoạt**: có `hourlyTick` (mỗi giờ) và `morningDigest` (hằng ngày, 6–7h sáng).

Mẹo: trong Telegram, vào chat với bot → bật thông báo và chọn âm báo riêng để nghe giống báo thức.

**Bot sẽ gửi gì?**
- Mỗi giờ kiểm tra một lần: đến giờ nhắc thì gửi *🔔 Sinh nhật mẹ — Thứ Sáu, 20/11/2026 · 12/10 âm lịch — Còn 1 ngày nữa*. Nếu Google lỡ một lần chạy, lần sau sẽ gửi bù (trong vòng 24 giờ), không bao giờ gửi trùng.
- 6–7h sáng: tóm tắt hôm nay + 7 ngày tới (ngày lễ, ghi chú). Ngày nào không có gì thì không gửi.

---

## Bước 4. Đưa lên GitHub Pages

1. Tạo repo trên GitHub tên **lichban-web**, chế độ **Public** (GitHub Pages miễn phí chỉ cho repo public; token và dữ liệu không nằm trong code nên không sao).
2. Push code:
   ```bash
   cd lichban-web
   git init && git add . && git commit -m "Lịch Bàn v1"
   git branch -M main
   git remote add origin git@github.com:cardinvite/lichban-web.git
   git push -u origin main
   ```
3. Repo → **Settings → Pages** → *Source*: **Deploy from a branch** → Branch **main**, thư mục **/docs** → **Save**.
4. Khoảng 1 phút sau mở: **https://cardinvite.github.io/lichban-web/**

---

## Bước 5. Dùng trên Mac và iPhone

**Mac**
1. Mở https://cardinvite.github.io/lichban-web/ bằng Safari.
2. Bấm ⚙️ → dán **URL ứng dụng web** và **Token** → **Kiểm tra kết nối** → **Lưu kết nối**.
3. Chấm trạng thái chuyển xanh lá = đã lưu lên Google Sheet.
4. Menu **Tệp → Thêm vào Dock** để có app riêng. Nếu dùng Chrome: biểu tượng *Cài đặt* trên thanh địa chỉ.
   App trong Dock có bộ nhớ riêng, nên mở app đó và nhập URL + token thêm một lần.

**iPhone**
1. Mở link bằng **Safari** → nút **Chia sẻ** → **Thêm vào Màn hình chính**.
2. Mở app từ màn hình chính → ⚙️ → dán URL + token → **Lưu kết nối**. (Nhập trong app, không phải trong tab Safari.)
3. Thử "Gửi tin thử qua Telegram" trong Cài đặt.

**Cách dùng**
- Bấm vào một ngày → **Thêm ghi chú** → chọn kiểu đánh dấu (khoanh tròn, chấm, gạch chân) và màu bút.
- Bật **Nhắc qua Telegram** → chọn lặp lại: một lần / hằng năm dương lịch / hằng năm âm lịch / hằng tháng âm lịch (VD: rằm, mùng 1).
- Ô **Notes** bên phải: việc chung của cả tháng, tự lưu khi ngừng gõ.
- Máy tính: phím ← → lật tháng, **T** về hôm nay. iPhone: vuốt ngang để lật tháng.
- Chấm trạng thái: xám = chỉ lưu trên máy, cam = đang chờ gửi, xanh = đã lưu, đỏ = lỗi (bấm vào để xem lỗi và thử lại).

---

## Cập nhật về sau

| Sửa gì | Làm gì |
|---|---|
| Giao diện (HTML/CSS/JS) | Tăng `CACHE_VERSION` trong `docs/sw.js` → `git push`. Trên iPhone đóng hẳn app rồi mở lại 1–2 lần |
| `apps-script/Code.gs` | Dán lại vào Apps Script → **Triển khai → Quản lý các lần triển khai → ✏️ → Phiên bản: Phiên bản mới → Triển khai** (URL giữ nguyên) |
| `docs/js/shared/*` (âm lịch, ngày lễ…) | `npm test` → `npm run build:gas` → dán lại `Shared.gs` vào Apps Script + tạo phiên bản mới → `git push` |
| Thêm ngày lễ | Sửa `LIST` trong `docs/js/shared/holidays.js`, rồi làm như dòng trên |

⚠️ Lỗi hay gặp nhất: sửa Apps Script, bấm Lưu mà không tạo **phiên bản deployment mới**, nên web vẫn chạy code cũ.

---

## Xử lý sự cố

| Hiện tượng | Cách xử lý |
|---|---|
| "Không kết nối được máy chủ" | Web App phải để *Người có quyền truy cập: Bất kỳ ai*. URL phải kết thúc bằng `/exec` |
| "Máy chủ trả về trang HTML" | URL sai (đang dùng `/dev`?) hoặc script lỗi: Apps Script → **Lần thực thi** xem lỗi |
| "Token không đúng" | Token trên máy khác `API_TOKEN` trong Script Properties (thừa dấu cách?) |
| "Apps Script đang chạy bản cũ" | Tạo phiên bản deployment mới |
| Không nhận tin Telegram | Chạy lại `testTelegram`; xem ⏰ Trình kích hoạt còn `hourlyTick`; xem tab **Log** trong Sheet |
| Sửa trên Mac chưa thấy trên iPhone | Đóng mở lại app (app đồng bộ mỗi lần được mở lại); xem chấm trạng thái |
| iPhone vẫn hiện giao diện cũ | Quên tăng `CACHE_VERSION`; hoặc đóng hẳn app mở lại 2 lần |
| Lộ token | Đổi `API_TOKEN` trong Script Properties → nhập token mới trên các máy |

Dữ liệu nằm trong Google Sheet, Google tự lưu lịch sử phiên bản (**Tệp → Nhật ký phiên bản**). Ngoài ra có thể tải bản sao lưu JSON trong ⚙️ Cài đặt.
