import { API_BASE } from "../config.js";
import ApiClient from "../services/ApiClient.js";
import DocumentService from "../services/DocumentService.js";
import FeatureStore from "../services/FeatureStore.js";
import SessionStore from "../services/SessionStore.js";

const session = new SessionStore();
const api = new ApiClient(API_BASE, session);
const featureStore = new FeatureStore(api);
const documentService = new DocumentService(api);
const workspace = document.getElementById("collectionWorkspace");
const list = document.getElementById("collectionList");
const savedDocuments = document.getElementById("savedDocuments");
const select = document.getElementById("collectionSelect");
const status = document.getElementById("collectionStatus");
const form = document.getElementById("collectionForm");
const nameInput = document.getElementById("collectionName");
const descriptionInput = document.getElementById("collectionDescription");
const searchForm = document.getElementById("documentSearchForm");
const searchInput = document.getElementById("documentSearch");
const results = document.getElementById("documentResults");
const documentIdFromUrl = new URLSearchParams(location.search).get("documentId");

let collections = [];
let selectedId = new URLSearchParams(location.search).get("collectionId") || "";
let documents = [];
let editingId = "";

function escapeHtml(value = "") {
  return String(value).replace(/[&<>'"]/g, (char) =>
    ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    })[char],
  );
}

function setStatus(message, isError = false) {
  status.textContent = message;
  status.classList.toggle("error", isError);
}

function resetForm() {
  editingId = "";
  form.reset();
  document.getElementById("collectionFormTitle").textContent = "Tạo bộ sưu tập";
  document.getElementById("collectionSubmit").textContent = "Tạo bộ sưu tập";
  document.getElementById("collectionCancel").hidden = true;
}

async function loadCollections() {
  collections = await featureStore.collections();
  if (!collections.some((item) => item.id === selectedId)) {
    selectedId = collections[0]?.id || "";
  }
  renderCollections();
  await loadSelectedCollection();
}

function renderCollections() {
  document.getElementById("collectionCount").textContent =
    `${collections.length} bộ sưu tập`;
  select.innerHTML = collections.length
    ? collections
        .map((item) => `<option value="${escapeHtml(item.id)}">${escapeHtml(item.name)}</option>`)
        .join("")
    : '<option value="">Chưa có bộ sưu tập</option>';
  select.value = selectedId;
  select.disabled = collections.length === 0;
  list.innerHTML = collections.length
    ? collections
        .map(
          (item) => `
            <article class="collection-card ${item.id === selectedId ? "selected" : ""}">
              <button class="collection-card-main" type="button" data-action="select" data-id="${escapeHtml(item.id)}">
                <strong>${escapeHtml(item.name)}</strong>
                <span>${escapeHtml(item.description || "Chưa có mô tả")}</span>
                <small>${Number(item.documentCount) || 0} tài liệu</small>
              </button>
              <div class="collection-card-actions">
                <button class="btn btn-outline btn-sm" type="button" data-action="edit" data-id="${escapeHtml(item.id)}">Sửa</button>
                <button class="btn btn-danger btn-sm" type="button" data-action="delete" data-id="${escapeHtml(item.id)}">Xóa</button>
              </div>
            </article>`,
        )
        .join("")
    : '<p class="empty">Bạn chưa có bộ sưu tập. Hãy tạo bộ sưu tập đầu tiên.</p>';
}

async function loadSelectedCollection() {
  if (!selectedId) {
    savedDocuments.innerHTML = "";
    return;
  }
  const collection = await featureStore.collection(selectedId);
  savedDocuments.innerHTML = `
    <div class="collection-detail-heading">
      <h3>${escapeHtml(collection.name)}</h3>
      <span>${collection.documents.length} tài liệu</span>
    </div>
    ${
      collection.documents.length
        ? collection.documents
            .map(
              (doc) => `
                <article class="saved-document">
                  <div>
                    <a href="document-detail.html?id=${encodeURIComponent(doc.id)}">${escapeHtml(doc.title)}</a>
                    <small>${escapeHtml(doc.subject || "Chưa phân môn")} · ${escapeHtml(doc.originalName || "")}</small>
                  </div>
                  <button class="btn btn-outline btn-sm" type="button" data-action="remove-document" data-id="${escapeHtml(doc.id)}">Gỡ khỏi bộ sưu tập</button>
                </article>`,
            )
            .join("")
        : '<p class="empty">Chưa lưu tài liệu nào trong bộ sưu tập này.</p>'
    }`;
}

