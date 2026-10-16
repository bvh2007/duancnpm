/** Lỗi trả về từ API, kèm mã trạng thái HTTP. */
export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

/** Gọi API bằng fetch, tự gắn token đăng nhập. */
export default class ApiClient {
  constructor(baseUrl, sessionStore) {
    this.baseUrl = baseUrl;
    this.session = sessionStore;
  }

  async request(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (this.session.token) headers.Authorization = 'Bearer ' + this.session.token;
    if (options.body && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';

    const res = await fetch(this.baseUrl + path, { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ApiError(data.message || 'Có lỗi xảy ra', res.status);
    return data;
  }

  get(path) {
    return this.request(path);
  }

  post(path, body) {
    return this.request(path, { method: 'POST', body: body instanceof FormData ? body : JSON.stringify(body) });
  }

  delete(path) {
    return this.request(path, { method: 'DELETE' });
  }
}
