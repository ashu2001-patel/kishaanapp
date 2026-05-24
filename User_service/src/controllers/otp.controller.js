// =========================
// otp.controller.js
// Custom Twilio SMS — full Rural Company branded messages
// =========================

const twilio = require("twilio");
const Otp    = require("../models/otp.model");

// Lazy Twilio client — crashes only if credentials are missing at call time
const getClient = () => {
  const sid   = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token || sid.startsWith("ACxx")) return null;
  return twilio(sid, token);
};

const MESSAGING_SID = () => process.env.TWILIO_MESSAGING_SID;

// ─── Message templates ────────────────────────────────────
const OTP_MESSAGE = (code, name) =>
`🌾 Rural Company

Hi${name ? ` ${name}` : ""}! Your verification code is:

  ${code}

Valid for 10 minutes. Do not share this code with anyone.

— Rural Company
  Connecting Farmers with the Market 🚜`;

// Exported so user.controller can call it after registration
const WELCOME_MESSAGE = (name) =>
`🌾 Welcome to Rural Company, ${name}!

Your account has been created successfully.

With Rural Company you can:
• 🐄 Buy & sell livestock
• 🔧 Rent & trade farming tools
• 🌱 Discover plants & seeds

Happy farming!
— Rural Company Team`;

// ─── Internal helper used by user.controller ─────────────
const sendSms = async (to, body) => {
  const client = getClient();
  if (!client) throw new Error("Twilio not configured");
  const sid = MESSAGING_SID();
  await client.messages.create({
    to,
    body,
    ...(sid ? { messagingServiceSid: sid } : {}),
  });
};

exports.sendSms       = sendSms;
exports.WELCOME_MESSAGE = WELCOME_MESSAGE;

// =========================
// SEND OTP
// POST /users/send-otp
// body: { phoneNumber }  — 10 digits, no country code
// =========================

exports.sendOtp = async (req, res) => {
  try {
    const { phoneNumber, name } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({ message: "Phone number required" });
    }

    const digits = phoneNumber.replace(/\D/g, "").replace(/^0+/, "");
    if (digits.length !== 10) {
      return res.status(400).json({ message: "Enter a valid 10-digit number" });
    }

    const e164 = `+91${digits}`;

    if (!getClient()) {
      return res.status(503).json({ message: "OTP service not configured — add Twilio credentials to .env" });
    }

    // 6-digit code
    const code      = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    // Replace any existing OTP for this number
    await Otp.deleteMany({ phoneNumber: e164 });
    await Otp.create({ phoneNumber: e164, code, expiresAt });

    await sendSms(e164, OTP_MESSAGE(code, name));

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error("sendOtp error:", err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
};

// =========================
// VERIFY OTP
// POST /users/verify-otp
// body: { phoneNumber, otp }
// =========================

exports.verifyOtp = async (req, res) => {
  try {
    const { phoneNumber, otp } = req.body;

    if (!phoneNumber || !otp) {
      return res.status(400).json({ message: "Phone and OTP required" });
    }

    const digits = phoneNumber.replace(/\D/g, "").replace(/^0+/, "");
    const e164   = `+91${digits}`;

    const record = await Otp.findOne({ phoneNumber: e164, used: false });

    if (!record) {
      return res.status(400).json({ message: "OTP not found. Please request a new one." });
    }
    if (new Date() > record.expiresAt) {
      await record.deleteOne();
      return res.status(400).json({ message: "OTP expired. Please request a new one." });
    }
    if (record.code !== otp.trim()) {
      return res.status(400).json({ message: "Invalid OTP. Please try again." });
    }

    record.used = true;
    await record.save();

    res.json({ message: "OTP verified", verified: true });
  } catch (err) {
    console.error("verifyOtp error:", err);
    res.status(500).json({ message: "OTP verification failed" });
  }
};
