const path = require("path");

require("dotenv").config({
  path: path.join(__dirname, "..", ".env"),
});

class Config {
  // Cổng chạy server
  static get port() {
    return Number(process.env.PORT || 3000);
  }

  // Khóa xác thực JWT
  static get jwtSecret() {
    return process.env.JWT_SECRET || "dev_secret_change_me";
  }

  // Cấu hình kết nối MySQL
  static get db() {
    return {
      host: process.env.DB_HOST || "127.0.0.1",
      port: Number(process.env.DB_PORT || 3306),
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "tailieu_sv",
    };
  }

  // Thư mục lưu tài liệu được tải lên
  static get uploadDir() {
    return path.join(__dirname, "..", "uploads");
  }

  // Thư mục chứa giao diện website
  static get frontendDir() {
    return path.join(__dirname, "..", "frontend");
  }

  // Giới hạn dung lượng tài liệu: 20 MB
  static get maxFileSize() {
    return 20 * 1024 * 1024;
  }

  // Định dạng tài liệu được phép tải lên
  static get allowedExtensions() {
    return [".pdf", ".doc", ".docx"];
  }
}

module.exports = Config;
