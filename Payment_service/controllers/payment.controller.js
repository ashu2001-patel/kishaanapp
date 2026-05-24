const Razorpay     = require("razorpay");
const crypto       = require("crypto");
const Transaction  = require("../model/transection.model");  // keep existing filename
const FeatureConfig = require("../model/FeatureConfig");

const getClient = () => {
  const { RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET } = process.env;
  if (!RAZORPAY_KEY_ID || RAZORPAY_KEY_ID === "your_razorpay_key_id") return null;
  return new Razorpay({ key_id: RAZORPAY_KEY_ID, key_secret: RAZORPAY_KEY_SECRET });
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /payment/pricing?featureKey=reveal_contact
// Returns current price for a feature from DB (not hardcoded).
// ─────────────────────────────────────────────────────────────────────────────
exports.getCurrentPricing = async (req, res) => {
  try {
    const { featureKey } = req.query;
    if (featureKey) {
      const config = await FeatureConfig.findOne({ featureKey, isActive: true });
      if (!config) return res.status(404).json({ message: "Feature not found" });
      return res.json({
        success:   true,
        featureKey: config.featureKey,
        price:      config.price,
        freeLimit:  config.freeLimit,
        displayName: config.displayName,
      });
    }

    // Return all active features
    const configs = await FeatureConfig.find({ isActive: true });
    const pricing = {};
    configs.forEach(c => { pricing[c.featureKey] = c.price; });
    res.json({ success: true, pricing });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /payment/order
// Body: { featureKey, referenceId }
// Creates a Razorpay order (or a free transaction if price = 0).
// ─────────────────────────────────────────────────────────────────────────────
exports.createOrder = async (req, res) => {
  try {
    const { featureKey, referenceId } = req.body;

    if (!featureKey) return res.status(400).json({ message: "featureKey required" });

    const config = await FeatureConfig.findOne({ featureKey, isActive: true });
    if (!config) return res.status(404).json({ message: "Feature config not found" });

    const amount = config.price; // already in paise

    // ── Free feature ──────────────────────────────────────────────────────────
    if (amount === 0) {
      const tx = await Transaction.create({
        userId: req.user.id || req.user._id,
        type:   featureKey,
        referenceId,
        amount: 0,
        status: "success",
        isFree: true,
      });
      return res.json({ success: true, isFree: true, transaction: tx });
    }

    // ── Paid feature ──────────────────────────────────────────────────────────
    const razorpay = getClient();
    if (!razorpay) {
      return res.status(503).json({ message: "Payment gateway not configured" });
    }

    const order = await razorpay.orders.create({
      amount,
      currency: "INR",
      receipt: `rc_${Date.now()}`,
      notes: { featureKey, referenceId, userId: String(req.user.id || req.user._id) },
    });

    const tx = await Transaction.create({
      userId:          req.user.id || req.user._id,
      type:            featureKey,
      referenceId,
      amount,
      status:          "pending",
      razorpayOrderId: order.id,
    });

    res.json({
      success:       true,
      isFree:        false,
      orderId:       order.id,
      transactionId: tx._id,
      keyId:         process.env.RAZORPAY_KEY_ID,
      amount,
      currency:      "INR",
      displayName:   config.displayName,
    });
  } catch (err) {
    console.error("createOrder error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /payment/verify
// Body: { razorpayOrderId, razorpayPaymentId, razorpaySignature, transactionId }
// Validates the HMAC signature and marks the transaction as success.
// ─────────────────────────────────────────────────────────────────────────────
exports.verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature, transactionId } = req.body;

    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${razorpayPaymentId}`)
      .digest("hex");

    if (expected !== razorpaySignature) {
      return res.status(400).json({ success: false, message: "Invalid payment signature" });
    }

    const tx = await Transaction.findByIdAndUpdate(
      transactionId,
      { status: "success", razorpayPaymentId },
      { new: true }
    );

    if (!tx) return res.status(404).json({ message: "Transaction not found" });

    res.json({ success: true, transaction: tx });
  } catch (err) {
    console.error("verifyPayment error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /payment/access?featureKey=reveal_contact&referenceId=xxx
// Check if the authenticated user has a successful transaction for this item.
// ─────────────────────────────────────────────────────────────────────────────
exports.checkAccess = async (req, res) => {
  try {
    const { featureKey, referenceId } = req.query;
    const tx = await Transaction.findOne({
      userId: req.user.id || req.user._id,
      type:   featureKey,
      referenceId,
      status: "success",
    });
    res.json({ success: true, hasAccess: !!tx, isFree: tx?.isFree || false });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /payment/history
// ─────────────────────────────────────────────────────────────────────────────
exports.getHistory = async (req, res) => {
  try {
    const transactions = await Transaction
      .find({ userId: req.user.id || req.user._id })
      .sort({ createdAt: -1 })
      .limit(50);
    res.json({ success: true, transactions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
