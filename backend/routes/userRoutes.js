import express from "express";
import User from "../models/User.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// 👥 Get all users (students + tutors) — ✅ Protected route
router.get("/", protect, async (req, res) => {
  try {
    const users = await User.find({}, "name email _id role");
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// 👤 Get tutor profile by email
router.get("/tutor", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const tutor = await User.findOne({ email, role: "tutor" });
    if (!tutor) return res.status(404).json({ message: "Tutor not found" });

    res.json({
      name: tutor.name,
      email: tutor.email,
      bio: tutor.bio || "",
      subjects: tutor.subjects || [],
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch tutor", error: err.message });
  }
});

// ✏️ Update tutor profile
router.put("/tutors/update", async (req, res) => {
  const { email, bio, subjects } = req.body;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const updated = await User.findOneAndUpdate(
      { email, role: "tutor" },
      { bio, subjects },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Tutor not found" });

    res.json({ message: "Tutor updated", user: updated });
  } catch (err) {
    res.status(500).json({ message: "Failed to update tutor", error: err.message });
  }
});

// 👤 Get student profile by email
router.get("/student", async (req, res) => {
  const { email } = req.query;
  if (!email) return res.status(400).json({ message: "Email is required" });

  try {
    const student = await User.findOne({ email, role: "student" });
    if (!student) return res.status(404).json({ message: "Student not found" });

    const joinedDate = student.joined instanceof Date
      ? student.joined.toLocaleDateString()
      : new Date(student.joined || Date.now()).toLocaleDateString();

    res.json({
      name: student.name,
      email: student.email,
      phone: student.phone || "",
      joined: joinedDate,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch student", error: err.message });
  }
});

// ✏️ Update student profile
router.put("/students/update", async (req, res) => {
  const { email, name, phone } = req.body;
  if (!email || !name) return res.status(400).json({ message: "Name and email are required" });

  try {
    const updated = await User.findOneAndUpdate(
      { email, role: "student" },
      { name, phone },
      { new: true }
    );

    if (!updated) return res.status(404).json({ message: "Student not found" });

    res.json({ message: "Student updated", user: updated });
  } catch (err) {
    res.status(500).json({ message: "Failed to update student", error: err.message });
  }
});

// 📋 Get all tutors (for dropdown)
router.get("/tutors", async (req, res) => {
  try {
    // ✅ Include subjects so frontend can populate subject dropdown
    const tutors = await User.find({ role: "tutor" }).select("name email subjects");
    res.json(tutors);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
