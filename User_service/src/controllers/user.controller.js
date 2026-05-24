// =========================
// user.controller.js
// =========================

const User = require("../models/user.model");
const generateToken = require("../utils/generateToken");
const { OAuth2Client } = require("google-auth-library");
const { sendSms, WELCOME_MESSAGE } = require("./otp.controller");

const trySendWelcome = async (phone, name) => {
  if (!phone) return;
  try { await sendSms(phone, WELCOME_MESSAGE(name)); }
  catch (e) { console.warn("Welcome SMS skipped:", e.message); }
};

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ─────────────────────────────────────────
// Helper — build safe user object for response
// ─────────────────────────────────────────
const safeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email || null,
  phoneNumber: user.phoneNumber || null,
  address: user.address || null,
  role: user.role,
  authProvider: user.authProvider,
});

// =========================
// REGISTER WITH EMAIL + PASSWORD
// POST /users/register
// Called after OTP is verified on frontend (OTP flow)
// OR directly from Gmail manual form
// body: { name, email, password, phoneNumber, address }
// =========================

exports.registerUser = async (req, res) => {
  try {
    const { name, email, password, phoneNumber, address } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    // Check duplicate email
    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Check duplicate phone (if provided)
    if (phoneNumber) {
      const phoneExists = await User.findOne({ phoneNumber });
      if (phoneExists) {
        return res.status(400).json({ message: "Phone number already registered" });
      }
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,          // model pre-save hook hashes this — see user.model.js
      phoneNumber: phoneNumber || undefined,
      address: address || undefined,
      authProvider: "local",
      role: "user",
    });

    const token = generateToken(user);

    res.status(201).json({ token, user: safeUser(user) });
  } catch (err) {
    console.error("registerUser error:", err);
    res.status(500).json({ message: "Registration failed" });
  }
};

// =========================
// LOGIN WITH EMAIL + PASSWORD
// POST /users/login
// body: { email, password }
// =========================

exports.loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    if (user.authProvider === "google") {
      return res.status(400).json({
        message: "This account uses Google Sign-In. Please login with Google.",
      });
    }

    if (user.authProvider === "otp") {
      return res.status(400).json({
        message: "This account uses Phone/OTP login. Please login with your phone.",
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user);
    res.json({ token, user: safeUser(user) });
  } catch (err) {
    console.error("loginUser error:", err);
    res.status(500).json({ message: "Login failed" });
  }
};

// =========================
// GOOGLE LOGIN / REGISTER
// POST /users/google-login
// body: { credential }  — Google ID token from frontend
// =========================

exports.googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: "Google token missing" });
    }

    // Verify token with Google
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { sub: googleId, email, name } = ticket.getPayload();

    if (!email) {
      return res.status(400).json({ message: "Google account has no email" });
    }

    let user      = await User.findOne({ email: email.toLowerCase() });
    let isNewUser = false;

    if (!user) {
      isNewUser = true;
      user = await User.create({
        name,
        email: email.toLowerCase(),
        googleId,
        authProvider: "google",
        role: "user",
      });
      // Google doesn't give us a phone number — welcome SMS sent if they add one later
    } else {
      if (!user.googleId) {
        user.googleId = googleId;
        if (user.authProvider === "local") user.authProvider = "google";
        await user.save();
      }
    }

    const token = generateToken(user);
    res.json({ token, user: safeUser(user), isNewUser });
  } catch (err) {
    console.error("googleLogin error:", err);
    res.status(500).json({ message: "Google login failed" });
  }
};

// =========================
// PHONE LOGIN (after OTP verified by /verify-otp)
// POST /users/phone-login
// body: { phoneNumber, name?, email?, address?, password? }
//
// Two scenarios:
//   1. User already exists → just log them in
//   2. New user → create account with provided details
// =========================

exports.phoneLogin = async (req, res) => {
  try {
    const { phoneNumber, name, email, address, password } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ message: "Phone number required" });
    }

    // Normalise phone
    const digits = phoneNumber.replace(/\D/g, "").replace(/^0+/, "");
    const normalisedPhone = digits.length === 10 ? `+91${digits}` : digits;

    let user = await User.findOne({ phoneNumber: normalisedPhone });

    if (!user) {
      // New user — name is required to create account
      if (!name) {
        return res.status(400).json({ message: "Name required for new account" });
      }

      // Check email uniqueness if provided
      if (email) {
        const emailExists = await User.findOne({ email: email.toLowerCase() });
        if (emailExists) {
          return res.status(400).json({ message: "Email already registered" });
        }
      }

      user = await User.create({
        name,
        phoneNumber: normalisedPhone,
        email: email ? email.toLowerCase() : undefined,
        address: address || undefined,
        password: password || undefined,
        authProvider: "otp",
        role: "user",
      });

      // Fire-and-forget welcome SMS
      trySendWelcome(normalisedPhone, name);
    }

    const isNewUser = !!(name && user.createdAt > new Date(Date.now() - 5000));
    const token = generateToken(user);
    res.json({ token, user: safeUser(user), isNewUser });
  } catch (err) {
    console.error("phoneLogin error:", err);
    res.status(500).json({ message: "Phone login failed" });
  }
};

// =========================
// GET PROFILE
// GET /users/profile  (protected)
// =========================

exports.getUserProfile = (req, res) => {
  res.json({ user: safeUser(req.user) });
};

// =========================
// UPDATE PROFILE
// PUT /users/profile  (protected)
// body: { name?, email?, phoneNumber?, address? }
// =========================

exports.updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const { name, email, phoneNumber, address } = req.body;

    if (name) user.name = name;
    if (address) user.address = address;

    if (phoneNumber && phoneNumber !== user.phoneNumber) {
      const exists = await User.findOne({ phoneNumber });
      if (exists) {
        return res.status(400).json({ message: "Phone number already in use" });
      }
      user.phoneNumber = phoneNumber;
    }

    if (email && email.toLowerCase() !== user.email) {
      const exists = await User.findOne({ email: email.toLowerCase() });
      if (exists) {
        return res.status(400).json({ message: "Email already in use" });
      }
      user.email = email.toLowerCase();
    }

    await user.save();
    res.json({ message: "Profile updated", user: safeUser(user) });
  } catch (err) {
    console.error("updateUserProfile error:", err);
    res.status(500).json({ message: "Update failed" });
  }
};

// =========================
// DELETE ACCOUNT
// DELETE /users/delete  (protected)
// =========================

exports.deleteUser = async (req, res) => {
  try {
    await User.findByIdAndDelete(req.user._id);
    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    console.error("deleteUser error:", err);
    res.status(500).json({ message: "Delete failed" });
  }
};

// =========================
// LOGOUT
// POST /users/logout  (protected)
// JWT is stateless — client must discard token
// =========================

exports.logoutUser = (_req, res) => {
  res.json({ message: "Logged out. Please remove JWT from client." });
};
