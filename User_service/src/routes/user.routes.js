// =========================
// user.routes.js
// =========================

const express = require("express");
const router = express.Router();

const userController = require("../controllers/user.controller");
const otpController = require("../controllers/otp.controller");
const { protect } = require("../middleware/auth.middleware");

// ─────────────────────────────────────────
// OTP ROUTES
// ─────────────────────────────────────────

// Step 1 — send OTP to phone
router.post("/send-otp", otpController.sendOtp);

// Step 2 — verify OTP (returns 200 if valid, 400 if not)
router.post("/verify-otp", otpController.verifyOtp);

// Step 3 — after OTP verified, create/login user
// body: { phoneNumber, name, email?, address?, password? }
router.post("/phone-login", userController.phoneLogin);

// ─────────────────────────────────────────
// EMAIL / PASSWORD ROUTES
// ─────────────────────────────────────────

// Register with email + password (OTP flow Step 3 also hits this)
// body: { name, email, password, phoneNumber?, address? }
router.post("/register", userController.registerUser);

// Login with email + password
// body: { email, password }
router.post("/login", userController.loginUser);

// ─────────────────────────────────────────
// GOOGLE OAUTH ROUTE
// ─────────────────────────────────────────

// body: { credential }  — Google ID token from @react-oauth/google
router.post("/google-login", userController.googleLogin);

// ─────────────────────────────────────────
// PROTECTED USER ROUTES
// ─────────────────────────────────────────

router.get("/profile", protect, userController.getUserProfile);
router.put("/profile", protect, userController.updateUserProfile);
router.delete("/delete", protect, userController.deleteUser);
router.post("/logout", protect, userController.logoutUser);

module.exports = router;
