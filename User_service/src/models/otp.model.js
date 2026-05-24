const mongoose = require("mongoose");

const otpSchema = new mongoose.Schema({
  phoneNumber: { type: String, required: true },
  code:        { type: String, required: true },
  expiresAt:   { type: Date,   required: true },
  used:        { type: Boolean, default: false },
});

// MongoDB auto-deletes the document once expiresAt is past
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model("Otp", otpSchema);
