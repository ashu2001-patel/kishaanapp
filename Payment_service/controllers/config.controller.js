const FeatureConfig = require("../model/FeatureConfig");

// ─────────────────────────────────────────────────────────────────────────────
// Default feature configs seeded on first boot
// ─────────────────────────────────────────────────────────────────────────────
const DEFAULTS = [
  {
    featureKey:       "reveal_contact",
    displayName:      "Reveal Contact",
    description:      "View the seller's phone number and WhatsApp link",
    freeLimit:        5,
    premiumFreeLimit: 20,
    price:            900,     // ₹9 in paise (Razorpay uses paise)
    resetPeriod:      "monthly",
  },
  {
    featureKey:       "highlight_post",
    displayName:      "Highlight Post",
    description:      "Feature your listing at the top of search results",
    freeLimit:        2,
    premiumFreeLimit: 5,
    price:            4900,    // ₹49 in paise
    resetPeriod:      "monthly",
  },
  {
    featureKey:       "post_animal",
    displayName:      "Post Animal",
    description:      "Create a new animal listing",
    freeLimit:        3,
    premiumFreeLimit: 20,
    price:            2000,    // ₹20 in paise
    resetPeriod:      "monthly",
  },
];

// Called once on server boot — idempotent (skips existing keys)
exports.seedDefaults = async () => {
  for (const cfg of DEFAULTS) {
    await FeatureConfig.findOneAndUpdate(
      { featureKey: cfg.featureKey },
      { $setOnInsert: cfg },
      { upsert: true, new: false }
    );
  }
  console.log("Feature configs seeded");
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /config/features  (public — frontend reads limits to show UI)
// ─────────────────────────────────────────────────────────────────────────────
exports.getAll = async (_req, res) => {
  try {
    const configs = await FeatureConfig.find({ isActive: true }).select("-__v");
    res.json({ features: configs });
  } catch (err) {
    console.error("getAll configs error:", err);
    res.status(500).json({ message: "Failed to fetch feature configs" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /config/features/:featureKey  (public)
// ─────────────────────────────────────────────────────────────────────────────
exports.getOne = async (req, res) => {
  try {
    const config = await FeatureConfig.findOne({
      featureKey: req.params.featureKey,
      isActive: true,
    });
    if (!config) return res.status(404).json({ message: "Feature not found" });
    res.json(config);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch config" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PUT /config/features/:featureKey  (admin only)
// Change limits/price without touching code.
// ─────────────────────────────────────────────────────────────────────────────
exports.update = async (req, res) => {
  try {
    const allowed = [
      "displayName", "description",
      "freeLimit", "premiumFreeLimit",
      "price", "resetPeriod", "isActive",
    ];

    const update = {};
    allowed.forEach(k => {
      if (req.body[k] !== undefined) update[k] = req.body[k];
    });

    const config = await FeatureConfig.findOneAndUpdate(
      { featureKey: req.params.featureKey },
      update,
      { new: true, runValidators: true }
    );

    if (!config) return res.status(404).json({ message: "Feature not found" });
    res.json({ message: "Config updated", config });
  } catch (err) {
    console.error("update config error:", err);
    res.status(500).json({ message: "Update failed" });
  }
};
