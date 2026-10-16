const express = require("express");
module.exports = function (controller, auth) {
  const r = express.Router();
  r.get("/document/:id", controller.detail);
  r.get("/me", auth.authenticate, controller.me);
  r.get("/plans", controller.plans);
  r.get("/subscription/me", auth.authenticate, controller.subscription);
  r.post("/payment", auth.authenticate, controller.createPayment);
  r.post("/document/:id/rating", auth.authenticate, controller.rate);
  r.post("/document/:id/favorite", auth.authenticate, controller.favorite);
  r.post("/document/:id/comments", auth.authenticate, controller.comment);
  r.post("/document/:id/report", auth.authenticate, controller.report);
  r.get("/admin", auth.authenticate, controller.admin);
  return r;
};
