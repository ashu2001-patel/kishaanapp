const mongoose = require("mongoose");

// One document per (user × feature). Compound unique index prevents duplicates.
const usageRecordSchema = new mongoose.Schema(
  {
    userId:     { type: mongoose.Schema.Types.ObjectId, required: true },
    featureKey: { type: String, required: true },

    freeUsed:   { type: Number, default: 0 }, // free uses consumed this period

    // Start of current reset period (used for monthly/daily resets)
    periodStart: { type: Date, default: Date.now },

    lastUsedAt: { type: Date },
  },
  { timestamps: true }
);

usageRecordSchema.index({ userId: 1, featureKey: 1 }, { unique: true });

module.exports = mongoose.model("UsageRecord", usageRecordSchema);
