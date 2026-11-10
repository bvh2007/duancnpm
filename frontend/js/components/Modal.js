/** Lớp cha cho các hộp thoại: mở, đóng, bấm nền hoặc nút × để đóng. */
export default class Modal {
  constructor(elementId) {
    this.el = document.getElementById(elementId);

    this.el.querySelectorAll("[data-close]").forEach((btn) => {
      btn.addEventListener("click", () => this.close());
    });

    this.el.addEventListener("click", (e) => {
      if (e.target === this.el) {
        this.close();
      }
    });
  }

  open() {
    this.el.classList.add("show");
  }

  close() {
    this.el.classList.remove("show");
  }
}
