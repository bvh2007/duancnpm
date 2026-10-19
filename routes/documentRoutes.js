const express = require("express");
module.exports = function (c, auth, upload) {
  const r = express.Router();
  r.get("/", c.list);
  r.post("/", auth.authenticate, upload.single("file"), c.upload);
  r.get("/:id/preview", auth.authenticate, c.preview);
  r.get("/:id/download", auth.authenticate, c.download);
  r.patch("/:id/review", auth.authenticate, c.approve);
  r.delete("/:id", auth.authenticate, c.remove);
  return r;
};
