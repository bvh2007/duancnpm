import { API_BASE } from "../config.js";

import SessionStore from "../services/SessionStore.js";

import ApiClient from "../services/ApiClient.js";

import DocumentService from "../services/DocumentService.js";

import FeatureStore from "../services/FeatureStore.js";

import DocumentList from "../components/DocumentList.js";

const session = new SessionStore();

const api = new ApiClient(API_BASE, session);

const documentService = new DocumentService(api);

const features = new FeatureStore(api);

const listElement = document.getElementById("docList");

const countElement = document.getElementById("countText");

const searchInput = document.getElementById("searchInput");

const searchForm = document.getElementById("searchForm");

const typeFilter = document.getElementById("typeFilter");

const facultyFilter = document.getElementById("facultyFilter");

const subjectFilter = document.getElementById("subjectFilter");

const docList = new DocumentList(listElement, countElement, {
  downloadUrl: (id) => documentService.downloadUrl(id),

  onDelete: () => loadDocuments(),

  onDownload: () => {},

  onDetail: (id) => (window.location.href = `document-detail.html?id=${id}`),

  onFavorite: async (id) => {
    if (!session.user) {
      alert("Vui lòng đăng nhập để lưu yêu thích.");

      return;
    }

    try {
      await features.toggleFavorite(id);

      await loadDocuments();
    } catch (error) {
      alert(error.message);
    }
  },

  onReport: () => {},
});

async function loadDocuments() {
  try {
    const keyword = searchInput.value.trim();

    const filters = {
      type: typeFilter.value,

      faculty: facultyFilter.value,

      subject: subjectFilter.value,
    };

    const documents = await documentService.list(keyword, filters);

    features.setDocumentRatings(documents);

    docList.render(documents, session.user, features);
  } catch (error) {
    console.error(error);

    docList.renderError(error.message);
  }
}

/* SEARCH */

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();

  loadDocuments();
});

/* FILTER */

typeFilter.addEventListener("change", loadDocuments);

facultyFilter.addEventListener("change", loadDocuments);

subjectFilter.addEventListener("change", loadDocuments);

/* INITIAL LOAD */

loadDocuments();
