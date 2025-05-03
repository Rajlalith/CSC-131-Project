import express from "express";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import dotenv from "dotenv";
import User from "../models/User.js";
import BlacklistedToken from "../models/BlacklistedToken.js";
import { sendEmail } from "../utils/emailsender.js";

dotenv.config();
const router = express.Router();

// REGISTER
router.post("/register", async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "Email already exists" });

    const isAdmin = role === "admin";
    const otp = isAdmin ? undefined : Math.floor(100000 + Math.random() * 900000).toString();

    const user = await User.create({
      name,
      email,
      password,
      role,
      otp,
      otpCreatedAt: isAdmin ? undefined : new Date(),
      verified: isAdmin,
    });

    if (!isAdmin) {
      const html = `
        <p>Hello ${name},</p>
        <p>Your OTP for EzPremium Tutors registration is:</p>
        <h2>${otp}</h2>
        <p>This OTP is valid for 10 minutes.</p>
      `;
      await sendEmail(email, "Verify Your EzPremium Tutors Account", html);
    }

    res.status(201).json({
      message: isAdmin ? "Admin registered successfully." : "User registered. OTP sent to email.",
    });
  } catch (err) {
    console.error("❌ Registration error:", err);
    res.status(500).json({ message: "Registration failed", error: err });
  }
});

// RESEND OTP
router.post("/resend-otp", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });
    if (user.verified) return res.status(400).json({ message: "User already verified" });

    const now = new Date();
    const lastSent = user.otpCreatedAt || new Date(0);
    const minutesSinceLastOTP = (now - lastSent) / 60000;

    if (minutesSinceLastOTP < 1) {
      return res.status(429).json({ message: "Please wait at least 1 minute before resending OTP." });
    }

    const newOtp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = newOtp;
    user.otpCreatedAt = now;
    await user.save();

    const html = `
      <p>Hello ${user.name},</p>
      <p>Your new OTP for EzPremium Tutors is:</p>
      <h2>${newOtp}</h2>
      <p>This OTP will expire in 10 minutes.</p>
    `;

    await sendEmail(email, "Resend OTP - EzPremium Tutors", html);
    res.json({ message: "New OTP sent to your email." });
  } catch (err) {
    console.error("❌ Resend OTP error:", err);
    res.status(500).json({ message: "Failed to resend OTP." });
  }
});

// VERIFY OTP
router.post("/verify-otp", async (req, res) => {
  const { email, otp } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });
    if (user.verified) return res.status(400).json({ message: "User already verified" });

    const now = new Date();
    const diffMinutes = (now - user.otpCreatedAt) / 60000;
    if (diffMinutes > 10) return res.status(400).json({ message: "OTP expired" });

    if (user.otp !== otp) return res.status(400).json({ message: "Incorrect OTP" });

    user.verified = true;
    user.otp = undefined;
    user.otpCreatedAt = undefined;
    await user.save();

    res.json({ message: "Email verified successfully. You can now login." });
  } catch (err) {
    console.error("❌ OTP verification error:", err);
    res.status(500).json({ message: "Verification failed" });
  }
});

// LOGIN
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid email" });

    if (!user.verified && user.role !== "admin") {
      return res.status(403).json({ message: "Please verify your email before logging in." });
    }

    if (user.password !== password) {
      return res.status(400).json({ message: "Invalid password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      role: user.role,
      user: {
        name: user.name,
        email: user.email,
      },
    });
  } catch (err) {
    console.error("❌ Login error:", err);
    res.status(500).json({ message: "Login failed", error: err.message });
  }
});

// LOGOUT
router.post("/logout", async (req, res) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const expiry = new Date(decoded.exp * 1000);

      const blacklisted = new BlacklistedToken({ token, expiresAt: expiry });
      await blacklisted.save();

      return res.status(200).json({ message: "Logged out and token blacklisted" });
    } catch (err) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }
  } else {
    return res.status(400).json({ message: "No token provided" });
  }
});

// FORGOT PASSWORD 
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.json({ message: "If the email exists, a reset link has been sent." });

    const token = crypto.randomBytes(32).toString("hex");
    user.resetToken = token;
    user.tokenExpiry = Date.now() + 3600000;
    await user.save();

    const resetURL = `${process.env.CLIENT_URL}/reset-password.html?token=${token}`;
    const html = `
      <p>Hello ${user.name},</p>
      <p>You requested a password reset.</p>
      <p>Click this link to reset your password:</p>
      <a href="${resetURL}">${resetURL}</a>
      <p>This link expires in 1 hour.</p>
    `;

    await sendEmail(user.email, "Reset Your Password - EzPremium Tutors", html);
    res.json({ message: "Reset link sent! Check your email." });
  } catch (err) {
    console.error("❌ Forgot password error:", err);
    res.status(500).json({ message: "Something went wrong." });
  }
});

// RESET PASSWORD 
router.post("/reset-password/:token", async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const user = await User.findOne({
      resetToken: token,
      tokenExpiry: { $gt: Date.now() },
    });

    if (!user) return res.status(400).json({ message: "Invalid or expired token" });

    user.password = password;
    user.resetToken = undefined;
    user.tokenExpiry = undefined;
    await user.save();

    res.json({ message: "Password updated successfully!" });
  } catch (err) {
    console.error("❌ Reset password error:", err);
    res.status(500).json({ message: "Failed to reset password." });
  }
});

export default router;
