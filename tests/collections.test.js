const assert = require("node:assert/strict");
const test = require("node:test");
const AppError = require("../utils/AppError");
const FeatureService = require("../services/FeatureService");

function createService(respond) {
  const calls = [];
  const service = new FeatureService({
    pool: {
      query: async (sql, params) => {
        calls.push({ sql, params });
        return respond(sql, params);
      },
    },
  });
  return { service, calls };
}

test("invalid collection names fail before database access", async () => {
  const { service, calls } = createService(() => {
    throw new Error("Unexpected database call");
  });
  await assert.rejects(
    service.createCollection(4, "   "),
    (error) => error instanceof AppError && error.status === 400,
  );
  assert.equal(calls.length, 0);
});

test("collection lookups are scoped to their owner", async () => {
  const { service, calls } = createService(() => [[], []]);
  await assert.rejects(
    service.collection(12, 4),
    (error) => error instanceof AppError && error.status === 404,
  );
  assert.deepEqual(calls[0].params, [12, 4]);
});

test("only approved documents can be added to an owned collection", async () => {
  const { service, calls } = createService((sql) => {
    if (sql.includes("SELECT collection_id FROM collections"))
      return [[{ collection_id: 7 }], []];
    if (sql.includes("SELECT doc_id FROM documents"))
      return [[{ doc_id: 21 }], []];
    if (sql.includes("INSERT IGNORE INTO collection_documents"))
      return [{ affectedRows: 1 }, []];
    if (sql.includes("SELECT collection_id AS id,name"))
      return [[{ id: 7, name: "Ôn thi", documentCount: 1 }], []];
    if (sql.includes("FROM collection_documents cd"))
      return [[{ id: 21, title: "Giáo trình", fileSize: 1024, downloads: 2 }], []];
    throw new Error(`Unexpected query: ${sql}`);
  });
  const result = await service.addDocumentToCollection(7, 4, 21);
  assert.equal(result.id, "7");
  assert.equal(result.documents[0].id, "21");
  assert.match(calls[1].sql, /status='approved'/);
});

test("another user's collection cannot be modified", async () => {
  const { service, calls } = createService(() => [[], []]);
  await assert.rejects(
    service.removeDocumentFromCollection(3, 5, 9),
    (error) => error instanceof AppError && error.status === 404,
  );
  assert.equal(calls.length, 1);
  assert.match(calls[0].sql, /user_id=\?/);
});
