const mongoose = require("mongoose");

const pricingSchema = new mongoose.Schema({
  tier: String,
  minUsers: Number,
  maxUsers: Number,
  revealContact: { type: Number, default: 0 },
  postAnimal: { type: Number, default: 0 },
  highlightPost: { type: Number, default: 0 },
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model("Pricing", pricingSchema);