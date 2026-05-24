const router = require("express").Router();
const { protect } = require("../middleware/auth.middleware");
const {
  getCurrentPricing,
  createOrder,
  verifyPayment,
  checkAccess,
  getHistory,
} = require("../controllers/payment.controller");

router.get("/pricing",  getCurrentPricing);          // public
router.post("/order",   protect, createOrder);
router.post("/verify",  protect, verifyPayment);
router.get("/access",   protect, checkAccess);
router.get("/history",  protect, getHistory);

module.exports = router;
