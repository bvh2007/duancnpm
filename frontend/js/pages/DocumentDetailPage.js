import { API_BASE } from "../config.js";

import SessionStore from "../services/SessionStore.js";

import ApiClient from "../services/ApiClient.js";

import DocumentService from "../services/DocumentService.js";

import FeatureStore from "../services/FeatureStore.js";

import { escapeHtml, formatSize, formatDate } from "../utils/helpers.js";

const session = new SessionStore();

const api = new ApiClient(API_BASE, session);

const documentService = new DocumentService(api);

const featureStore = new FeatureStore(api);

const params = new URLSearchParams(window.location.search);

const documentId = params.get("id");

const detailElement = document.getElementById("documentDetail");

const commentList = document.getElementById("commentList");

const commentCount = document.getElementById("commentCount");

const commentForm = document.getElementById("commentForm");

const commentInput = document.getElementById("commentInput");

if (!documentId) {
  detailElement.innerHTML = `
        <div class="empty">
            Không tìm thấy tài liệu.
        </div>
    `;
} else {
  loadDocument();
}

async function loadDocument() {
  try {
    /*
     * Không dùng:
     *
     * GET /api/documents/:id
     *
     * vì backend hiện tại chưa có endpoint đó.
     *
     * Dùng:
     *
     * GET /api/features/document/:id
     */

    const data = await featureStore.loadDetail(documentId);

    renderDocument(data);

    renderComments(data.comments || []);
  } catch (error) {
    console.error(error);

    detailElement.innerHTML = `
            <div class="empty">

                Không thể tải tài liệu.

                <br>

                ${escapeHtml(error.message)}

            </div>
        `;
  }
}

function renderDocument(data) {
  const document = data.document;

  const rating = data.rating || {
    avg: 0,
    count: 0,
    mine: 0,
  };

  if (!document) {
    detailElement.innerHTML = `
            <div class="empty">
                Không tìm thấy tài liệu.
            </div>
        `;

    return;
  }

  const type = document.type || "Tài liệu";

  const ratingText = rating.avg
    ? `${Number(rating.avg).toFixed(1)} ⭐`
    : "Chưa có đánh giá";

  detailElement.innerHTML = `

        <div class="detail-top">

            <div class="detail-main">

                <span class="detail-type">

                    ${escapeHtml(type)}

                </span>


                <h1 class="detail-title">

                    ${escapeHtml(document.title)}

                </h1>


                <p class="detail-description">

                    ${escapeHtml(document.description || "Chưa có mô tả.")}

                </p>


                <div class="detail-meta">

                    <div>
                        👤 Người đăng:
                        <strong>
                            ${escapeHtml(document.uploader?.name || "Ẩn danh")}
                        </strong>
                    </div>


                    <div>
                        📄 File:
                        ${escapeHtml(document.originalName || "")}
                    </div>


                    <div>
                        💾 Kích thước:
                        ${formatSize(document.fileSize || 0)}
                    </div>


                    <div>
                        📅 Ngày đăng:
                        ${formatDate(document.createdAt)}
                    </div>


                    <div>
                        ⬇ Lượt tải:
                        ${document.downloads || 0}
                    </div>

                </div>


                <div class="detail-rating">

                    ⭐ ${ratingText}

                    <span class="muted">

                        (${rating.count || 0}
                        lượt đánh giá)

                    </span>

                </div>


                <div class="rating-form">

                    <button data-rating="1">
                        1 ⭐
                    </button>

                    <button data-rating="2">
                        2 ⭐
                    </button>

                    <button data-rating="3">
                        3 ⭐
                    </button>

                    <button data-rating="4">
                        4 ⭐
                    </button>

                    <button data-rating="5">
                        5 ⭐
                    </button>

                </div>

            </div>


            <div class="detail-actions">

                <a
                    class="btn btn-primary"
                    href="${documentService.downloadUrl(document._id)}"
                >
                    ⬇ Tải xuống
                </a>


                <button
                    id="favoriteButton"
                    class="btn btn-outline"
                >
                    ♡ Yêu thích
                </button>


                <button
                    id="reportButton"
                    class="btn btn-outline"
                >
                    🚩 Báo cáo
                </button>

            </div>

        </div>

    `;

  document.querySelectorAll("[data-rating]").forEach((button) => {
    button.addEventListener("click", () => {
      rateDocument(Number(button.dataset.rating));
    });
  });

  document
    .getElementById("favoriteButton")
    .addEventListener("click", toggleFavorite);

  document
    .getElementById("reportButton")
    .addEventListener("click", reportDocument);
}

async function rateDocument(score) {
  try {
    await featureStore.rate(documentId, score);

    alert("Đã ghi nhận đánh giá của bạn.");

    await loadDocument();
  } catch (error) {
    alert(error.message);
  }
}

async function toggleFavorite() {
  try {
    const favorite = await featureStore.toggleFavorite(documentId);

    alert(favorite ? "Đã thêm vào yêu thích." : "Đã bỏ khỏi yêu thích.");
  } catch (error) {
    alert(error.message);
  }
}

async function reportDocument() {
  const reason = prompt("Nhập lý do báo cáo tài liệu:");

  if (!reason) {
    return;
  }

  try {
    await featureStore.addReport(documentId, reason);

    alert("Đã gửi báo cáo.");
  } catch (error) {
    alert(error.message);
  }
}

function renderComments(comments) {
  commentCount.textContent = `${comments.length} bình luận`;

  if (!comments.length) {
    commentList.innerHTML = `
            <div class="empty">
                Chưa có bình luận nào.
            </div>
        `;

    return;
  }

  commentList.innerHTML = comments
    .map(
      (comment) => `

            <article class="comment-item">

                <div class="comment-author">

                    ${escapeHtml(
                      comment.user?.name || comment.author?.name || "Ẩn danh",
                    )}

                </div>


                <div class="comment-date">

                    ${comment.createdAt ? formatDate(comment.createdAt) : ""}

                </div>


                <div>

                    ${escapeHtml(comment.content || "")}

                </div>

            </article>

        `,
    )
    .join("");
}

commentForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const content = commentInput.value.trim();

  if (!content) {
    alert("Vui lòng nhập bình luận.");

    return;
  }

  try {
    const result = await featureStore.addComment(documentId, content);

    commentInput.value = "";

    renderComments(result.comments || []);
  } catch (error) {
    alert(error.message);
  }
});
