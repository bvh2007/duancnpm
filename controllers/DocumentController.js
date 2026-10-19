const asyncHandler = require("../utils/asyncHandler");
const mammoth = require("mammoth");
const path = require("path");
class DocumentController {
  preview = asyncHandler(async (req, res) => {
    const result = await this.service.preparePreview(
      req.params.id,
      req.user.id,
    );

    const extension = path.extname(result.filePath).toLowerCase();

    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("X-Content-Type-Options", "nosniff");

    // Trường hợp 1: Xem file PDF
    if (extension === ".pdf") {
      res.type("pdf");
      res.setHeader("Content-Disposition", "inline");
      return res.sendFile(result.filePath);
    }

    // Trường hợp 2: Xem file Word
    if (extension === ".docx") {
      const converted = await mammoth.convertToHtml({
        path: result.filePath,
      });

      return res.json({
        type: "docx",
        html: converted.value,
      });
    }

    return res.status(415).json({
      message: "Định dạng tài liệu chưa được hỗ trợ xem trực tuyến",
    });
  });
  constructor(service, repo) {
    this.service = service;
    this.repo = repo;
  }
  list = asyncHandler(async (req, res) =>
    res.json(await this.service.list(req.query)),
  );
  upload = asyncHandler(async (req, res) =>
    res
      .status(201)
      .json(await this.service.upload(req.file, req.body, req.user.id)),
  );
  download = asyncHandler(async (req, res) => {
    const x = await this.service.prepareDownload(
      req.params.id,
      req.user?.id,
      req.ip,
    );
    res.download(x.filePath, x.originalName);
  });
  remove = asyncHandler(async (req, res) => {
    await this.service.remove(req.params.id, req.user.id);
    res.json({ message: "Đã xoá tài liệu" });
  });
  approve = asyncHandler(async (req, res) =>
    res.json(
      await this.repo.approve(
        req.params.id,
        req.user.id,
        Boolean(req.body.approved),
        req.body.reason,
      ),
    ),
  );
}
module.exports = DocumentController;
