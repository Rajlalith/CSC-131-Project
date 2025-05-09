import express from "express";
import Review from "../models/Review.js";
import User from "../models/User.js";

const router = express.Router();

// POST /api/reviews — submit a review (no token logic)
router.post("/", async (req, res) => {
  const { tutorEmail, studentEmail, sessionId, rating, comment } = req.body;

  if (!tutorEmail || !studentEmail || !sessionId || !rating) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const normalizedTutor = tutorEmail.toLowerCase();
  const normalizedStudent = studentEmail.toLowerCase();

  try {
    // Check if student already submitted a review
    const existingStudentReview = await Review.findOne({ sessionId, studentEmail });
    if (existingStudentReview) {
      return res.status(400).json({ message: "Student already submitted review." });
    }

    // Check if tutor already submitted a review
    const existingTutorReview = await Review.findOne({ sessionId, tutorEmail });
    if (existingTutorReview) {
      return res.status(400).json({ message: "Tutor already submitted review." });
    }

    // Create and save review
    await new Review({ tutorEmail, studentEmail, sessionId, rating, comment }).save();

    // Update average rating for tutor
    const allReviews = await Review.find({ tutorEmail });
    const avgRating = (
      allReviews.reduce((sum, r) => sum + r.rating, 0) / allReviews.length
    ).toFixed(2);

    await User.findOneAndUpdate({ email: tutorEmail }, { rating: avgRating });

    return res.json({ message: "Review submitted successfully.", avgRating });
  } catch (err) {
    console.error("❌ Error submitting review:", err);
    return res.status(500).json({ message: "Server error while submitting review." });
  }
});

export default router;
