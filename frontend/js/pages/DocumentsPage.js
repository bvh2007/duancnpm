const params = new URLSearchParams(window.location.search);

const subjectFromUrl = params.get("subject");
import { API_BASE } from "../config.js";
import SessionStore from "../services/SessionStore.js";
import ApiClient from "../services/ApiClient.js";
import DocumentService from "../services/DocumentService.js";
import FeatureStore from "../services/FeatureStore.js";
import DocumentList from "../components/DocumentList.js";

const session = new SessionStore();

const api = new ApiClient(API_BASE, session);

const documentService = new DocumentService(api);

const featureStore = new FeatureStore(api);

const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");

const typeFilter = document.getElementById("typeFilter");
const tagFilter = document.getElementById("tagFilter");

const docListElement = document.getElementById("docList");
const countText = document.getElementById("countText");

let currentUser = session.user;

const documentList = new DocumentList(docListElement, countText, {
  downloadUrl: (id) => documentService.downloadUrl(id),

  onDelete: async (id) => {
    if (!confirm("Bạn có chắc muốn xóa tài liệu này?")) {
      return;
    }

    try {
      await documentService.remove(id);

      await loadDocuments();
    } catch (error) {
      alert(error.message);
    }
  },

  onDownload: () => {},

  onDetail: (id) => {
    window.location.href = `document-detail.html?id=${encodeURIComponent(id)}`;
  },

  onFavorite: async (id) => {
    try {
      await featureStore.toggleFavorite(id);

      await loadDocuments();
    } catch (error) {
      alert(error.message);
    }
  },

  onReport: async (id) => {
    const reason = prompt("Nhập lý do báo cáo:");

    if (!reason) {
      return;
    }

    try {
      await featureStore.addReport(id, reason);

      alert("Đã gửi báo cáo.");
    } catch (error) {
      alert(error.message);
    }
  },
});

async function loadDocuments() {
  try {
    const keyword = searchInput.value.trim();

    const filters = {
      type: typeFilter.value,
      tag: tagFilter.value.trim(),
    };

    const documents = await documentService.list(keyword, filters);

    featureStore.setDocumentRatings(documents);

    documentList.render(documents, currentUser, featureStore);
  } catch (error) {
    console.error(error);

    documentList.renderError(error.message);
  }
}

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();

  loadDocuments();
});

typeFilter.addEventListener("change", loadDocuments);

tagFilter.addEventListener("change", loadDocuments);

loadDocuments();
