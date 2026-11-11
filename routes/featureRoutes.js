const express = require("express");
module.exports = function (controller, auth) {
  const r = express.Router();
  r.get("/document/:id", auth.authenticate, controller.detail);
  r.get("/me", auth.authenticate, controller.me);
  r.get("/plans", controller.plans);
  r.get("/subscription/me", auth.authenticate, controller.subscription);
  r.post("/payment/webhook", controller.paymentWebhook);
  r.post("/payment", auth.authenticate, controller.createPayment);
  r.post(
    "/payment/:paymentId/confirm",
    auth.authenticate,
    controller.confirmPayment,
  );
  r.post("/document/:id/rating", auth.authenticate, controller.rate);
  r.post("/document/:id/favorite", auth.authenticate, controller.favorite);
  r.get("/collections", auth.authenticate, controller.collections);
  r.post("/collections", auth.authenticate, controller.createCollection);
  r.get("/collections/:id", auth.authenticate, controller.collection);
  r.patch("/collections/:id", auth.authenticate, controller.updateCollection);
  r.delete(
    "/collections/:id",
    auth.authenticate,
    controller.deleteCollection,
  );
  r.post(
    "/collections/:id/documents",
    auth.authenticate,
    controller.addDocumentToCollection,
  );
  r.delete(
    "/collections/:id/documents/:documentId",
    auth.authenticate,
    controller.removeDocumentFromCollection,
  );
  r.post("/document/:id/comments", auth.authenticate, controller.comment);
  r.post("/document/:id/report", auth.authenticate, controller.report);
  r.get("/admin", auth.authenticate, controller.admin);
  return r;
};
