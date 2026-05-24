const router = require("express").Router();
const controller = require("../controllers/payment.controller");
const { protect } = require("../middleware/auth.middleware");

router.get("/pricing", controller.getCurrentPricing);
router.post("/order", protect, controller.createOrder);
router.post("/verify", protect, controller.verifyPayment);
router.get("/access", protect, controller.checkAccess);
router.get("/history", protect, controller.getHistory);

module.exports = router;