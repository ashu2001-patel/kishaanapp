// =========================
// user.model.js
// =========================

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      lowercase: true,
      sparse: true,   // allows multiple docs with null email
      unique: true,
      trim: true,
    },

    password: {
      type: String,
      // Not required — Google/OTP users have no password
    },

    phoneNumber: {
      type: String,
      sparse: true,   // allows multiple docs with null phoneNumber
      unique: true,
      trim: true,
    },

    googleId: {
      type: String,
    },

    authProvider: {
      type: String,
      enum: ["local", "google", "otp"],
      required: true,
    },

    address: {
      type: String,
      trim: true,
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user",
    },
  },
  { timestamps: true }
);

// ─────────────────────────────────────────
// Pre-save hook — hash password before saving
// Only runs if password field is present & modified
// ─────────────────────────────────────────
userSchema.pre("save", async function (next) {
  if (!this.password || !this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// ─────────────────────────────────────────
// Instance method — compare plain password to hash
// ─────────────────────────────────────────
userSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.password) return false;
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
