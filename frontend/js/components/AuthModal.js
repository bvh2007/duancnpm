import Modal from './Modal.js';

/** Hộp thoại Đăng nhập / Đăng ký (kế thừa Modal). */
export default class AuthModal extends Modal {
  constructor(elementId, { authService, toast, onSuccess }) {
    super(elementId);
    this.authService = authService;
    this.toast = toast;
    this.onSuccess = onSuccess;
    this.mode = 'login'; // 'login' | 'register'

    this.form = document.getElementById('authForm');
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    document.getElementById('authSwitch').addEventListener('click', (e) => {
      e.preventDefault();
      this.show(this.mode === 'login' ? 'register' : 'login');
    });
  }

  show(mode) {
    this.mode = mode;
    const isRegister = mode === 'register';
    document.getElementById('authTitle').textContent = isRegister ? 'Đăng ký tài khoản' : 'Đăng nhập';
    document.getElementById('authSubmit').textContent = isRegister ? 'Đăng ký' : 'Đăng nhập';
    document.getElementById('authName').style.display = isRegister ? 'block' : 'none';
    document.getElementById('authSwitchText').textContent = isRegister ? 'Đã có tài khoản?' : 'Chưa có tài khoản?';
    document.getElementById('authSwitch').textContent = isRegister ? 'Đăng nhập' : 'Đăng ký ngay';
    this.open();
  }

  async handleSubmit(e) {
    e.preventDefault();
    const name = document.getElementById('authName').value;
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    try {
      if (this.mode === 'register') await this.authService.register(name, email, password);
      else await this.authService.login(email, password);

      this.form.reset();
      this.close();
      this.toast.show(this.mode === 'register' ? 'Đăng ký thành công!' : 'Đăng nhập thành công!');
      this.onSuccess();
    } catch (err) {
      this.toast.error(err.message);
    }
  }
}
