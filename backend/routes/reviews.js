import express from "express";
import Review from "../models/Review.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// 🔐 Helper to decode token from email link
const validateReviewToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_REVIEW_SECRET);
  } catch {
    return null;
  }
};

// POST /api/reviews — submit a review (supports both auth and email token)
router.post("/", async (req, res) => {
  let currentUserEmail = null;
  const authHeader = req.headers.authorization;
  const tokenFromBody = req.body.token;

  // Option 1: Authenticated via Bearer JWT
  if (authHeader?.startsWith("Bearer ")) {
    try {
      const decoded = jwt.verify(authHeader.split(" ")[1], process.env.JWT_SECRET);
      currentUserEmail = decoded.email;
    } catch {
      return res.status(401).json({ message: "Invalid or expired authentication token" });
    }
  }

  // Option 2: Authenticated via special review token from email
  if (!currentUserEmail && tokenFromBody) {
    const decoded = validateReviewToken(tokenFromBody);
    if (!decoded) {
      return res.status(401).json({ message: "Invalid or expired review token" });
    }
    currentUserEmail = decoded.email;
  }

  if (!currentUserEmail) {
    return res.status(401).json({ message: "No token provided" });
  }

  const { tutorEmail, studentEmail, sessionId, rating, comment } = req.body;

  if (!tutorEmail || !studentEmail || !sessionId || !rating) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  // Normalize for case-insensitive email match
  const normalizedUser = currentUserEmail.toLowerCase();
  const normalizedTutor = tutorEmail.toLowerCase();
  const normalizedStudent = studentEmail.toLowerCase();

  try {
    // 🎓 Student review
    if (normalizedUser === normalizedStudent) {
      const existing = await Review.findOne({ sessionId, studentEmail });
      if (existing) {
        return res.status(400).json({ message: "Student already submitted review." });
      }

      await new Review({ tutorEmail, studentEmail, sessionId, rating, comment }).save();

      const allReviews = await Review.find({ tutorEmail });
      const avgRating = (
        allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
      ).toFixed(2);

      await User.findOneAndUpdate({ email: tutorEmail }, { rating: avgRating });

      return res.json({ message: "Student review submitted successfully.", avgRating });
    }

    // 🧑‍🏫 Tutor review
    if (normalizedUser === normalizedTutor) {
      const existing = await Review.findOne({ sessionId, tutorEmail });
      if (existing) {
        return res.status(400).json({ message: "Tutor already submitted review." });
      }

      await new Review({ tutorEmail, studentEmail, sessionId, rating, comment }).save();
      return res.json({ message: "Tutor review submitted successfully." });
    }

    return res.status(403).json({ message: "Not authorized to submit this review." });
  } catch (err) {
    console.error("❌ Error submitting review:", err);
    return res.status(500).json({ message: "Server error while submitting review." });
  }
});

export default router;
