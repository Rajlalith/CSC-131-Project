import express from "express";
import Appointment from "../models/Appointment.js";
import { sendEmail } from "../utils/emailsender.js";
import { protect } from "../middleware/auth.js";
import { generateReviewEmailHtml } from "../utils/reviewTemplate.js";

const router = express.Router();

// 📬 Book a new appointment (emails to tutor + student)
router.post("/book", async (req, res) => {
  const { studentName, studentEmail, tutorName, date, time, notes, tutorEmail } = req.body;

  try {
    if (!studentEmail) {
      return res.status(400).json({ message: "Missing studentEmail in request" });
    }

    const zoomLink = `https://zoom.us/j/${Math.floor(Math.random() * 1000000000)}?pwd=${Math.random().toString(36).substring(2, 10)}`;

    const newAppointment = new Appointment({
      studentName,
      studentEmail,
      tutorName,
      date,
      time,
      notes,
      tutorEmail,
      status: "upcoming",
      reminderSent: false,
    });

    await newAppointment.save();

    // ✅ Email to tutor
    const tutorHtml = `
      <h2>New Appointment Details</h2>
      <p><strong>Student:</strong> ${studentName}</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Time:</strong> ${time}</p>
      <p><strong>Notes:</strong> ${notes || "None"}</p>
      <p><strong>Zoom Link:</strong> <a href="${zoomLink}">${zoomLink}</a></p>
    `;
    await sendEmail(tutorEmail, "📬 New Tutoring Appointment - EzPremium Tutors", tutorHtml);

    // ✅ Email to student
    const studentHtml = `
      <h2>Your Appointment is Confirmed</h2>
      <p><strong>Tutor:</strong> ${tutorName}</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Time:</strong> ${time}</p>
      <p><strong>Notes:</strong> ${notes || "None"}</p>
      <p><strong>Zoom Link:</strong> <a href="${zoomLink}">${zoomLink}</a></p>
    `;
    await sendEmail(studentEmail, "📬 Your Tutoring Appointment is Confirmed", studentHtml);

    res.status(200).json({ message: "Appointment booked. Emails sent!", zoomLink });
  } catch (err) {
    console.error("❌ Booking failed:", err.message);
    res.status(500).json({ message: "Failed to book appointment", error: err.message });
  }
});

// ✅ Mark completed and send review email
router.post("/complete/:id", protect, async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    appointment.status = "completed";
    await appointment.save();

    const reviewHtml = generateReviewEmailHtml(
      appointment.tutorEmail,
      appointment.studentEmail,
      appointment._id
    );

    await sendEmail(appointment.studentEmail, "⭐ Rate Your Tutoring Session", reviewHtml);

    res.json({ message: "Appointment completed and review email sent" });
  } catch (err) {
    res.status(500).json({ message: "Failed to complete appointment", error: err.message });
  }
});

// 🔒 Student upcoming
router.get("/upcoming-student", protect, async (req, res) => {
  const { studentName } = req.query;
  const today = new Date().toISOString().split("T")[0];

  try {
    const appointments = await Appointment.find({
      studentName,
      date: { $gt: today },
      status: "upcoming",
    }).sort({ date: 1, time: 1 });

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch", error: err.message });
  }
});

// 🔒 Student completed
router.get("/completed-student", protect, async (req, res) => {
  const { studentName } = req.query;
  const today = new Date().toISOString().split("T")[0];

  try {
    const appointments = await Appointment.find({
      studentName,
      date: { $lte: today },
    }).sort({ date: -1, time: -1 });

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch", error: err.message });
  }
});

// 🔒 Tutor upcoming
router.get("/upcoming", protect, async (req, res) => {
  const { tutorEmail } = req.query;
  const today = new Date().toISOString().split("T")[0];

  try {
    const appointments = await Appointment.find({
      tutorEmail,
      date: { $gte: today },
    }).sort({ date: 1, time: 1 });

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch tutor upcoming appointments", error: err.message });
  }
});

// 📋 All for student
router.get("/student/:name", async (req, res) => {
  try {
    const appointments = await Appointment.find({ studentName: req.params.name }).sort({ date: -1, time: -1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch", error: err.message });
  }
});

// 📋 All for tutor (used by tutor-session-history)
router.get("/tutors/sessions", protect, async (req, res) => {
  const { email } = req.query;

  try {
    const appointments = await Appointment.find({ tutorEmail: email }).sort({ date: -1, time: -1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch tutor sessions", error: err.message });
  }
});

// ❌ Cancel
router.delete("/cancel/:id", protect, async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    const html = `
      <h2>Session Cancelled</h2>
      <p><strong>Student:</strong> ${appointment.studentName}</p>
      <p><strong>Tutor:</strong> ${appointment.tutorName}</p>
      <p><strong>Date:</strong> ${appointment.date}</p>
      <p><strong>Time:</strong> ${appointment.time}</p>
    `;

    await sendEmail(appointment.tutorEmail, "❌ Tutoring Session Cancelled", html);
    res.json({ message: "Appointment cancelled and tutor notified." });
  } catch (err) {
    res.status(500).json({ message: "Failed to cancel", error: err.message });
  }
});

export default router;
