import { escapeHtml, formatSize, formatDate } from '../utils/helpers.js';

export default class DocumentList {
  constructor(container, countElement, { downloadUrl, onDelete, onDownload, onDetail, onFavorite, onReport }) {
    this.container = container; this.countElement = countElement; this.downloadUrl = downloadUrl;
    this.handlers = { onDelete, onDownload, onDetail, onFavorite, onReport };
    this.container.addEventListener('click', (e) => {
      const el = e.target.closest('[data-action]'); if (!el) return;
      const id = el.dataset.id; const action = el.dataset.action;
      if (action === 'delete') onDelete(id); if (action === 'download') onDownload(); if (action === 'detail') onDetail(id); if (action === 'favorite') onFavorite(id); if (action === 'report') onReport(id);
    });
  }
  render(docs, currentUser, featureStore) {
    this.countElement.textContent = docs.length + ' tài liệu';
    this.container.innerHTML = docs.length ? docs.map(d => this.renderCard(d, currentUser, featureStore)).join('') : '<div class="empty">📭<h3>Chưa tìm thấy tài liệu</h3><p>Hãy thử từ khóa khác hoặc xóa bớt bộ lọc.</p></div>';
  }
  renderError(message) { this.container.innerHTML = `<div class="empty">Không tải được dữ liệu: ${escapeHtml(message)}</div>`; }
  renderCard(d, currentUser, store) {
    const isOwner = currentUser && d.uploader && d.uploader._id === currentUser.id;
    const rating = store.getRating(d._id); const fav = store.isFavorite(d._id); const type = d.type || (/đề/i.test(d.title) ? 'Đề thi' : 'Tài liệu');
    const ratingText = rating.avg ? `${rating.avg.toFixed(1)} ⭐ (${rating.count})` : 'Chưa có đánh giá';
    return `<article class="card">
      <div class="card-top"><span class="tag">${escapeHtml(type)}</span><button class="icon-btn ${fav ? 'liked' : ''}" data-action="favorite" data-id="${d._id}" title="Lưu yêu thích">${fav ? '♥' : '♡'}</button></div>
      <div class="file-icon">${/pdf/i.test(d.originalName || '') ? '📕' : '📄'}</div>
      <h3>${escapeHtml(d.title)}</h3><p>${escapeHtml(d.description) || 'Chưa có mô tả'}</p>
      <div class="rating-line"><span>${ratingText}</span><span>⬇ ${d.downloads || 0}</span></div>
      <div class="meta">👤 ${escapeHtml(d.uploader ? d.uploader.name : 'Ẩn danh')} · ${formatDate(d.createdAt)}<br>📄 ${escapeHtml(d.originalName)} · ${formatSize(d.fileSize)}</div>
      <div class="card-actions"><button class="btn btn-primary btn-sm" data-action="detail" data-id="${d._id}">Xem chi tiết</button><a class="btn btn-soft btn-sm" data-action="download" href="${this.downloadUrl(d._id)}">Tải xuống</a>${isOwner ? `<button class="btn btn-danger btn-sm" data-action="delete" data-id="${d._id}">Xóa</button>` : ''}</div>
      <button class="report-link" data-action="report" data-id="${d._id}">🚩 Báo cáo tài liệu</button>
    </article>`;
  }
}
