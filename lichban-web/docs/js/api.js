// Gọi Google Apps Script Web App.
// - POST text/plain: tránh CORS preflight (Apps Script không xử lý OPTIONS).
// - Token nằm trong body, không bao giờ nằm trong URL.
// - Apps Script trả 302 sang script.googleusercontent.com, fetch tự đi theo.

export class ApiError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

async function once(url, token, action, payload) {
  let res, text;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ token, action, payload }),
      redirect: 'follow',
    });
    text = await res.text();
  } catch (err) {
    throw new ApiError('NETWORK', 'Không kết nối được máy chủ. Kiểm tra mạng, và Web App phải để "Người có quyền truy cập: Bất kỳ ai".');
  }
  if (!res.ok) {
    throw new ApiError('HTTP', `Máy chủ Google trả lỗi tạm thời (HTTP ${res.status}). Thử lại sau ít phút.`);
  }
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    console.error('Phản hồi không phải JSON:', text.slice(0, 500));
    throw new ApiError('BAD_RESPONSE', 'Máy chủ trả về trang HTML thay vì dữ liệu. Kiểm tra URL kết thúc bằng /exec và Web App để "Bất kỳ ai".');
  }
  if (body.ok === undefined) {
    throw new ApiError('OLD_DEPLOYMENT', 'Apps Script đang chạy bản cũ. Vào Triển khai → Quản lý các lần triển khai → Sửa → Phiên bản mới.');
  }
  if (!body.ok) throw new ApiError(body.code || 'SERVER', body.message || 'Lỗi máy chủ.');
  return body.data;
}

/** Gọi API, tự thử lại 1 lần với lỗi tạm thời. */
export async function callApi(settings, action, payload = {}) {
  if (!settings.apiUrl) throw new ApiError('NOT_CONFIGURED', 'Chưa cấu hình API URL.');
  try {
    return await once(settings.apiUrl, settings.token, action, payload);
  } catch (err) {
    if (err.code === 'HTTP' || err.code === 'BUSY') {
      await new Promise((r) => setTimeout(r, 1500));
      return once(settings.apiUrl, settings.token, action, payload);
    }
    throw err;
  }
}
