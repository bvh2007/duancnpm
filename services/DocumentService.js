const AppError = require("../utils/AppError");
const FileStorage = require("../utils/FileStorage");
class DocumentService {
  constructor(repo, storage, db) {
    this.repo = repo;
    this.storage = storage;
    this.db = db;
  }
  list(q) {
    return this.repo.search(q);
  }
  async upload(file, body, userId) {
    if (!file) throw new AppError("Vui lòng chọn file tài liệu", 400);
    if (!body.title?.trim()) {
      this.storage.remove(file.path);
      throw new AppError("Vui lòng nhập tiêu đề", 400);
    }
    try {
      return await this.repo.create({
        title: body.title.trim(),
        subject: body.subject,
        description: body.description,
        fileName: file.filename,
        filePath: "uploads/" + file.filename,
        originalName: FileStorage.fixVietnameseName(file.originalname),
        fileSize: file.size,
        userId,
        documentType: body.type || "Tài liệu",
        categoryId: Number(body.categoryId) || 1,
        tags: String(body.tags || "").split(","),
      });
    } catch (e) {
      this.storage.remove(file.path);
      throw e;
    }
  }

  async prepareDownload(id, userId, ip) {
    // 1. Lấy thông tin tài liệu
    const d = await this.repo.findById(id);
    console.log("DOWNLOAD CHECK:");
    console.log("documentId =", id);
    console.log("userId =", userId);
    console.log("accessLevel =", d?.accessLevel);
    if (!d) {
      throw new AppError("Không tìm thấy tài liệu", 404);
    }

    // 2. Lấy gói hiện tại của người dùng
    let plan = "Free";

    if (userId) {
      const [[subscription]] = await this.db.pool.query(
        `SELECT p.plan_name AS plan
       FROM subscriptions s
       JOIN plans p ON p.plan_id = s.plan_id
       WHERE s.user_id = ?
         AND s.status = 'active'
         AND (s.end_date IS NULL OR s.end_date >= NOW())
       ORDER BY s.end_date DESC
       LIMIT 1`,
        [userId],
      );

      if (subscription) {
        plan = subscription.plan;
      }
    }

    // 3. Chuẩn hóa quyền tài liệu
    const accessLevel = String(d.accessLevel || "free").toLowerCase();
    const currentPlan = String(plan).toLowerCase();

    // 4. Kiểm tra quyền tải
    const allowed =
      accessLevel === "free" ||
      (accessLevel === "pro" && ["pro", "vip"].includes(currentPlan)) ||
      (accessLevel === "vip" && currentPlan === "vip");

    if (!allowed) {
      throw new AppError(
        `Tài liệu này yêu cầu gói ${accessLevel.toUpperCase()}. Gói hiện tại của bạn là ${plan}.`,
        403,
      );
    }

    // 5. Đủ quyền mới tăng lượt tải
    const downloaded = await this.repo.increaseDownloads(id, userId, ip);

    if (!downloaded) {
      throw new AppError("Không tìm thấy tài liệu", 404);
    }

    return {
      filePath: this.storage.pathOf(d.filePath.replace(/^uploads\//, "")),
    };
  }
  async preparePreview(id, userId) {
    const d = await this.repo.findById(id);

    if (!d) {
      throw new AppError("Không tìm thấy tài liệu", 404);
    }

    let plan = "Free";

    if (userId) {
      const [[subscription]] = await this.db.pool.query(
        `SELECT p.plan_name AS plan
         FROM subscriptions s
         JOIN plans p ON p.plan_id = s.plan_id
         WHERE s.user_id = ?
           AND s.status = 'active'
           AND (s.end_date IS NULL OR s.end_date >= NOW())
         ORDER BY s.end_date DESC
         LIMIT 1`,
        [userId],
      );

      if (subscription) plan = subscription.plan;
    }

    const accessLevel = String(d.accessLevel || "free").toLowerCase();
    const currentPlan = String(plan).toLowerCase();

    const allowed =
      accessLevel === "free" ||
      (accessLevel === "pro" && ["pro", "vip"].includes(currentPlan)) ||
      (accessLevel === "vip" && currentPlan === "vip");

    if (!allowed) {
      throw new AppError(
        `Tài liệu này yêu cầu gói ${accessLevel.toUpperCase()}. Gói hiện tại của bạn là ${plan}.`,
        403,
      );
    }

    if (
      !String(d.originalName || "")
        .toLowerCase()
        .endsWith(".pdf")
    ) {
      throw new AppError("Hiện tại chỉ hỗ trợ xem trực tuyến file PDF", 415);
    }

    return {
      filePath: this.storage.pathOf(d.filePath.replace(/^uploads\//, "")),
    };
  }
  async remove(id, userId) {
    if (!(await this.repo.delete(id, userId)))
      throw new AppError(
        "Không tìm thấy tài liệu hoặc bạn không có quyền xoá",
        403,
      );
  }
}
module.exports = DocumentService;