async function loadDocuments(keyword = "") {
  try {
    documents = await documentService.list(keyword);
    if (documentIdFromUrl) {
      documents = documents.filter((doc) => String(doc._id) === String(documentIdFromUrl));
    }
    renderDocuments();
  } catch (error) {
    results.innerHTML = `<p class="empty">Không thể tải tài liệu: ${escapeHtml(error.message)}</p>`;
  }
}

function renderDocuments() {
  results.innerHTML = documents.length
    ? documents
        .map(
          (doc) => `
            <article class="collection-document">
              <div>
                <strong>${escapeHtml(doc.title)}</strong>
                <small>${escapeHtml(doc.subject || "Chưa phân môn")} · ${escapeHtml(doc.originalName || "")}</small>
              </div>
              <button class="btn btn-primary btn-sm" type="button" data-action="save-document" data-id="${escapeHtml(doc._id)}" ${selectedId ? "" : "disabled"}>
                Lưu vào bộ sưu tập
              </button>
            </article>`,
        )
        .join("")
    : '<p class="empty">Không tìm thấy tài liệu đã được duyệt.</p>';
}

if (!session.user) {
  document.getElementById("authMessage").hidden = false;
} else {
  workspace.hidden = false;
  loadCollections()
    .then(() => (documentIdFromUrl ? loadDocuments() : undefined))
    .catch((error) => setStatus(error.message, true));
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("");
  try {
    if (editingId) {
      await featureStore.updateCollection(editingId, nameInput.value, descriptionInput.value);
      selectedId = editingId;
      setStatus("Đã cập nhật bộ sưu tập.");
    } else {
      const created = await featureStore.createCollection(nameInput.value, descriptionInput.value);
      selectedId = created.id;
      setStatus("Đã tạo bộ sưu tập.");
    }
    resetForm();
    await loadCollections();
    renderDocuments();
  } catch (error) {
    setStatus(error.message, true);
  }
});

document.getElementById("collectionCancel").addEventListener("click", resetForm);

list.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button) return;
  const collection = collections.find((item) => item.id === button.dataset.id);
  if (!collection) return;
  if (button.dataset.action === "select") {
    selectedId = collection.id;
    renderCollections();
    try {
      await loadSelectedCollection();
      renderDocuments();
    } catch (error) {
      setStatus(error.message, true);
    }
  } else if (button.dataset.action === "edit") {
    editingId = collection.id;
    nameInput.value = collection.name;
    descriptionInput.value = collection.description || "";
    document.getElementById("collectionFormTitle").textContent = "Chỉnh sửa bộ sưu tập";
    document.getElementById("collectionSubmit").textContent = "Lưu thay đổi";
    document.getElementById("collectionCancel").hidden = false;
    nameInput.focus();
  } else if (button.dataset.action === "delete") {
    if (!confirm(`Xóa bộ sưu tập "${collection.name}" và danh sách tài liệu đã lưu?`)) return;
    try {
      await featureStore.deleteCollection(collection.id);
      if (editingId === collection.id) resetForm();
      setStatus("Đã xóa bộ sưu tập.");
      await loadCollections();
      renderDocuments();
    } catch (error) {
      setStatus(error.message, true);
    }
  }
});

select.addEventListener("change", async () => {
  selectedId = select.value;
  renderCollections();
  try {
    await loadSelectedCollection();
    renderDocuments();
  } catch (error) {
    setStatus(error.message, true);
  }
});

savedDocuments.addEventListener("click", async (event) => {
  const button = event.target.closest('[data-action="remove-document"]');
  if (!button || !selectedId) return;
  try {
    await featureStore.removeDocumentFromCollection(selectedId, button.dataset.id);
    await loadCollections();
    setStatus("Đã gỡ tài liệu khỏi bộ sưu tập.");
  } catch (error) {
    setStatus(error.message, true);
  }
});

searchForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await loadDocuments(searchInput.value.trim());
});

results.addEventListener("click", async (event) => {
  const button = event.target.closest('[data-action="save-document"]');
  if (!button || !selectedId) return;
  button.disabled = true;
  try {
    await featureStore.addDocumentToCollection(selectedId, button.dataset.id);
    await loadCollections();
    setStatus("Đã lưu tài liệu vào bộ sưu tập.");
  } catch (error) {
    setStatus(error.message, true);
  } finally {
    button.disabled = false;
  }
});
