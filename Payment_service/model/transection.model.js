const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: {
    type: String,
    enum: ["reveal_contact", "post_animal", "highlight_post"],
    required: true
  },
  referenceId: String, // animalId
  amount: Number,
  status: {
    type: String,
    enum: ["pending", "success", "failed"],
    default: "pending"
  },
  razorpayOrderId: String,
  razorpayPaymentId: String,
  isFree: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("Transaction", transactionSchema);