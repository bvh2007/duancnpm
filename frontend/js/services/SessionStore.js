/** Lưu token và thông tin người dùng đang đăng nhập (localStorage). */
export default class SessionStore {
  get token() {
    return localStorage.getItem('token') || '';
  }

  get user() {
    return JSON.parse(localStorage.getItem('user') || 'null');
  }

  save(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  }

  clear() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  }
}
