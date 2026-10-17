const asyncHandler = require("../utils/asyncHandler");
class FeatureController {
  constructor(service) {
    this.service = service;
  }
  plans = asyncHandler(async (req, res) =>
    res.json(await this.service.plans()),
  );
  confirmPayment = asyncHandler(async (req, res) =>
    res.json(await this.service.confirmPayment(Number(req.params.paymentId))),
  );
  detail = asyncHandler(async (req, res) =>
    res.json(await this.service.detail(req.params.id, req.user?.id)),
  );
  rate = asyncHandler(async (req, res) =>
    res.json(
      await this.service.rate(
        req.params.id,
        req.user.id,
        Number(req.body.score),
      ),
    ),
  );
  favorite = asyncHandler(async (req, res) =>
    res.json({
      favorite: await this.service.favorite(req.params.id, req.user.id),
    }),
  );
  comment = asyncHandler(async (req, res) =>
    res.json(
      await this.service.comments(
        req.params.id,
        req.user.id,
        req.body.content,
        req.body.parentId,
      ),
    ),
  );
  report = asyncHandler(async (req, res) =>
    res.json(
      await this.service.report(
        req.params.id,
        req.user.id,
        req.body.reason,
        req.body.detail,
      ),
    ),
  );
  me = asyncHandler(async (req, res) =>
    res.json(await this.service.me(req.user.id)),
  );
  subscription = asyncHandler(async (req, res) =>
    res.json(await this.service.subscription(req.user.id)),
  );
  createPayment = asyncHandler(async (req, res) =>
    res
      .status(201)
      .json(
        await this.service.createPayment(req.user.id, Number(req.body.planId)),
      ),
  );
  admin = asyncHandler(async (req, res) =>
    res.json(await this.service.admin(req.user.id)),
  );
}
module.exports = FeatureController;
