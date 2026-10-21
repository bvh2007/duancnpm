const mysql = require("mysql2/promise");

class Database {
  constructor(config) {
    this.config = config;

    // Bật SSL khi kết nối MySQL Cloud
    const useSSL = process.env.DB_SSL === "true";

    // Cấu hình chứng chỉ CA của Aiven
    const sslOptions = useSSL
      ? {
          rejectUnauthorized: true,
          ...(process.env.DB_SSL_CA
            ? {
                ca: process.env.DB_SSL_CA.replace(/\\n/g, "\n"),
              }
            : {}),
        }
      : undefined;

    // Tạo connection pool MySQL
    this.pool = mysql.createPool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
      ...(useSSL ? { ssl: sslOptions } : {}),
      waitForConnections: true,
      connectionLimit: 10,
      charset: "utf8mb4",
      namedPlaceholders: true,
    });
  }

  async connect() {
    const conn = await this.pool.getConnection();

    try {
      await conn.ping();
      console.log("✅ Đã kết nối MySQL");
    } finally {
      conn.release();
    }
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = Database;
