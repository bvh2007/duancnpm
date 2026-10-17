const slugify = (s) =>
  String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 240);
class DocumentRepository {
  constructor(db) {
    this.db = db;
  }
  async search({
    q = "",
    subject = "",
    faculty = "",
    type = "",
    tag = "",
    status = "approved",
  } = {}) {
    const p = [];
    let sql = `SELECT d.doc_id AS _id,d.title,d.description,d.original_filename AS originalName,d.file_path AS filePath,d.file_size AS fileSize,d.file_type AS fileType,d.document_type AS type,d.access_level AS accessLevel,d.download_count AS downloads,d.view_count AS views,d.rating_avg AS ratingAvg,d.rating_count AS ratingCount,d.status,d.created_at AS createdAt,d.updated_at AS updatedAt,u.user_id AS uploader_id,u.full_name AS uploader_name,s.name AS subject,f.name AS faculty,c.name AS category, GROUP_CONCAT(DISTINCT t.name ORDER BY t.name SEPARATOR ', ') AS tags FROM documents d JOIN users u ON u.user_id=d.uploader_id JOIN subjects s ON s.subject_id=d.subject_id JOIN faculties f ON f.faculty_id=s.faculty_id JOIN categories c ON c.category_id=d.category_id LEFT JOIN document_tags dt ON dt.doc_id=d.doc_id LEFT JOIN tags t ON t.tag_id=dt.tag_id WHERE d.deleted_at IS NULL`;
    if (status) {
      sql += " AND d.status=?";
      p.push(status);
    }
    if (q) {
      sql +=
        " AND (d.title LIKE ? OR d.description LIKE ? OR s.name LIKE ? OR EXISTS(SELECT 1 FROM document_tags dt2 JOIN tags t2 ON t2.tag_id=dt2.tag_id WHERE dt2.doc_id=d.doc_id AND t2.name LIKE ?))";
      const x = `%${q}%`;
      p.push(x, x, x, x);
    }
    if (subject) {
      sql += " AND s.name=?";
      p.push(subject);
    }
    if (faculty) {
      sql += " AND f.name=?";
      p.push(faculty);
    }
    if (type) {
      sql += " AND d.document_type=?";
      p.push(type);
    }
    if (tag) {
      sql +=
        " AND EXISTS(SELECT 1 FROM document_tags dt3 JOIN tags t3 ON t3.tag_id=dt3.tag_id WHERE dt3.doc_id=d.doc_id AND t3.name=?)";
      p.push(tag);
    }
    sql += " GROUP BY d.doc_id ORDER BY d.created_at DESC";
    const [r] = await this.db.pool.query(sql, p);
    return r.map((x) => ({
      ...x,
      _id: String(x._id),
      uploader: { _id: String(x.uploader_id), name: x.uploader_name },
      fileSize: Number(x.fileSize),
      downloads: Number(x.downloads),
      ratingAvg: Number(x.ratingAvg),
      ratingCount: Number(x.ratingCount),
    }));
  }
  async findById(id) {
    const rows = await this.search({ status: "" });
    return rows.find((x) => String(x._id) === String(id)) || null;
  }
  async create({
    title,
    subject,
    description,
    fileName,
    filePath,
    originalName,
    fileSize,
    userId,
    documentType = "Tài liệu",
    categoryId = 1,
    tags = [],
  }) {
    const conn = await this.db.pool.getConnection();
    try {
      await conn.beginTransaction();
      const [srows] = await conn.query(
        "SELECT subject_id,faculty_id FROM subjects WHERE name=? LIMIT 1",
        [subject || "Khác"],
      );
      let sid = srows[0]?.subject_id;
      if (!sid) {
        sid = 1;
      }
      const [r] = await conn.query(
        "INSERT INTO documents(uploader_id,category_id,subject_id,title,slug,description,file_path,original_filename,file_type,document_type,file_size) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
        [
          userId,
          categoryId,
          sid,
          title,
          slugify(title) + "-" + Date.now(),
          description || "",
          filePath,
          originalName,
          pathExt(originalName),
          documentType,
          fileSize,
        ],
      );
      for (const raw of tags || []) {
        const name = String(raw).trim();
        if (!name) continue;
        const slug = slugify(name);
        await conn.query(
          "INSERT INTO tags(name,slug) VALUES(?,?) ON DUPLICATE KEY UPDATE tag_id=LAST_INSERT_ID(tag_id)",
          [name, slug],
        );
        const [[tag]] = await conn.query("SELECT LAST_INSERT_ID() tag_id");
        await conn.query(
          "INSERT IGNORE INTO document_tags(doc_id,tag_id) VALUES(?,?)",
          [r.insertId, tag.tag_id],
        );
      }
      await conn.commit();
      return this.findById(r.insertId);
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }
  async increaseDownloads(id, userId, ip) {
    const conn = await this.db.pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query(
        'UPDATE documents SET download_count=download_count+1 WHERE doc_id=? AND status="approved"',
        [id],
      );
      await conn.query(
        "INSERT INTO downloads(doc_id,user_id,ip_address) VALUES(?,?,?)",
        [id, userId || null, ip || null],
      );
      await conn.commit();
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
    return this.findById(id);
  }
  async delete(id, userId) {
    const [r] = await this.db.pool.query(
      "UPDATE documents SET deleted_at=NOW() WHERE doc_id=? AND uploader_id=?",
      [id, userId],
    );
    return r.affectedRows > 0;
  }
  async approve(id, adminId, approved, reason) {
    const status = approved ? "approved" : "rejected";
    await this.db.pool.query(
      "UPDATE documents SET status=?,approved_by=?,approved_at=IF(?=1,NOW(),NULL),reject_reason=? WHERE doc_id=?",
      [
        status,
        adminId,
        approved ? 1 : 0,
        approved ? null : reason || "Không đạt yêu cầu",
        id,
      ],
    );
    const d = await this.findById(id);
    if (d)
      await this.db.pool.query(
        "INSERT INTO notifications(user_id,type,content) SELECT uploader_id,?,? FROM documents WHERE doc_id=?",
        [
          "document",
          approved
            ? "Tài liệu của bạn đã được duyệt."
            : "Tài liệu của bạn bị từ chối: " + (reason || "Không đạt yêu cầu"),
          id,
        ],
      );
    return d;
  }
}
function pathExt(n) {
  const m = String(n || "").match(/\.([^.]+)$/);
  return m ? m[1].toLowerCase() : "file";
}
module.exports = DocumentRepository;
