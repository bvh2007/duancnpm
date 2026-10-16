import { API_BASE } from "../config.js";
import SessionStore from "../services/SessionStore.js";
import ApiClient from "../services/ApiClient.js";
import FeatureStore from "../services/FeatureStore.js";

const session = new SessionStore();
const api = new ApiClient(API_BASE, session);
const features = new FeatureStore(api);

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

function formatPrice(price) {
  if (Number(price) === 0) {
    return "Miễn phí";
  }

  return `${Number(price).toLocaleString("vi-VN")} VNĐ`;
}

function getPlanClass(name) {
  const value = String(name).toLowerCase();

  if (value === "pro") return "pro";
  if (value === "vip") return "vip";

  return "free";
}

function renderPlanCard(plan, currentPlan) {
  const isCurrent =
    String(plan.name).toLowerCase() === String(currentPlan).toLowerCase();

  const planClass = getPlanClass(plan.name);

  let buttonHtml = "";

  if (isCurrent) {
    buttonHtml = `
      <span class="current-label">
        ✓ Gói hiện tại
      </span>
    `;
  } else if (Number(plan.price) === 0) {
    buttonHtml = `
      <button class="plan-btn" disabled>
        Gói miễn phí
      </button>
    `;
  } else {
    buttonHtml = `
      <button
        class="plan-btn"
        data-plan-id="${plan.id}"
      >
        Nâng cấp ${escapeHtml(plan.name)}
      </button>
    `;
  }

  const durationText =
    Number(plan.durationDays) > 0
      ? `${plan.durationDays} ngày`
      : "Không giới hạn";

  return `
    <article class="plan-card ${planClass} ${isCurrent ? "current" : ""}">
      ${isCurrent ? `<span class="current-label">✓ Đang sử dụng</span>` : ""}

      <h3>${escapeHtml(plan.name)}</h3>

      <div class="plan-price">
        ${formatPrice(plan.price)}
      </div>

      <div class="plan-duration">
        ${durationText}
      </div>

      <div class="plan-description">
        ${escapeHtml(plan.description || "")}
      </div>

      ${buttonHtml}
    </article>
  `;
}

async function loadProfile() {
  const user = session.user;

  if (!user) {
    content.innerHTML = `
      <div class="login-required">
        <h2>🔐 Bạn chưa đăng nhập</h2>
        <p>Vui lòng quay lại trang chủ để đăng nhập.</p>
        <a href="index.html" class="btn btn-primary">
          Về trang chủ
        </a>
      </div>
    `;
    return;
  }

  try {
    const [data, plans, subscription] = await Promise.all([
      features.sync(),
      features.plans(),
      features.subscription(),
    ]);

    const favorites = data.favorites || [];
    const notifications = data.notifications || [];

    const currentPlan = subscription?.plan || "Free";

    content.innerHTML = `
      <section class="profile-header">
        <div class="profile-avatar">
          ${escapeHtml((user.name || "U")[0].toUpperCase())}
        </div>

        <div class="profile-info">
          <h1>${escapeHtml(user.name)}</h1>

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
          <strong>${favorites.length}</strong>
          <span>Tài liệu yêu thích</span>
        </div>

        <div class="profile-stat">
          <strong>${notifications.length}</strong>
          <span>Thông báo</span>
        </div>

        <div class="profile-stat">
          <strong>—</strong>
          <span>Tài liệu đã tải lên</span>
        </div>
      </section>

      <section class="plan-section">
        <h2>Gói tài khoản</h2>

        <p>
          Chọn gói phù hợp để sử dụng thêm các tính năng của TàiLiệuSV.
        </p>

        <div class="plan-list">
          ${plans.map((plan) => renderPlanCard(plan, currentPlan)).join("")}
        </div>
      </section>
    `;

    document.querySelectorAll("[data-plan-id]").forEach((button) => {
      button.addEventListener("click", () => {
        const planId = button.dataset.planId;

        window.location.href = `payment.html?planId=${planId}`;
      });
    });
  } catch (error) {
    console.error(error);

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
