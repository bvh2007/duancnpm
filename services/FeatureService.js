const AppError = require("../utils/AppError");

class FeatureService {
  constructor(db) {
    this.db = db;
  }

  // Lấy chi tiết đánh giá và bình luận của tài liệu
  async detail(docId, userId) {
    const [[rating]] = await this.db.pool.query(
      `SELECT
        ROUND(AVG(score), 2) AS avg,
        COUNT(*) AS count
      FROM ratings
      WHERE doc_id = ?`,
      [docId],
    );

    let mine = 0;

    if (userId) {
      const [[myRating]] = await this.db.pool.query(
        `SELECT score
         FROM ratings
         WHERE doc_id = ? AND user_id = ?`,
        [docId, userId],
      );

      mine = myRating?.score || 0;
    }

    const [comments] = await this.db.pool.query(
      `SELECT
        c.comment_id AS id,
        c.parent_id AS parentId,
        c.content AS text,
        c.created_at AS at,
        u.full_name AS user
      FROM comments c
      JOIN users u ON u.user_id = c.user_id
      WHERE c.doc_id = ?
        AND c.deleted_at IS NULL
      ORDER BY c.created_at ASC`,
      [docId],
    );

    return {
      rating: {
        avg: Number(rating.avg) || 0,
        count: Number(rating.count) || 0,
        mine,
      },
      comments,
    };
  }

  // Đánh giá tài liệu
  async rate(docId, userId, score) {
    if (!Number.isInteger(score) || score < 1 || score > 5) {
      throw new AppError("Điểm đánh giá phải là số nguyên từ 1 đến 5", 400);
    }

    await this.db.pool.query(
      `INSERT INTO ratings (doc_id, user_id, score)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         score = VALUES(score),
         updated_at = NOW()`,
      [docId, userId, score],
    );

    await this.recalc(docId);

    return this.detail(docId, userId);
  }

  // Cập nhật điểm đánh giá trung bình của tài liệu
  async recalc(docId) {
    await this.db.pool.query(
      `UPDATE documents d
       JOIN (
         SELECT
           doc_id,
           ROUND(AVG(score), 2) AS avg,
           COUNT(*) AS cnt
         FROM ratings
         WHERE doc_id = ?
         GROUP BY doc_id
       ) r ON r.doc_id = d.doc_id
       SET
         d.rating_avg = r.avg,
         d.rating_count = r.cnt
       WHERE d.doc_id = ?`,
      [docId, docId],
    );
  }

  // Thêm hoặc bỏ tài liệu yêu thích
  async favorite(docId, userId) {
    const [[existing]] = await this.db.pool.query(
      `SELECT 1 AS found
       FROM favorites
       WHERE doc_id = ? AND user_id = ?`,
      [docId, userId],
    );

    if (existing) {
      await this.db.pool.query(
        `DELETE FROM favorites
         WHERE doc_id = ? AND user_id = ?`,
        [docId, userId],
      );

      return false;
    }

    await this.db.pool.query(
      `INSERT INTO favorites (user_id, doc_id)
       VALUES (?, ?)`,
      [userId, docId],
    );

    return true;
  }

  // Thêm bình luận
  async comments(docId, userId, text, parentId) {
    if (!text?.trim()) {
      throw new AppError("Bình luận không được để trống", 400);
    }

    await this.db.pool.query(
      `INSERT INTO comments
        (parent_id, doc_id, user_id, content)
       VALUES (?, ?, ?, ?)`,
      [parentId || null, docId, userId, text.trim()],
    );

    return this.detail(docId, userId);
  }

  // Báo cáo tài liệu
  async report(docId, userId, reason, detail) {
    if (!reason?.trim()) {
      throw new AppError("Vui lòng nhập lý do báo cáo", 400);
    }

    await this.db.pool.query(
      `INSERT INTO reports
        (doc_id, user_id, reason, detail)
       VALUES (?, ?, ?, ?)`,
      [docId, userId, reason.trim(), detail || null],
    );

    return {
      message: "Đã gửi báo cáo",
    };
  }

  // Lấy danh sách yêu thích và thông báo của người dùng
  async me(userId) {
    const [favorites] = await this.db.pool.query(
      `SELECT
        d.doc_id AS id,
        d.title,
        d.subject_id
       FROM favorites f
       JOIN documents d ON d.doc_id = f.doc_id
       WHERE f.user_id = ?
       ORDER BY f.created_at DESC`,
      [userId],
    );

    const [notifications] = await this.db.pool.query(
      `SELECT
        notification_id AS id,
        type,
        content AS text,
        is_read AS isRead,
        created_at AS createdAt
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT 30`,
      [userId],
    );

    return {
      favorites: favorites.map((item) => String(item.id)),
      notifications,
    };
  }

  // Lấy gói tài khoản hiện tại
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

