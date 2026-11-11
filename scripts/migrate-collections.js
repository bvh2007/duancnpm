const fs = require("fs");
const path = require("path");
const Config = require("../config/Config");
const Database = require("../db");

async function migrateCollections() {
  const migrationPath = path.join(
    __dirname,
    "../sql/migrations/20261111_personal_collections.sql",
  );
  const sql = fs.readFileSync(migrationPath, "utf8");
  const statements = sql
    .split(/;\s*(?:\r?\n|$)/)
    .map((statement) => statement.trim())
    .filter(Boolean);
  const db = new Database(Config.db);

  try {
    await db.connect();
    for (const statement of statements) {
      await db.pool.query(statement);
    }
    console.log("Personal collections database migration completed.");
  } finally {
    await db.close();
  }
}

migrateCollections().catch((error) => {
  console.error("Could not migrate personal collections:", error.message);
  process.exitCode = 1;
});
