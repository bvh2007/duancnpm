import { API_BASE } from "../config.js";
import SessionStore from "../services/SessionStore.js";
import ApiClient from "../services/ApiClient.js";
import FeatureStore from "../services/FeatureStore.js";

const session = new SessionStore();
const api = new ApiClient(API_BASE, session);
const features = new FeatureStore(api);

const detailContent = document.getElementById("detailContent");

const params = new URLSearchParams(window.location.search);
const id = params.get("id");

function escapeHtml(value = "") {
  return String(value).replace(
    /[&<>'"]/g,
    (char) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "'": "&#39;",
        '"': "&quot;",
      })[char],
  );
}

function formatDate(value) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("vi-VN");
}

function renderDetail(data) {
  const documentData = data.document || data;

  const rating = data.rating || {
    avg: 0,
    count: 0,
    mine: 0,
  };

  const comments = data.comments || [];

  detailContent.innerHTML = `
    <article class="detail-box">

      <div class="detail-head">

        <div class="detail-file-icon">
          📄
        </div>

        <div>

          <span class="tag">
            ${escapeHtml(documentData.type || "Tài liệu")}
          </span>

          <h1 class="detail-title">
            ${escapeHtml(documentData.title || "Không có tiêu đề")}
          </h1>

          <p class="detail-description">
            ${escapeHtml(documentData.description || "Chưa có mô tả")}
          </p>

        </div>

      </div>

      <div class="detail-meta">

        <span>
          📚 Môn:
          <b>${escapeHtml(documentData.subject || "Chưa cập nhật")}</b>
        </span>

        <span>
          👤 Người đăng:
          <b>
            ${escapeHtml(documentData.uploader?.name || "Ẩn danh")}
          </b>
        </span>

        <span>
          ⬇ ${documentData.downloads || 0} lượt tải
        </span>

        <span>
          📅 ${formatDate(documentData.createdAt)}
        </span>

      </div>

      <div class="detail-actions">

        <a
          class="btn btn-primary"
          href="${API_BASE}/documents/${id}/download"
        >
          ⬇ Tải tài liệu
        </a>

        <button
          class="btn btn-outline"
          id="favoriteBtn"
        >
          ❤️ Yêu thích
        </button>

      </div>

      <div class="rating-box">

        <h3>⭐ Đánh giá tài liệu</h3>

        <p>
          Điểm trung bình:
          <b>
            ${rating.avg ? rating.avg.toFixed(1) : "Chưa có"}
          </b>
          (${rating.count || 0} lượt đánh giá)
        </p>

        <div class="rating-stars">

          ${[1, 2, 3, 4, 5]
            .map(
              (number) => `
            <button
              data-rating="${number}"
              title="Đánh giá ${number} sao"
            >
              ${number <= (rating.mine || 0) ? "★" : "☆"}
            </button>
          `,
            )
            .join("")}

        </div>

      </div>

      <div class="comments-section">

        <h2>
          💬 Bình luận (${comments.length})
        </h2>

        <div class="comments-list">

          ${
            comments.length
              ? comments
                  .map(
                    (comment) => `
                  <div class="comment">

                    <strong>
                      ${escapeHtml(comment.user || "Ẩn danh")}
                    </strong>

                    <p>
                      ${escapeHtml(comment.text || comment.content || "")}
                    </p>

                    <small>
                      ${formatDate(comment.at || comment.createdAt)}
                    </small>

                  </div>
                `,
                  )
                  .join("")
              : `
                <p class="muted">
                  Chưa có bình luận.
                </p>
              `
          }

        </div>

        ${
          session.user
            ? `
              <form class="comment-form" id="commentForm">

                <input
                  id="commentInput"
                  type="text"
                  placeholder="Viết bình luận..."
                  required
                >

                <button class="btn btn-primary">
                  Gửi
                </button>

              </form>
            `
            : `
              <p class="muted">
                Đăng nhập để bình luận.
              </p>
            `
        }

      </div>

    </article>
  `;

  bindEvents(id);
}

async function loadDetail() {
  if (!id) {
    detailContent.innerHTML = `
      <div class="detail-error">
        Không tìm thấy mã tài liệu.
      </div>
    `;
    return;
  }

  try {
    const data = await features.loadDetail(id);

    renderDetail(data);
  } catch (error) {
    console.error(error);

    detailContent.innerHTML = `
      <div class="detail-error">
        Không thể tải tài liệu.
        <br>
        ${escapeHtml(error.message)}
      </div>
    `;
  }
}

function bindEvents(documentId) {
  document.querySelectorAll("[data-rating]").forEach((button) => {
    button.addEventListener("click", async () => {
      if (!session.user) {
        alert("Bạn cần đăng nhập để đánh giá.");
        return;
      }

      try {
        await features.rate(documentId, Number(button.dataset.rating));

        await loadDetail();
      } catch (error) {
        alert(error.message);
      }
    });
  });

  document
    .getElementById("favoriteBtn")
    ?.addEventListener("click", async () => {
      if (!session.user) {
        alert("Bạn cần đăng nhập để lưu yêu thích.");
        return;
      }

      try {
        const result = await features.toggleFavorite(documentId);

        alert(result ? "Đã thêm vào yêu thích." : "Đã bỏ khỏi yêu thích.");
      } catch (error) {
        alert(error.message);
      }
    });

  document
    .getElementById("commentForm")
    ?.addEventListener("submit", async (event) => {
      event.preventDefault();

      const input = document.getElementById("commentInput");

      const content = input.value.trim();

      if (!content) return;

      try {
        await features.addComment(documentId, content);

        await loadDetail();
      } catch (error) {
        alert(error.message);
      }
    });
}

loadDetail();
