import { API_BASE } from "../config.js";
import SessionStore from "../services/SessionStore.js";
import ApiClient from "../services/ApiClient.js";
import DocumentService from "../services/DocumentService.js";

const session = new SessionStore();
const api = new ApiClient(API_BASE, session);
const documentService = new DocumentService(api);

const grid = document.getElementById("subjectsGrid");

const icons = {
  "Lập trình": "💻",
  "Cơ sở dữ liệu": "🗄️",
  "Mạng máy tính": "🌐",
  Toán: "📐",
  "Kinh tế": "📈",
  "Ngoại ngữ": "🌎",
};

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

async function loadSubjects() {
  try {
    const documents = await documentService.list();

    const map = {};

    documents.forEach((document) => {
      const subject = document.subject;

      if (!subject) return;

      if (!map[subject]) {
        map[subject] = 0;
      }

      map[subject]++;
    });

    const subjects = Object.entries(map);

    if (!subjects.length) {
      grid.innerHTML = `
        <div class="empty">
          Chưa có dữ liệu môn học.
        </div>
      `;

      return;
    }

    grid.innerHTML = subjects
      .map(
        ([subject, count]) => `

        <article class="subject-card">

          <div class="subject-icon">
            ${icons[subject] || "📚"}
          </div>

          <h3>
            ${escapeHtml(subject)}
          </h3>

          <p>
            ${count} tài liệu
          </p>

          <a
            class="btn btn-primary"
            href="documents.html?subject=${encodeURIComponent(subject)}"
          >
            Xem tài liệu
          </a>

        </article>

      `,
      )
      .join("");
  } catch (error) {
    console.error(error);

    grid.innerHTML = `
      <div class="empty">
        Không thể tải danh sách môn học.
        <br>
        ${escapeHtml(error.message)}
      </div>
    `;
  }
}

loadSubjects();
