const AppError = require("../utils/AppError");

class FeatureService {
  constructor(db) {
    this.db = db;
  }
  async detail(docId, userId) {
    // 1. Lấy thông tin tài liệu
    const [[documentData]] = await this.db.pool.query(
      `SELECT
      d.doc_id AS _id,
      d.title,
      d.description,
      d.original_filename AS originalName,
      d.file_path AS filePath,
      d.file_size AS fileSize,
      d.file_type AS fileType,
      d.document_type AS type,
      d.access_level AS accessLevel,
      d.download_count AS downloads,
      d.view_count AS views,
      d.rating_avg AS ratingAvg,
      d.rating_count AS ratingCount,
      d.status,
      d.created_at AS createdAt,
      d.updated_at AS updatedAt,
      u.user_id AS uploaderId,
      u.full_name AS uploaderName,
      s.name AS subject,
      f.name AS faculty,
      c.name AS category
    FROM documents d
    JOIN users u ON u.user_id = d.uploader_id
    JOIN subjects s ON s.subject_id = d.subject_id
    JOIN faculties f ON f.faculty_id = s.faculty_id
    JOIN categories c ON c.category_id = d.category_id
    WHERE d.doc_id = ?
      AND d.deleted_at IS NULL
    LIMIT 1`,
      [docId],
    );

    if (!documentData) {
      throw new AppError("Không tìm thấy tài liệu", 404);
    }

    // 2. Lấy đánh giá
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

    // 3. Lấy bình luận
    const [comments] = await this.db.pool.query(
      `SELECT
      c.comment_id id,
      c.parent_id parentId,
      c.content text,
      c.created_at at,
      u.full_name user
    FROM comments c
    JOIN users u ON u.user_id=c.user_id
    WHERE c.doc_id=?
      AND c.deleted_at IS NULL
    ORDER BY c.created_at ASC`,
      [docId],
    );

    // 4. Trả toàn bộ thông tin
    return {
      document: {
        _id: String(documentData._id),
        title: documentData.title,
        description: documentData.description,
        originalName: documentData.originalName,
        filePath: documentData.filePath,
        fileSize: Number(documentData.fileSize),
        fileType: documentData.fileType,
        type: documentData.type,
        accessLevel: documentData.accessLevel,
        downloads: Number(documentData.downloads),
        views: Number(documentData.views),
        ratingAvg: Number(documentData.ratingAvg),
        ratingCount: Number(documentData.ratingCount),
        status: documentData.status,
        createdAt: documentData.createdAt,
        updatedAt: documentData.updatedAt,
        subject: documentData.subject,
        faculty: documentData.faculty,
        category: documentData.category,
        uploader: {
          _id: String(documentData.uploaderId),
          name: documentData.uploaderName,
        },
      },

      rating: {
        avg: Number(r.avg) || 0,
        count: Number(r.count) || 0,
        mine,
      },

      comments,
    };
  }
  async rate(docId, userId, score) {
    if (score < 1 || score > 5) {
      throw new AppError("Điểm đánh giá phải từ 1 đến 5", 400);
    }

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
    if (!text?.trim()) {
      throw new AppError("Bình luận không được để trống", 400);
    }

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

    return {
      message: "Đã gửi báo cáo",
    };
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

    const amount = Number(plan.price);

    if (amount <= 0) {
      throw new AppError("Không thể thanh toán gói miễn phí", 400);
    }

    // Mã đơn hàng duy nhất
    const orderCode = Date.now();

    // Nội dung chuyển khoản
    const transactionCode = `TL${orderCode}`;

    // Tạo payment ở trạng thái pending
    const [result] = await this.db.pool.query(
      `INSERT INTO payments
      (
        user_id,
        plan_id,
        amount,
        payment_method,
        transaction_code,
        order_code,
        status
      )
     VALUES (?, ?, ?, 'vietqr', ?, ?, 'pending')`,
      [userId, plan.plan_id, amount, transactionCode, orderCode],
    );

    const paymentId = result.insertId;

    // Tạo Quick Link VietQR
    const bin = process.env.VIETQR_BIN;
    const accountNo = process.env.VIETQR_ACCOUNT_NO;
    const templateId = process.env.VIETQR_TEMPLATE_ID;
    const accountName = process.env.VIETQR_ACCOUNT_NAME;

    if (!bin || !accountNo || !templateId || !accountName) {
      throw new AppError("Chưa cấu hình đầy đủ thông tin VietQR", 500);
    }

    const checkoutUrl =
      `https://api.vietqr.io/image/${bin}-${accountNo}-${templateId}.jpg` +
      `?amount=${amount}` +
      `&addInfo=${encodeURIComponent(transactionCode)}` +
      `&accountName=${encodeURIComponent(accountName)}`;

    // Lưu Quick Link vào database
    await this.db.pool.query(
      `UPDATE payments
     SET checkout_url = ?
     WHERE payment_id = ?`,
      [checkoutUrl, paymentId],
    );

    return {
      paymentId,
      transactionCode,
      orderCode,
      plan: plan.plan_name,
      amount,
      paymentMethod: "vietqr",
      status: "pending",
      durationDays: plan.duration_days,
      checkoutUrl,
    };
  }
  async confirmPayment(paymentId, userId) {
    // 1. Tìm giao dịch
    const [[payment]] = await this.db.pool.query(
      `SELECT
      payment_id,
      user_id,
      plan_id,
      amount,
      payment_method,
      transaction_code,
      \`status\`,
      paid_at
    FROM payments
    WHERE payment_id = ?
      AND user_id = ?
    LIMIT 1`,
      [paymentId, userId],
    );

    if (!payment) {
      throw new AppError("Không tìm thấy giao dịch thanh toán", 404);
    }

    // 2. Nếu đã thanh toán trước đó
    if (payment.status === "paid") {
      const [[plan]] = await this.db.pool.query(
        `SELECT plan_name
       FROM plans
       WHERE plan_id = ?
       LIMIT 1`,
        [payment.plan_id],
      );

      return {
        message: "Giao dịch đã được xác nhận trước đó",
        paymentId: payment.payment_id,
        transactionCode: payment.transaction_code,
        plan: plan?.plan_name || "Pro/VIP",
        status: "paid",
      };
    }

    // 3. Đánh dấu payment đã thanh toán
    await this.db.pool.query(
      `UPDATE payments
     SET \`status\` = 'paid',
         paid_at = NOW()
     WHERE payment_id = ?
       AND user_id = ?`,
      [paymentId, userId],
    );

    // 4. Lấy thông tin gói
    const [[plan]] = await this.db.pool.query(
      `SELECT
      plan_id,
      plan_name,
      duration_days
    FROM plans
    WHERE plan_id = ?
    LIMIT 1`,
      [payment.plan_id],
    );

    if (!plan) {
      throw new AppError("Không tìm thấy gói thanh toán", 404);
    }

    // 5. Hủy subscription cũ
    await this.db.pool.query(
      `UPDATE subscriptions
     SET \`status\` = 'expired'
     WHERE user_id = ?
       AND \`status\` = 'active'`,
      [userId],
    );

    // 6. Tạo subscription mới
    const durationDays = Number(plan.duration_days || 30);

    await this.db.pool.query(
      `INSERT INTO subscriptions
      (
        user_id,
        plan_id,
        start_date,
        end_date,
        \`status\`
      )
      VALUES
      (
        ?,
        ?,
        NOW(),
        DATE_ADD(NOW(), INTERVAL ? DAY),
        'active'
      )`,
      [userId, plan.plan_id, durationDays],
    );

    // 7. Trả kết quả
    return {
      message: "Thanh toán thành công",
      paymentId: payment.payment_id,
      transactionCode: payment.transaction_code,
      plan: plan.plan_name,
      status: "paid",
      durationDays,
    };
  }

  async plans() {
    const [rows] = await this.db.pool.query(`
      SELECT
        plan_id AS id,
        plan_name AS name,
        price,
        duration_days AS durationDays,
        description
      FROM plans
      WHERE is_active = TRUE
      ORDER BY plan_id
    `);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      price: Number(row.price),
      durationDays: row.durationDays,
      description: row.description,
    }));
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
