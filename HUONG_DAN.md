# Hướng dẫn cài đặt Lịch Bàn

```
Bước 1  Tạo Google Sheet + Apps Script     ← dán 2 file Code.gs, Shared.gs
Bước 2  Đặt mật khẩu, chạy setup, deploy    → lấy URL /exec
Bước 3  Liên kết Apps Script với repo       ← dán URL vào docs/js/config.js, push
Bước 4  GitHub Pages
Bước 5  Telegram bot (nhắc nhở)
Bước 6  Cài lên điện thoại
```

Chạy thử trên máy trước (không cần Google):

```bash
npm test          # test phải xanh
npm run serve     # http://localhost:8000
```

---

## Bước 1. Tạo Google Sheet và Apps Script

1. Vào **sheets.google.com** → tạo bảng tính trống → đặt tên **LichBan Data**.
2. Trong Sheet: **Tiện ích mở rộng → Apps Script**. Đổi tên dự án thành **LichBan API**.
3. File `Mã.gs` có sẵn: xoá hết, dán toàn bộ nội dung `apps-script/Code.gs`.
4. Bấm **+** cạnh *Tệp* → **Tập lệnh** → đặt tên `Shared` → dán toàn bộ `apps-script/Shared.gs`.
5. Bấm 💾 **Lưu dự án**.
6. ⚙️ **Cài đặt dự án** → **Múi giờ**: `(GMT+07:00) … Hà Nội`. Trong Sheet: **Tệp → Cài đặt → Múi giờ** cũng chọn GMT+7.

> Script tạo từ bên trong Sheet nên tự biết Sheet nào, **không cần** `SHEET_ID`.

---

## Bước 2. Mật khẩu, setup và deploy

**Mật khẩu mở lịch.** ⚙️ **Cài đặt dự án** → **Thuộc tính tập lệnh** → **Thêm thuộc tính tập lệnh**:

| Thuộc tính | Giá trị |
|---|---|
| `APP_PASSWORD` | mật khẩu tự chọn, VD `lich-nha-minh-2026` |

- **Ai cũng xem được lịch** (ngày, âm lịch, ngày lễ) mà không cần mật khẩu.
- **Ghi chú chỉ hiện và chỉ thêm/sửa được sau khi nhập đúng mật khẩu** (bấm 🔒). Mỗi máy nhập một lần.
- Ghi chú lưu vào Google Sheet. Nhập sai 10 lần trong 10 phút thì khoá tạm 10 phút (khách chỉ xem lịch không bị tính).
- Không đặt `APP_PASSWORD` thì ai bấm 🔒 cũng mở được ghi chú, nên **hãy luôn đặt**.

1. Trình chỉnh sửa → mở **Code.gs** → chọn hàm **setup** → **▶ Chạy**.
   Lần đầu Google hỏi quyền: **Xem xét quyền** → chọn tài khoản → **Nâng cao** → **Đi tới LichBan API (không an toàn)** → **Cho phép**.
2. Sheet có 4 tab: **Notes, Reminders, MonthNotes, Log**. Chạy thêm **selfTest** → phải thấy `✅ selfTest OK`.
3. **Triển khai → Tuỳ chọn triển khai mới** → loại **Ứng dụng web**:
   - Thực thi dưới dạng: **Tôi**
   - Người có quyền truy cập: **Bất kỳ ai**
4. **Triển khai** → copy **URL ứng dụng web** (dạng `https://script.google.com/macros/s/AKfy…/exec`).
5. Mở URL đó trong trình duyệt → phải thấy `{"ok":true,"service":"lichban",…}`.

> `API_TOKEN` cũ (nếu có) không còn dùng nữa, có thể xoá.

---

## Bước 3. Liên kết Apps Script với repo

Đây là bước nối web với Google Sheet. Mở `docs/js/config.js`, dán URL vừa copy:

```js
export const API_URL = 'https://script.google.com/macros/s/AKfy…/exec';
```

Rồi push:

```bash
git add docs/js/config.js && git commit -m "Liên kết Apps Script" && git push
```

Mọi thiết bị mở web sẽ tự dùng URL này, không phải nhập gì. Ghi chú đã tạo trên máy trước khi liên kết sẽ tự được đẩy lên Sheet ở lần mở đầu tiên.

> Repo public nên URL này ai cũng xem được. Phần bảo vệ dữ liệu là `APP_PASSWORD` ở Bước 2.

**Lưu ý:** URL chỉ đổi khi tạo *triển khai mới*. Khi sửa code Apps Script, hãy dùng **Quản lý các lần triển khai → ✏️ → Phiên bản mới** để URL giữ nguyên, khỏi phải sửa `config.js`.

---

## Bước 4. GitHub Pages

1. Repo **cardinvite/lichban** phải để **Public**.
2. **Settings → Pages** → *Source*: **Deploy from a branch** → Branch **main**, thư mục **/docs** → **Save**.
3. Khoảng 1 phút sau mở **https://cardinvite.github.io/lichban/**
4. Bấm 🔒 → nhập `APP_PASSWORD` → ghi chú hiện ra. Bấm ⚙️ → **Kiểm tra kết nối** → phải báo *Kết nối được với Google Sheet*. Chấm trạng thái cạnh ⚙️ chuyển xanh lá.

---

## Bước 5. Telegram bot

