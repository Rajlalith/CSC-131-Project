import express from "express";
import User from "../models/User.js";
import Appointment from "../models/Appointment.js";
import { protect } from "../middleware/auth.js"; // ✅ import protect middleware

const router = express.Router();

// ✅ GET all tutors (protected route)
router.get("/tutors", protect, async (req, res) => {
  try {
    const tutors = await User.find({ role: "tutor" }).select(
      "name email bio subjects rating photoUrl isAvailable"
    );

    res.json(tutors);
  } catch (error) {
    console.error("❌ Failed to fetch tutors:", error);
    res.status(500).json({ message: "Server error while fetching tutors." });
  }
});

// ✅ Update tutor profile
router.put("/update", protect, async (req, res) => {
  const { email, name, bio, subjects, photoUrl, rating, isAvailable } = req.body;

  try {
    const tutor = await User.findOne({ email, role: "tutor" });
    if (!tutor) return res.status(404).json({ message: "Tutor not found" });

    if (name !== undefined) tutor.name = name;
    if (bio !== undefined) tutor.bio = bio;
    if (subjects !== undefined) tutor.subjects = subjects;
    if (photoUrl !== undefined) tutor.photoUrl = photoUrl;
    if (rating !== undefined) tutor.rating = rating;
    if (isAvailable !== undefined) tutor.isAvailable = isAvailable;

    await tutor.save();
    res.json({ message: "Tutor updated successfully", tutor });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get tutor sessions by email
router.get("/sessions", protect, async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const sessions = await Appointment.find({ tutorEmail: email }).sort({ date: -1 });
    res.json(sessions);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;

