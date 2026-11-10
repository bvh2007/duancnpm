import { API_BASE } from "../config.js";
export default class DocumentService {
  constructor(api) {
    this.api = api;
  }
  list(keyword = "", filters = {}) {
    const p = new URLSearchParams();
    if (keyword) p.set("q", keyword);
    if (filters.subject) p.set("subject", filters.subject);
    if (filters.faculty) p.set("faculty", filters.faculty);
    if (filters.type) p.set("type", filters.type);
    if (filters.tag) p.set("tag", filters.tag);
    return this.api.get("/documents?" + p.toString());
  }
  upload({ title, subject, description, file, type, tags, categoryId }) {
    const f = new FormData();
    f.append("title", title);
    f.append("subject", subject);
    f.append("description", description);
    f.append("type", type || "Tài liệu");
    f.append("tags", tags || "");
    f.append("categoryId", categoryId || 1);
    f.append("file", file);
    return this.api.post("/documents", f);
  }
  remove(id) {
    return this.api.delete("/documents/" + id);
  }
  async download(id) {
    const token = this.api.session.token;

    const response = await fetch(`${API_BASE}/documents/${id}/download`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.message || "Không thể tải tài liệu");
    }

    const blob = await response.blob();

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = "";

    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }
}
