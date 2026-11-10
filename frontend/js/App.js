import { API_BASE } from "./config.js";
import SessionStore from "./services/SessionStore.js";
import ApiClient from "./services/ApiClient.js";
import AuthService from "./services/AuthService.js";
import DocumentService from "./services/DocumentService.js";
import FeatureStore from "./services/FeatureStore.js";
import Toast from "./components/Toast.js";
import Navbar from "./components/Navbar.js";
import AuthModal from "./components/AuthModal.js";
import UploadModal from "./components/UploadModal.js";
import DocumentList from "./components/DocumentList.js";

export default class App {
  constructor() {
    const session = new SessionStore();
    const api = new ApiClient(API_BASE, session);
    this.authService = new AuthService(api, session);
    this.documentService = new DocumentService(api);
    this.features = new FeatureStore(api);
    this.docs = [];
    this.toast = new Toast("toast");
    this.navbar = new Navbar(document.getElementById("navActions"), {
      onLogin: () => this.authModal.show("login"),
      onRegister: () => this.authModal.show("register"),
      onUpload: () => this.uploadModal.open(),
      onLogout: () => this.handleLogout(),
      onProfile: () => this.showProfile(),
      onNotifications: () => this.showNotifications(),
      onAdmin: () => this.showAdmin(),
    });
    this.authModal = new AuthModal("authModal", {
      authService: this.authService,
      toast: this.toast,
      onSuccess: () => this.refresh(),
    });
    this.uploadModal = new UploadModal("uploadModal", {
      documentService: this.documentService,
      toast: this.toast,
      onSuccess: () => {
        this.searchInput.value = "";
        this.loadDocuments();
      },
    });
    this.docList = new DocumentList(
      document.getElementById("docList"),
      document.getElementById("countText"),
      {
        onDownload: async (id) => {
          try {
            await this.documentService.download(id);
            await this.loadDocuments();
          } catch (error) {
            this.toast.error(error.message);
          }
        },
        onDelete: (id) => this.handleDelete(id),
        onDetail: (id) => this.showDetail(id),
        onFavorite: (id) => this.toggleFavorite(id),
        onReport: (id) => this.report(id),
      },
    );
    this.searchInput = document.getElementById("searchInput");
    this.bindFilters();
  }
  start() {
    document.getElementById("searchForm").addEventListener("submit", (e) => {
      e.preventDefault();
      this.loadDocuments();
    });
    document.querySelectorAll("[data-quick-search]").forEach((b) =>
      b.addEventListener("click", () => {
        this.searchInput.value = b.dataset.quickSearch;
        this.loadDocuments();
        window.scrollTo({ top: 500, behavior: "smooth" });
      }),
    );
    this.refresh();
  }
  async refresh() {
    await this.features.sync();
    this.navbar.render(
      this.authService.currentUser,
      this.features.notifications().filter((n) => !n.read).length,
    );
    this.loadDocuments();
  }
  async loadDocuments() {
    try {
      this.docs = await this.documentService.list(
        this.searchInput.value.trim(),
      );
      this.features.setDocumentRatings(this.docs);
      this.applyFilters();
    } catch (err) {
      this.docList.renderError(err.message);
    }
  }
  applyFilters() {
    const q = document
      .getElementById("inlineSearch")
      .value.trim()
      .toLowerCase();
    const subject = document.getElementById("subjectFilter").value;
    const faculty = document.getElementById("facultyFilter").value;
    const type = document.getElementById("typeFilter").value;
    const sort = document.getElementById("sortFilter").value;
    let docs = this.docs.filter(
      (d) =>
        (!q || `${d.title} ${d.description || ""}`.toLowerCase().includes(q)) &&
        (!subject || d.subject === subject) &&
        (!faculty || d.faculty === faculty) &&
        (!type ||
          (d.type || "").toLowerCase() === type.toLowerCase() ||
          (type === "Đề thi" && /đề/i.test(d.title))),
    );
    if (sort === "download")
      docs.sort((a, b) => (b.downloads || 0) - (a.downloads || 0));
    if (sort === "rating")
      docs.sort(
        (a, b) =>
          this.features.getRating(b._id).avg -
          this.features.getRating(a._id).avg,
      );
    if (sort === "name")
      docs.sort((a, b) => a.title.localeCompare(b.title, "vi"));
    this.populateSubjects();
    this.docList.render(docs, this.authService.currentUser, this.features);
    document.getElementById("statsRow").innerHTML =
      `<div><b>${this.docs.length}</b><span>Tài liệu</span></div><div><b>${this.docs.reduce((s, d) => s + (d.downloads || 0), 0)}</b><span>Lượt tải</span></div><div><b>${new Set(this.docs.map((d) => d.subject)).size}</b><span>Môn học</span></div><div><b>24/7</b><span>Truy cập</span></div>`;
  }
  populateSubjects() {
    const s = document.getElementById("subjectFilter");
    const current = s.value;
    const subjects = [
      ...new Set(this.docs.map((d) => d.subject).filter(Boolean)),
    ];
    s.innerHTML =
      '<option value="">Tất cả môn học</option>' +
      subjects.map((x) => `<option>${x}</option>`).join("");
    s.value = subjects.includes(current) ? current : "";
  }
  bindFilters() {
    [
      "inlineSearch",
      "facultyFilter",
      "subjectFilter",
      "typeFilter",
      "sortFilter",
    ].forEach((id) =>
      document
        .getElementById(id)
        .addEventListener(id === "inlineSearch" ? "input" : "change", () =>
          this.applyFilters(),
        ),
    );
    document.getElementById("clearFilters").addEventListener("click", () => {
      ["inlineSearch", "facultyFilter", "subjectFilter", "typeFilter"].forEach(
        (id) => (document.getElementById(id).value = ""),
      );
      document.getElementById("sortFilter").value = "new";
      this.applyFilters();
    });
    document.querySelectorAll("[data-tag]").forEach((b) =>
      b.addEventListener("click", () => {
        this.searchInput.value = b.dataset.tag;
        this.loadDocuments();
      }),
    );
    document.querySelectorAll(".view-toggle button").forEach((b) =>
      b.addEventListener("click", () => {
        document
          .querySelectorAll(".view-toggle button")
          .forEach((x) => x.classList.remove("active"));
        b.classList.add("active");
        document
          .getElementById("docList")
          .classList.toggle("list-view", b.dataset.view === "list");
      }),
    );
  }
  handleLogout() {
    this.authService.logout();
    this.toast.show("Đã đăng xuất");
    this.refresh();
  }
  async handleDelete(id) {
    if (!confirm("Bạn chắc chắn muốn xóa tài liệu này?")) return;
    try {
      await this.documentService.remove(id);
      this.toast.show("Đã xóa tài liệu");
      this.loadDocuments();
    } catch (err) {
      if (err.status === 401) this.handleLogout();
      this.toast.error(err.message);
    }
  }
  async toggleFavorite(id) {
    if (!this.authService.currentUser) {
      this.authModal.show("login");
      return;
    }
    try {
      const yes = await this.features.toggleFavorite(id);
      this.toast.show(yes ? "❤️ Đã lưu vào yêu thích" : "Đã bỏ khỏi yêu thích");
      this.navbar.render(
        this.authService.currentUser,
        this.features.notifications().filter((n) => !n.read).length,
      );
      this.applyFilters();
    } catch (err) {
      this.toast.error(err.message);
    }
  }
  async showDetail(id) {
    const d = this.docs.find((x) => String(x._id) === String(id));
    if (!d) return;
    try {
      const detail = await this.features.loadDetail(id);
      const r = detail.rating,
        comments = detail.comments;
      document.getElementById("detailContent").innerHTML =
        `<div class="detail-head"><div class="file-icon big">📄</div><div><span class="tag">${escapeHtml(d.subject || "Khác")}</span><h2>${escapeHtml(d.title)}</h2><p class="muted">${escapeHtml(d.description || "Chưa có mô tả")}</p></div></div><div class="detail-stats"><span>⬇ ${d.downloads || 0} lượt tải</span><span>⭐ ${r.avg ? r.avg.toFixed(1) : "Chưa có"} (${r.count})</span><span>📅 ${formatDate(d.createdAt)}</span></div><div class="rating-box"><b>Đánh giá tài liệu</b><div class="stars">${[1, 2, 3, 4, 5].map((n) => `<button data-rate="${n}" data-id="${id}">${n <= r.mine ? "★" : "☆"}</button>`).join("")}</div><small>${r.mine ? "Bạn đã chấm " + r.mine + "/5" : "Chọn số sao để đánh giá"}</small></div><div class="comment-box"><h3>💬 Bình luận (${comments.length})</h3><div class="comments">${comments.length ? comments.map((c) => `<div class="comment"><b>${escapeHtml(c.user)}</b><p>${escapeHtml(c.text)}</p><small>${formatDate(c.at)}</small></div>`).join("") : '<p class="muted">Chưa có bình luận.</p>'}</div>${this.authService.currentUser ? '<form id="commentForm"><input id="commentInput" placeholder="Viết bình luận..." required><button class="btn btn-primary btn-sm">Gửi</button></form>' : '<p class="muted">Đăng nhập để bình luận.</p>'}</div><div class="detail-actions"><button
  type="button"
  class="btn btn-primary"
  id="modalDownloadBtn"
>
  ⬇ Tải tài liệu
</button><button class="btn btn-outline" data-modal-fav="${id}">❤️ Yêu thích</button></div>`;
      this.openModal("detailModal");
      document
        .getElementById("modalDownloadBtn")
        ?.addEventListener("click", async () => {
          try {
            await this.documentService.download(id);
            await this.loadDocuments();
          } catch (error) {
            this.toast.error(error.message);
          }
        });
      document.querySelectorAll("[data-rate]").forEach(
        (b) =>
          (b.onclick = async () => {
            if (!this.authService.currentUser) {
              this.authModal.show("login");
              return;
            }
            try {
              await this.features.rate(id, Number(b.dataset.rate));
              this.toast.show("⭐ Đã lưu đánh giá");
              await this.showDetail(id);
              this.applyFilters();
            } catch (e) {
              this.toast.error(e.message);
            }
          }),
      );
      document
        .getElementById("commentForm")
        ?.addEventListener("submit", async (e) => {
          e.preventDefault();
          try {
            await this.features.addComment(
              id,
              document.getElementById("commentInput").value.trim(),
            );
            await this.showDetail(id);
          } catch (err) {
            this.toast.error(err.message);
          }
        });
      document
        .querySelector("[data-modal-fav]")
        ?.addEventListener("click", () => this.toggleFavorite(id));
    } catch (e) {
      this.toast.error(e.message);
    }
  }
  async report(id) {
    if (!this.authService.currentUser) {
      this.authModal.show("login");
      return;
    }
    const reason = prompt(
      "Lý do báo cáo: sai nội dung, vi phạm bản quyền, spam...",
    );
    if (reason) {
      try {
        await this.features.addReport(id, reason);
        this.toast.show("🚩 Đã gửi báo cáo cho quản trị viên");
      } catch (e) {
        this.toast.error(e.message);
      }
    }
  }
  async showProfile() {
    const u = this.authService.currentUser;
    if (!u) return;
    const fav = this.features.data.favorites;
    const mine = this.docs.filter((d) => d.uploader && d.uploader._id === u.id);
    document.getElementById("profileContent").innerHTML =
      `<h2>👤 Hồ sơ của tôi</h2><div class="profile-grid"><div class="profile-card"><div class="avatar-large">${escapeHtml((u.name || "U")[0].toUpperCase())}</div><h3>${escapeHtml(u.name)}</h3><p>${escapeHtml(u.email)}</p><span class="role-pill">${u.role || "student"}</span></div><div class="profile-stats"><div><b>${mine.length}</b><span>Tài liệu đã tải lên</span></div><div><b>${fav.length}</b><span>Tài liệu yêu thích</span></div><div><b>${this.features.notifications().length}</b><span>Thông báo</span></div></div></div>`;
    this.openModal("profileModal");
  }
  showNotifications() {
    const ns = this.features.notifications();
    document.getElementById("notificationContent").innerHTML =
      `<h2>🔔 Thông báo</h2>${
        ns.length
          ? ns
              .slice(0, 12)
              .map(
                (n) =>
                  `<div class="notification-item"><span>🔵</span><div>${escapeHtml(n.text)}<small>${formatDate(n.at)}</small></div></div>`,
              )
              .join("")
          : '<p class="muted">Chưa có thông báo.</p>'
      }`;
    this.openModal("notificationModal");
  }
  async showAdmin() {
    try {
      const data = await this.features.admin();
      document.getElementById("adminContent").innerHTML =
        `<h2>🛡️ Trung tâm quản trị</h2><div class="admin-stats"><div><b>${data.stats.pending || 0}</b><span>Chờ duyệt</span></div><div><b>${data.reports || 0}</b><span>Báo cáo mở</span></div><div><b>${data.stats.total || 0}</b><span>Tổng tài liệu</span></div></div><h3>Tài liệu cần kiểm duyệt</h3>${data.pending.length ? data.pending.map((d) => `<div class="admin-row"><div><b>${escapeHtml(d.title)}</b><small>${escapeHtml(d.originalName || "")} · ${escapeHtml(d.uploader || "")}</small></div><div><button class="btn btn-primary btn-sm" data-review="${d.id}" data-approved="1">Duyệt</button><button class="btn btn-danger btn-sm" data-review="${d.id}" data-approved="0">Từ chối</button></div></div>`).join("") : '<p class="muted">Không có tài liệu chờ duyệt.</p>'}`;
      this.openModal("adminModal");
      document.querySelectorAll("[data-review]").forEach(
        (b) =>
          (b.onclick = async () => {
            const reason =
              b.dataset.approved === "0"
                ? prompt("Lý do từ chối:") || "Không đạt yêu cầu"
                : "";
            try {
              await this.features.review(
                b.dataset.review,
                b.dataset.approved === "1",
                reason,
              );
              this.toast.show(
                b.dataset.approved === "1"
                  ? "Đã duyệt tài liệu"
                  : "Đã từ chối tài liệu",
              );
              this.showAdmin();
              this.loadDocuments();
            } catch (e) {
              this.toast.error(e.message);
            }
          }),
      );
    } catch (e) {
      this.toast.error(e.message);
    }
  }
  openModal(id) {
    document.getElementById(id).classList.add("show");
    document
      .querySelectorAll(`#${id} [data-close]`)
      .forEach(
        (x) =>
          (x.onclick = () =>
            document.getElementById(id).classList.remove("show")),
      );
  }
}
function escapeHtml(s = "") {
  return String(s).replace(
    /[&<>'"]/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[
        c
      ],
  );
}
function formatDate(s) {
  return s ? new Date(s).toLocaleDateString("vi-VN") : "—";
}
