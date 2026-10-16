/** Thông báo nhỏ hiện ở cuối màn hình. */
export default class Toast {
  constructor(elementId) {
    this.el = document.getElementById(elementId);
  }

  show(message, isError = false) {
    this.el.textContent = message;
    this.el.className = 'toast show' + (isError ? ' error' : '');
    setTimeout(() => (this.el.className = 'toast'), 2800);
  }

  error(message) {
    this.show(message, true);
  }
}
