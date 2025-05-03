import express from "express";
import Appointment from "../models/Appointment.js";
import { protect } from "../middleware/auth.js"; // ✅ Token check

const router = express.Router();

router.get("/tutor/payroll", protect, async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ message: "Tutor email is required" });
  }

  try {
    const sessions = await Appointment.find({ tutorEmail: email });

    const result = sessions.map((session) => ({
      date: session.date,
      time: session.time,
      studentName: session.studentName,
      duration: session.duration || 1,
      status: session.status || "upcoming",
    }));

    res.status(200).json(result);
  } catch (err) {
    console.error("❌ Error fetching payroll:", err.message);
    res.status(500).json({ message: "Failed to fetch payroll data", error: err.message });
  }
});

export default router;

