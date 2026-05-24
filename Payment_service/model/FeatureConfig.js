const mongoose = require("mongoose");

// One document per gated feature.
// Admins update these docs to change limits — no code deploy needed.
const featureConfigSchema = new mongoose.Schema(
  {
    featureKey: {
      type: String,
      required: true,
      unique: true,
      // e.g. "reveal_contact" | "highlight_post" | "post_animal"
    },
    displayName:  { type: String, required: true },
    description:  { type: String, default: "" },

    // Free-tier limits per user
    freeLimit:        { type: Number, default: 0 },   // 0 = no free uses
    premiumFreeLimit: { type: Number, default: 0 },   // for users with role "premium"

    // Price charged once the free limit is exhausted (INR paise for Razorpay)
    price: { type: Number, default: 0 },              // 0 = always free

    // How often the free counter resets per user
    resetPeriod: {
      type: String,
      enum: ["lifetime", "monthly", "daily"],
      default: "lifetime",
    },

    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("FeatureConfig", featureConfigSchema);