  // Tạo giao dịch thanh toán
  async createPayment(userId, planId) {
    const [[plan]] = await this.db.pool.query(
      `SELECT
        plan_id,
        plan_name,
        price,
        duration_days
       FROM plans
       WHERE plan_id = ?
         AND is_active = TRUE`,
      [planId],
    );

    if (!plan) {
      throw new AppError("Gói không tồn tại", 404);
    }

    if (Number(plan.price) <= 0) {
      throw new AppError("Không thể thanh toán gói miễn phí", 400);
    }

    const transactionCode = `TL${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const [result] = await this.db.pool.query(
      `INSERT INTO payments
        (user_id, plan_id, amount, payment_method,
         transaction_code, status)
       VALUES (?, ?, ?, 'vietqr', ?, 'pending')`,
      [userId, plan.plan_id, plan.price, transactionCode],
    );

    return {
      paymentId: result.insertId,
      transactionCode,
      plan: plan.plan_name,
      amount: Number(plan.price),
      paymentMethod: "vietqr",
      status: "pending",
      durationDays: plan.duration_days,
    };
  }

  // Lấy danh sách các gói tài khoản
  async plans() {
    const [rows] = await this.db.pool.query(
      `SELECT
        plan_id AS id,
        plan_name AS name,
        price,
        duration_days AS durationDays,
        description
       FROM plans
       WHERE is_active = TRUE
       ORDER BY plan_id`,
    );

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      price: Number(row.price),
      durationDays: row.durationDays,
      description: row.description,
    }));
  }
  // Xác nhận thanh toán và kích hoạt gói
  async confirmPayment(paymentId) {
    const connection = await this.db.pool.getConnection();

    try {
      await connection.beginTransaction();

      const [[payment]] = await connection.query(
        `SELECT
          payment_id,
          user_id,
          plan_id,
          amount,
          status
         FROM payments
         WHERE payment_id = ?
         FOR UPDATE`,
        [paymentId],
      );

      if (!payment) {
        throw new AppError("Không tìm thấy giao dịch", 404);
      }

      // Nếu giao dịch đã được xử lý rồi thì không xử lý lại
      if (payment.status === "paid") {
        const [[subscription]] = await connection.query(
          `SELECT
            subscription_id,
            plan_id,
            status,
            start_date,
            end_date
           FROM subscriptions
           WHERE user_id = ?
             AND plan_id = ?
             AND status = 'active'
           ORDER BY subscription_id DESC
           LIMIT 1`,
          [payment.user_id, payment.plan_id],
        );

        await connection.commit();

        return {
          message: "Giao dịch đã được xác nhận trước đó",
          paymentId: payment.payment_id,
          status: "paid",
          subscription: subscription || null,
        };
      }

      if (payment.status !== "pending") {
        throw new AppError(
          `Không thể xác nhận giao dịch đang ở trạng thái ${payment.status}`,
          400,
        );
      }

      const [[plan]] = await connection.query(
        `SELECT
          plan_id,
          plan_name,
          price,
          duration_days
         FROM plans
         WHERE plan_id = ?
           AND is_active = TRUE`,
        [payment.plan_id],
      );

      if (!plan) {
        throw new AppError("Gói tài khoản không tồn tại", 404);
      }

      // Kiểm tra số tiền giao dịch
      if (Number(payment.amount) !== Number(plan.price)) {
        throw new AppError("Số tiền thanh toán không khớp với gói", 400);
      }

      // Đánh dấu payment đã thanh toán
      await connection.query(
        `UPDATE payments
         SET
           status = 'paid',
           paid_at = NOW()
         WHERE payment_id = ?`,
        [payment.payment_id],
      );

      // Hủy subscription active cũ của user
      await connection.query(
        `UPDATE subscriptions
         SET status = 'cancelled'
         WHERE user_id = ?
           AND status = 'active'`,
        [payment.user_id],
      );

      // Tạo subscription mới
      const [subscriptionResult] = await connection.query(
        `INSERT INTO subscriptions
          (user_id, plan_id, start_date, end_date, status)
         VALUES
          (?, ?, NOW(),
           CASE
             WHEN ? > 0
             THEN DATE_ADD(NOW(), INTERVAL ? DAY)
             ELSE NULL
           END,
           'active')`,
        [
          payment.user_id,
          payment.plan_id,
          plan.duration_days,
          plan.duration_days,
        ],
      );

      await connection.commit();

      return {
        message: `Đã kích hoạt gói ${plan.plan_name}`,
        paymentId: payment.payment_id,
        status: "paid",
        subscription: {
          subscriptionId: subscriptionResult.insertId,
          userId: payment.user_id,
          planId: plan.plan_id,
          plan: plan.plan_name,
          price: Number(plan.price),
          startDate: new Date(),
          durationDays: plan.duration_days,
        },
      };
    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  // Chức năng quản trị
  async admin(dbUserId) {
    const [[user]] = await this.db.pool.query(
      `SELECT r.role_name
       FROM users u
       JOIN roles r ON r.role_id = u.role_id
       WHERE u.user_id = ?`,
      [dbUserId],
    );

    if (!["admin", "moderator"].includes(user?.role_name)) {
      throw new AppError("Bạn không có quyền quản trị", 403);
    }

    const [pending] = await this.db.pool.query(
      `SELECT
        d.doc_id AS id,
        d.title,
        d.original_filename AS originalName,
        d.created_at AS createdAt,
        u.full_name AS uploader
       FROM documents d
       JOIN users u ON u.user_id = d.uploader_id
       WHERE d.status = 'pending'
         AND d.deleted_at IS NULL
       ORDER BY d.created_at ASC`,
    );

    const [[stats]] = await this.db.pool.query(
      `SELECT
        COALESCE(SUM(status = 'pending'), 0) AS pending,
        COALESCE(SUM(status = 'approved'), 0) AS approved,
        COUNT(*) AS total
       FROM documents
       WHERE deleted_at IS NULL`,
    );

    const [[reportCount]] = await this.db.pool.query(
      `SELECT COUNT(*) AS total
       FROM reports
       WHERE status = 'open'`,
    );

    return {
      pending,
      stats,
      reports: Number(reportCount.total),
    };
  }
}

module.exports = FeatureService;