1. Telegram → **@BotFather** → `/newbot` → đặt tên và username (kết thúc bằng `bot`). Copy **token** dạng `123456789:AAH…`.
2. Mở bot vừa tạo → **Start** → gửi `hi`.
3. Mở `https://api.telegram.org/bot<TOKEN>/getUpdates`, tìm `"chat":{"id":123456789` → đó là **chat id**.
4. Apps Script → ⚙️ **Cài đặt dự án** → **Thuộc tính tập lệnh**:

| Thuộc tính | Giá trị |
|---|---|
| `TELEGRAM_BOT_TOKEN` | token từ BotFather |
| `TELEGRAM_CHAT_ID` | chat id |

5. Chạy hàm **testTelegram** → Telegram nhận *"✅ Lịch Bàn kết nối Telegram thành công."*
6. Chạy hàm **installTriggers** → ⏰ **Trình kích hoạt** có `hourlyTick` (mỗi giờ) và `morningDigest` (6–7h sáng).

Bot gửi: nhắc nhở đúng giờ đã đặt (lỡ lần chạy thì gửi bù trong 24 giờ, không gửi trùng) và tóm tắt buổi sáng hôm nay + 7 ngày tới (ngày trống thì không gửi).

---

## Bước 6. Cài lên điện thoại

**iPhone:** mở link bằng **Safari** → **Chia sẻ** → **Thêm vào Màn hình chính**. Mở app từ màn hình chính rồi nhập mật khẩu (app có bộ nhớ riêng với tab Safari).
**Android:** mở bằng **Chrome** → menu ⋮ → **Thêm vào màn hình chính** / **Cài đặt ứng dụng**.

**Cách dùng**
- Chưa nhập mật khẩu: chỉ xem lịch; bấm 🔒 để mở ghi chú.
- Chạm vào một ngày → **Thêm ghi chú** → chọn kiểu đánh dấu (khoanh tròn, chấm, gạch chân) và màu bút.
- Bật **Nhắc qua Telegram** → lặp lại: một lần / hằng năm dương lịch / hằng năm âm lịch / hằng tháng âm lịch.
- Ô **Notes** dưới lịch: việc chung của cả tháng, tự lưu khi ngừng gõ.
- Vuốt ngang trên lịch để lật tháng. Trên máy tính: phím ← → và **T** về hôm nay.
- Chấm trạng thái: xám = chỉ lưu trên máy, cam = đang chờ gửi, xanh = đã lưu, đỏ = lỗi hoặc cần mật khẩu (chạm để xem).

---

## Cập nhật về sau

| Sửa gì | Làm gì |
|---|---|
| Giao diện (HTML/CSS/JS) | Tăng `CACHE_VERSION` trong `docs/sw.js` → `git push`. Trên điện thoại đóng hẳn app rồi mở lại 1–2 lần |
| `apps-script/Code.gs` | Dán lại vào Apps Script → **Triển khai → Quản lý các lần triển khai → ✏️ → Phiên bản mới → Triển khai** (URL giữ nguyên) |
| `docs/js/shared/*` (âm lịch, ngày lễ…) | `npm test` → `npm run build:gas` → dán lại `Shared.gs` + tạo phiên bản mới → `git push` |
| Đổi sang Web App khác | Sửa `API_URL` trong `docs/js/config.js` → `git push` |

⚠️ Lỗi hay gặp nhất: sửa Apps Script, bấm Lưu mà không tạo **phiên bản deployment mới**, nên web vẫn chạy code cũ.

---

## Xử lý sự cố

| Hiện tượng | Cách xử lý |
|---|---|
| Chấm xám, báo "chưa liên kết Apps Script" | `API_URL` trong `docs/js/config.js` còn trống, hoặc chưa push |
| "Không kết nối được máy chủ" | Web App phải để *Người có quyền truy cập: Bất kỳ ai*. URL phải kết thúc bằng `/exec` |
| "Máy chủ trả về trang HTML" | URL sai (đang dùng `/dev`?) hoặc script lỗi: Apps Script → **Lần thực thi** xem lỗi |
| Vẫn thấy 🔒 / "Mật khẩu không đúng" | So với `APP_PASSWORD` trong Script Properties (thừa dấu cách?) |
| "Nhập sai mật khẩu quá nhiều lần" | Chờ 10 phút rồi nhập lại |
| Đổi mật khẩu | Sửa `APP_PASSWORD`; các máy đã đăng nhập sẽ khoá ghi chú và hỏi mật khẩu mới ở lần đồng bộ sau |
| "Apps Script đang chạy bản cũ" | Tạo phiên bản deployment mới |
| Không nhận tin Telegram | Chạy lại `testTelegram`; xem ⏰ Trình kích hoạt còn `hourlyTick`; xem tab **Log** trong Sheet |
| Sửa trên máy này chưa thấy trên máy kia | Đóng mở lại app (app đồng bộ mỗi lần mở lại); xem chấm trạng thái |
| Điện thoại vẫn hiện giao diện cũ | Quên tăng `CACHE_VERSION`; hoặc đóng hẳn app mở lại 2 lần |
| GitHub Pages báo 404 | Pages phải trỏ **main** + **/docs**, và thư mục `docs/` nằm ở gốc repo |

Dữ liệu nằm trong Google Sheet, Google tự lưu lịch sử phiên bản (**Tệp → Nhật ký phiên bản**). Có thể tải bản sao lưu JSON trong ⚙️ Cài đặt.
