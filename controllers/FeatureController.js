const asyncHandler = require("../utils/asyncHandler");

class FeatureController {
  paymentWebhook = asyncHandler(async (req, res) => {
    const secureToken = req.headers["secure-token"];

    if (!secureToken || secureToken !== process.env.VIETQR_SECURE_TOKEN) {
      return res.status(401).json({
        code: "01",
        desc: "Unauthorized",
      });
    }

    const result = await this.service.handlePaymentWebhook(req.body);

    res.status(200).json({
      code: "00",
      desc: "success",
      data: result,
    });
  });
  constructor(service) {
    this.service = service;
  }

  plans = asyncHandler(async (req, res) =>
    res.json(await this.service.plans()),
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

  // Tạo giao dịch thanh toán
  createPayment = asyncHandler(async (req, res) =>
    res
      .status(201)
      .json(
        await this.service.createPayment(req.user.id, Number(req.body.planId)),
      ),
  );

  // Xác nhận giao dịch thanh toán
  confirmPayment = asyncHandler(async (req, res) =>
    res.json(
      await this.service.confirmPayment(
        Number(req.params.paymentId),
        req.user.id,
      ),
    ),
  );

  admin = asyncHandler(async (req, res) =>
    res.json(await this.service.admin(req.user.id)),
  );
}

module.exports = FeatureController;
