import { escapeHtml } from '../utils/helpers.js';

export default class Navbar {
  constructor(container, handlers) { this.container = container; this.handlers = handlers; }
  render(user, unread = 0) {
    if (user) {
      this.container.innerHTML = `
        <button class="icon-btn notification-btn" id="btnNotifications" title="Thông báo">🔔<span class="badge">${unread}</span></button>
        <button class="avatar-btn" id="btnProfile">${escapeHtml((user.name || 'U')[0].toUpperCase())}</button>
        <span class="hello">Xin chào, <b>${escapeHtml(user.name)}</b></span>
        <button class="btn btn-primary btn-sm" id="btnUpload">⬆ Tải lên</button>
        ${user.role === 'admin' || user.role === 'moderator' ? '<button class="btn btn-warning btn-sm" id="btnAdmin">🛡 Quản trị</button>' : ''}
        <button class="btn btn-outline btn-sm" id="btnLogout">Đăng xuất</button>`;
      this.bind('btnUpload', this.handlers.onUpload); this.bind('btnLogout', this.handlers.onLogout); this.bind('btnProfile', this.handlers.onProfile); this.bind('btnNotifications', this.handlers.onNotifications);
      if (document.getElementById('btnAdmin')) this.bind('btnAdmin', this.handlers.onAdmin);
    } else {
      this.container.innerHTML = '<button class="btn btn-outline btn-sm" id="btnLogin">Đăng nhập</button><button class="btn btn-primary btn-sm" id="btnRegister">Đăng ký</button>';
      this.bind('btnLogin', this.handlers.onLogin); this.bind('btnRegister', this.handlers.onRegister);
    }
  }
  bind(id, handler) { document.getElementById(id)?.addEventListener('click', handler); }
}
