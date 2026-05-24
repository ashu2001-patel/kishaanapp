const FeatureConfig = require("../model/FeatureConfig");
const UsageRecord   = require("../model/UsageRecord");
const Transaction   = require("../model/transection.model");

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function periodStart(resetPeriod) {
  const now = new Date();
  if (resetPeriod === "monthly") {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  if (resetPeriod === "daily") {
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }
  return null; // lifetime — no reset
}

function isExpired(record, config) {
  if (config.resetPeriod === "lifetime") return false;
  const start = periodStart(config.resetPeriod);
  return record.periodStart < start;
}

async function getOrCreateRecord(userId, featureKey, config) {
  let record = await UsageRecord.findOne({ userId, featureKey });

  if (!record) {
    record = await UsageRecord.create({ userId, featureKey });
    return record;
  }

  // Reset expired period
  if (isExpired(record, config)) {
    record.freeUsed   = 0;
    record.periodStart = periodStart(config.resetPeriod) || record.periodStart;
    await record.save();
  }

  return record;
}

function effectiveLimit(config, userRole) {
  return userRole === "premium" ? config.premiumFreeLimit : config.freeLimit;
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /usage/check/:featureKey?referenceId=xxx
// Returns whether the user can use a feature and how many free uses remain.
// ─────────────────────────────────────────────────────────────────────────────
exports.checkFeature = async (req, res) => {
  try {
    const { featureKey }  = req.params;
    const { referenceId } = req.query;
    const userId          = req.user.id || req.user._id;

    const config = await FeatureConfig.findOne({ featureKey, isActive: true });
    if (!config) return res.status(404).json({ message: "Feature not found" });

    const limit  = effectiveLimit(config, req.user.role);
    const record = await getOrCreateRecord(userId, featureKey, config);

    const freeUsed  = record.freeUsed;
    const remaining = Math.max(0, limit - freeUsed);
    const canUseFree = remaining > 0;

    // Check per-item paid access (for features like reveal_contact where the
    // user pays once to access a specific animal's contact permanently)
    let hasPaidAccess = false;
    if (referenceId) {
      const paid = await Transaction.findOne({
        userId, type: featureKey, referenceId, status: "success",
      });
      hasPaidAccess = !!paid;
    }

    return res.json({
      canUse:          canUseFree || hasPaidAccess,
      remaining,
      freeLimit:       limit,
      freeUsed,
      requiresPayment: !canUseFree && !hasPaidAccess,
      price:           config.price,
      isPaid:          hasPaidAccess,
      resetPeriod:     config.resetPeriod,
      displayName:     config.displayName,
    });
  } catch (err) {
    console.error("checkFeature error:", err);
    res.status(500).json({ message: "Usage check failed" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /usage/record/:featureKey
// Called after the user successfully uses a free slot.
// Increments freeUsed. Returns updated remaining count.
// ─────────────────────────────────────────────────────────────────────────────
exports.recordUsage = async (req, res) => {
  try {
    const { featureKey } = req.params;
    const userId         = req.user.id || req.user._id;

    const config = await FeatureConfig.findOne({ featureKey, isActive: true });
    if (!config) return res.status(404).json({ message: "Feature not found" });

    const limit  = effectiveLimit(config, req.user.role);
    let record   = await getOrCreateRecord(userId, featureKey, config);

    // Guard: refuse if already over free limit (shouldn't happen with checkFeature first,
    // but prevents direct API abuse)
    if (record.freeUsed >= limit) {
      return res.status(403).json({
        message: "Free limit reached. Payment required.",
        requiresPayment: true,
        price: config.price,
      });
    }

    record.freeUsed  += 1;
    record.lastUsedAt = new Date();
    await record.save();

    const remaining = Math.max(0, limit - record.freeUsed);

    return res.json({
      success:   true,
      freeUsed:  record.freeUsed,
      remaining,
      freeLimit: limit,
    });
  } catch (err) {
    console.error("recordUsage error:", err);
    res.status(500).json({ message: "Usage record failed" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /usage/status
// Dashboard view: all active features + the current user's usage for each.
// ─────────────────────────────────────────────────────────────────────────────
exports.getUserStatus = async (req, res) => {
  try {
    const userId  = req.user.id || req.user._id;
    const configs = await FeatureConfig.find({ isActive: true });

    const features = await Promise.all(
      configs.map(async (config) => {
        const limit  = effectiveLimit(config, req.user.role);
        const record = await getOrCreateRecord(userId, config.featureKey, config);

        const freeUsed  = record.freeUsed;
        const remaining = Math.max(0, limit - freeUsed);

        return {
          featureKey:   config.featureKey,
          displayName:  config.displayName,
          description:  config.description,
          freeLimit:    limit,
          freeUsed,
          remaining,
          price:        config.price,
          resetPeriod:  config.resetPeriod,
          canUseFree:   remaining > 0,
        };
      })
    );

    return res.json({ features });
  } catch (err) {
    console.error("getUserStatus error:", err);
    res.status(500).json({ message: "Status fetch failed" });
  }
};
