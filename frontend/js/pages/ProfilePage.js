import { API_BASE } from "../config.js";
import SessionStore from "../services/SessionStore.js";
import ApiClient from "../services/ApiClient.js";
import FeatureStore from "../services/FeatureStore.js";
import DocumentService from "../services/DocumentService.js";

const session = new SessionStore();

const api = new ApiClient(API_BASE, session);

const features = new FeatureStore(api);

const documentService = new DocumentService(api);

const content = document.getElementById("profileContent");

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

async function loadProfile() {
  const user = session.user;

  if (!user) {
    content.innerHTML = `
      <div class="login-required">

        <h2>🔐 Bạn chưa đăng nhập</h2>

        <p>
          Vui lòng quay lại trang chủ để đăng nhập.
        </p>

        <a
          href="index.html"
          class="btn btn-primary"
        >
          Về trang chủ
        </a>

      </div>
    `;

    return;
  }

  try {
    const data = await features.sync();

    const favorites = data.favorites || [];

    const notifications = data.notifications || [];

    content.innerHTML = `

      <section class="profile-header">

        <div class="profile-avatar">

          ${escapeHtml((user.name || "U")[0].toUpperCase())}

        </div>

        <div class="profile-info">

          <h1>
            ${escapeHtml(user.name)}
          </h1>

          <p>
            ${escapeHtml(user.email)}
          </p>

          <p>
            Vai trò:
            <b>${escapeHtml(user.role || "student")}</b>
          </p>

        </div>

      </section>


      <section class="profile-stats">

        <div class="profile-stat">

          <strong>
            ${favorites.length}
          </strong>

          <span>
            Tài liệu yêu thích
          </span>

        </div>


        <div class="profile-stat">

          <strong>
            ${notifications.length}
          </strong>

          <span>
            Thông báo
          </span>

        </div>


        <div class="profile-stat">

          <strong>
            —
          </strong>

          <span>
            Tài liệu đã tải lên
          </span>

        </div>

      </section>

    `;
  } catch (error) {
    content.innerHTML = `
      <div class="empty">
        Không thể tải hồ sơ.
        <br>
        ${escapeHtml(error.message)}
      </div>
    `;
  }
}

loadProfile();
