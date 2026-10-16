const Config = require("./config/Config");
const Database = require("./db");
const App = require("./app");
(async () => {
  try {
    const db = new Database(Config.db);
    await db.connect();
    const app = new App(db).express;
    app.listen(Config.port, () =>
      console.log(`🚀 Server: http://localhost:${Config.port}`),
    );
  } catch (e) {
    console.error("❌ Không khởi động được server:", e.message);
    process.exit(1);
  }
})();
