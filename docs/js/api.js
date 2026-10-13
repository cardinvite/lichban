// Gọi Google Apps Script Web App.
// - POST text/plain: tránh CORS preflight (Apps Script không xử lý OPTIONS).
// - Mật khẩu nằm trong body, không bao giờ nằm trong URL.
// - Apps Script trả 302 sang script.googleusercontent.com, fetch tự đi theo.

export class ApiError extends Error {
  constructor(code, message) { super(message); this.code = code; }
}

async function once(url, password, action, payload) {
  let res, text;
  try {
    res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ password, action, payload }),
      redirect: 'follow',
    });
    text = await res.text();
  } catch (err) {
    throw new ApiError('NETWORK', 'Không kết nối được máy chủ.');
  }
  if (!res.ok) {
    throw new ApiError('HTTP', `Máy chủ đang bận (HTTP ${res.status}). Thử lại sau.`);
  }
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    console.error('Phản hồi không phải JSON:', text.slice(0, 500));
    throw new ApiError('BAD_RESPONSE', 'Máy chủ trả về dữ liệu không hợp lệ.');
  }
  if (body.ok === undefined) {
    throw new ApiError('OLD_DEPLOYMENT', 'Máy chủ đang chạy phiên bản cũ.');
  }
  if (!body.ok) throw new ApiError(body.code || 'SERVER', body.message || 'Lỗi máy chủ.');
  return body.data;
}

/** Gọi API, tự thử lại 1 lần với lỗi tạm thời. password để trống nếu Apps Script không đặt APP_PASSWORD. */
export async function callApi(apiUrl, password, action, payload = {}) {
  if (!apiUrl) throw new ApiError('NOT_CONFIGURED', 'Chưa kết nối máy chủ.');
  try {
    return await once(apiUrl, password, action, payload);
  } catch (err) {
    if (err.code === 'HTTP' || err.code === 'BUSY') {
      await new Promise((r) => setTimeout(r, 1500));
      return once(apiUrl, password, action, payload);
    }
    throw err;
  }
}
