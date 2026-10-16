const AppError = require("../utils/AppError");
class FeatureService {
  constructor(db) {
    this.db = db;
  }
  async detail(docId, userId) {
    const [[r]] = await this.db.pool.query(
      "SELECT ROUND(AVG(score),2) avg,COUNT(*) count FROM ratings WHERE doc_id=?",
      [docId],
    );
    let mine = 0;
    if (userId) {
      const [[m]] = await this.db.pool.query(
        "SELECT score FROM ratings WHERE doc_id=? AND user_id=?",
        [docId, userId],
      );
      mine = m?.score || 0;
    }
    const [comments] = await this.db.pool.query(
      "SELECT c.comment_id id,c.parent_id parentId,c.content text,c.created_at at,u.full_name user FROM comments c JOIN users u ON u.user_id=c.user_id WHERE c.doc_id=? AND c.deleted_at IS NULL ORDER BY c.created_at ASC",
      [docId],
    );
    return {
      rating: { avg: Number(r.avg) || 0, count: Number(r.count) || 0, mine },
      comments,
    };
  }
  async rate(docId, userId, score) {
    if (score < 1 || score > 5)
      throw new AppError("Điểm đánh giá phải từ 1 đến 5", 400);
    await this.db.pool.query(
      "INSERT INTO ratings(doc_id,user_id,score) VALUES(?,?,?) ON DUPLICATE KEY UPDATE score=VALUES(score),updated_at=NOW()",
      [docId, userId, score],
    );
    await this.recalc(docId);
    return this.detail(docId, userId);
  }
  async recalc(docId) {
    await this.db.pool.query(
      "UPDATE documents d JOIN (SELECT doc_id,ROUND(AVG(score),2) avg,COUNT(*) cnt FROM ratings WHERE doc_id=? GROUP BY doc_id) r ON r.doc_id=d.doc_id SET d.rating_avg=r.avg,d.rating_count=r.cnt WHERE d.doc_id=?",
      [docId, docId],
    );
  }
  async favorite(docId, userId) {
    const [[r]] = await this.db.pool.query(
      "SELECT 1 x FROM favorites WHERE doc_id=? AND user_id=?",
      [docId, userId],
    );
    if (r) {
      await this.db.pool.query(
        "DELETE FROM favorites WHERE doc_id=? AND user_id=?",
        [docId, userId],
      );
      return false;
    }
    await this.db.pool.query(
      "INSERT INTO favorites(user_id,doc_id) VALUES(?,?)",
      [userId, docId],
    );
    return true;
  }
  async comments(docId, userId, text, parentId) {
    if (!text?.trim()) throw new AppError("Bình luận không được để trống", 400);
    await this.db.pool.query(
      "INSERT INTO comments(parent_id,doc_id,user_id,content) VALUES(?,?,?,?)",
      [parentId || null, docId, userId, text.trim()],
    );
    return this.detail(docId, userId);
  }
  async report(docId, userId, reason, detail) {
    await this.db.pool.query(
      "INSERT INTO reports(doc_id,user_id,reason,detail) VALUES(?,?,?,?)",
      [docId, userId, reason, detail || null],
    );
    return { message: "Đã gửi báo cáo" };
  }
  async me(userId) {
    const [fav] = await this.db.pool.query(
      "SELECT d.doc_id id,d.title,d.subject_id FROM favorites f JOIN documents d ON d.doc_id=f.doc_id WHERE f.user_id=? ORDER BY f.created_at DESC",
      [userId],
    );

    const [notes] = await this.db.pool.query(
      `SELECT
        notification_id AS id,
        type,
        content AS text,
        is_read AS isRead,
        created_at AS createdAt
      FROM notifications
      WHERE user_id=?
      ORDER BY created_at DESC
      LIMIT 30`,
      [userId],
    );

    return {
      favorites: fav.map((x) => String(x.id)),
      notifications: notes,
    };
  }

  async subscription(userId) {
    const [[row]] = await this.db.pool.query(
      `SELECT
        p.plan_name AS plan,
        p.price,
        s.status,
        s.start_date AS startDate,
        s.end_date AS endDate
      FROM subscriptions s
      JOIN plans p ON p.plan_id = s.plan_id
      WHERE s.user_id = ?
        AND s.status = 'active'
        AND (s.end_date IS NULL OR s.end_date >= NOW())
      ORDER BY s.end_date DESC
      LIMIT 1`,
      [userId],
    );

    if (!row) {
      return {
        plan: "Free",
        price: 0,
        status: "active",
        startDate: null,
        endDate: null,
      };
    }

    return {
      plan: row.plan,
      price: Number(row.price),
      status: row.status,
      startDate: row.startDate,
      endDate: row.endDate,
    };
  }

  async admin(dbUserId) {
    const [[u]] = await this.db.pool.query(
      "SELECT r.role_name FROM users u JOIN roles r ON r.role_id=u.role_id WHERE u.user_id=?",
      [dbUserId],
    );

    if (!["admin", "moderator"].includes(u?.role_name)) {
      throw new AppError("Bạn không có quyền quản trị", 403);
    }

    const [pending] = await this.db.pool.query(
      'SELECT d.doc_id id,d.title,d.original_filename originalName,d.created_at createdAt,u.full_name uploader FROM documents d JOIN users u ON u.user_id=d.uploader_id WHERE d.status="pending" AND d.deleted_at IS NULL ORDER BY d.created_at ASC',
    );

    const [[stats]] = await this.db.pool.query(
      'SELECT SUM(status="pending") pending,SUM(status="approved") approved,COUNT(*) total FROM documents WHERE deleted_at IS NULL',
    );

    const [[reports]] = await this.db.pool.query(
      'SELECT COUNT(*) total FROM reports WHERE status="open"',
    );

    return {
      pending,
      stats,
      reports: Number(reports.total),
    };
  }
}

module.exports = FeatureService;
