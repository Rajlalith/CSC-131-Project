import express from "express";
import Review from "../models/Review.js";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js"; // ✅ import the auth middleware

const router = express.Router();

// ✅ Submit a new review after session (protected)
router.post("/", protect, async (req, res) => {
  const { tutorEmail, studentEmail, sessionId, rating, comment } = req.body;

  if (!tutorEmail || !studentEmail || !rating || !sessionId) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    // Check if the user making the request matches studentEmail or tutorEmail
    const currentUserEmail = req.user?.email;
    if (currentUserEmail !== studentEmail && currentUserEmail !== tutorEmail) {
      return res.status(403).json({ message: "Not authorized to submit this review." });
    }

    // Check if a review already exists for this session by this reviewer
    const alreadyReviewed = await Review.findOne({
      sessionId,
      studentEmail: currentUserEmail === studentEmail ? studentEmail : undefined,
      tutorEmail: currentUserEmail === tutorEmail ? tutorEmail : undefined,
    });
    if (alreadyReviewed) {
      return res.status(400).json({ message: "Review already submitted for this session." });
    }

    // Save the review
    const newReview = new Review({
      tutorEmail,
      studentEmail,
      sessionId,
      rating,
      comment,
    });

    await newReview.save();

    // Recalculate tutor's average rating
    const reviews = await Review.find({ tutorEmail });
    const total = reviews.reduce((sum, r) => sum + r.rating, 0);
    const avgRating = (total / reviews.length).toFixed(2);

    await User.findOneAndUpdate({ email: tutorEmail }, { rating: avgRating });

    res.json({ message: "Review submitted", avgRating });
  } catch (err) {
    console.error("❌ Review submission error:", err);
    res.status(500).json({ message: "Server error while submitting review." });
  }
});

export default router;
