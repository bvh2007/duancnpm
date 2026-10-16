import Modal from './Modal.js';

/** Hộp thoại tải tài liệu lên (kế thừa Modal). */
export default class UploadModal extends Modal {
  constructor(elementId, { documentService, toast, onSuccess }) {
    super(elementId);
    this.documentService = documentService;
    this.toast = toast;
    this.onSuccess = onSuccess;

    this.form = document.getElementById('uploadForm');
    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  async handleSubmit(e) {
    e.preventDefault();
    try {
      await this.documentService.upload({
        title: document.getElementById('upTitle').value,
        subject: document.getElementById('upSubject').value,
        description: document.getElementById('upDesc').value,
        type: document.getElementById('upType').value,
        tags: document.getElementById('upTags').value,
        file: document.getElementById('upFile').files[0],
      });
      this.form.reset();
      this.close();
      this.toast.show('Tải lên thành công!');
      this.onSuccess(); // cập nhật ngay danh sách
    } catch (err) {
      this.toast.error(err.message);
    }
  }
}
