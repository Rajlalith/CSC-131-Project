import express from "express";
import Appointment from "../models/Appointment.js";
import { sendEmail } from "../utils/emailsender.js";
import { protect } from "../middleware/auth.js";
import { generateReviewEmailHtml } from "../utils/reviewTemplate.js";

const router = express.Router();

// 📬 Book a new appointment
router.post("/book", async (req, res) => {
  const { studentName, studentEmail, tutorName, date, time, notes, tutorEmail } = req.body;

  try {
    if (!studentEmail) return res.status(400).json({ message: "Missing studentEmail" });

    const zoomLink = `https://zoom.us/j/${Math.floor(Math.random() * 1e9)}?pwd=${Math.random().toString(36).substring(2, 10)}`;

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

    const tutorHtml = `
      <h2>New Appointment Details</h2>
      <p><strong>Student:</strong> ${studentName}</p>
      <p><strong>Date:</strong> ${date}</p>
      <p><strong>Time:</strong> ${time}</p>
      <p><strong>Notes:</strong> ${notes || "None"}</p>
      <p><strong>Zoom Link:</strong> <a href="${zoomLink}">${zoomLink}</a></p>
    `;
    await sendEmail(tutorEmail, "📬 New Tutoring Appointment - EzPremium Tutors", tutorHtml);

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
    res.status(500).json({ message: "Booking failed", error: err.message });
  }
});

// ✅ Mark completed by ID and send review email
router.post("/complete/:id", async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    if (appointment.status === "completed") {
      return res.status(200).json({ message: "Already marked as completed" });
    }

    appointment.status = "completed";
    await appointment.save();
    console.log(`✅ Marked completed: ${appointment._id}`);

    const studentReviewHtml = generateReviewEmailHtml(
      appointment.tutorEmail,
      appointment.studentEmail,
      appointment._id,
      "student"
    );
    const tutorReviewHtml = generateReviewEmailHtml(
      appointment.tutorEmail,
      appointment.studentEmail,
      appointment._id,
      "tutor"
    );

    await sendEmail(appointment.studentEmail, "⭐ Rate Your Tutoring Session", studentReviewHtml);
    await sendEmail(appointment.tutorEmail, "⭐ Rate Your Tutoring Session", tutorReviewHtml);

    res.json({ message: "Appointment completed and review emails sent" });
  } catch (err) {
    console.error("❌ Error marking completed:", err.message);
    res.status(500).json({ message: "Failed to mark completed", error: err.message });
  }
});

// ✅ Auto-complete past appointments without needing ID
router.post("/auto-complete", async (req, res) => {
  try {
    const now = new Date();
    const upcomingAppointments = await Appointment.find({ status: "upcoming" });
    const completedAppointments = [];

    for (const appt of upcomingAppointments) {
      const sessionTime = new Date(`${appt.date}T${appt.time}`);
      if (sessionTime < now) {
        appt.status = "completed";
        await appt.save();
        completedAppointments.push(appt._id);

        const studentReviewHtml = generateReviewEmailHtml(
          appt.tutorEmail,
          appt.studentEmail,
          appt._id,
          "student"
        );
        const tutorReviewHtml = generateReviewEmailHtml(
          appt.tutorEmail,
          appt.studentEmail,
          appt._id,
          "tutor"
        );

        await sendEmail(appt.studentEmail, "⭐ Rate Your Tutoring Session", studentReviewHtml);
        await sendEmail(appt.tutorEmail, "⭐ Rate Your Tutoring Session", tutorReviewHtml);
      }
    }

    res.json({
      message: `✅ ${completedAppointments.length} appointments auto-marked as completed`,
      ids: completedAppointments
    });
  } catch (err) {
    console.error("❌ Auto-complete error:", err.message);
    res.status(500).json({ message: "Auto-complete failed", error: err.message });
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
      status: "upcoming"
    }).sort({ date: 1, time: 1 });

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: "Fetch failed", error: err.message });
  }
});

// 🔒 Student completed
router.get("/completed-student", protect, async (req, res) => {
  const { studentName } = req.query;
  const today = new Date().toISOString().split("T")[0];

  try {
    const appointments = await Appointment.find({
      studentName,
      date: { $lte: today }
    }).sort({ date: -1, time: -1 });

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: "Fetch failed", error: err.message });
  }
});

// 🔒 Tutor upcoming
router.get("/upcoming", protect, async (req, res) => {
  const { tutorEmail } = req.query;
  const today = new Date().toISOString().split("T")[0];

  try {
    const appointments = await Appointment.find({
      tutorEmail,
      date: { $gte: today }
    }).sort({ date: 1, time: 1 });

    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: "Fetch failed", error: err.message });
  }
});

// 📋 All appointments for a student
router.get("/student/:name", async (req, res) => {
  try {
    const appointments = await Appointment.find({ studentName: req.params.name }).sort({ date: -1, time: -1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: "Fetch failed", error: err.message });
  }
});

// 📋 All tutor sessions
router.get("/tutors/sessions", protect, async (req, res) => {
  const { email } = req.query;

  try {
    const appointments = await Appointment.find({ tutorEmail: email }).sort({ date: -1, time: -1 });
    res.json(appointments);
  } catch (err) {
    res.status(500).json({ message: "Fetch failed", error: err.message });
  }
});

// ❌ Cancel appointment
router.delete("/cancel/:id", protect, async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);
    if (!appointment) return res.status(404).json({ message: "Appointment not found" });

    const cancelHtml = `
      <h2>Session Cancelled</h2>
      <p><strong>Student:</strong> ${appointment.studentName}</p>
      <p><strong>Tutor:</strong> ${appointment.tutorName}</p>
      <p><strong>Date:</strong> ${appointment.date}</p>
      <p><strong>Time:</strong> ${appointment.time}</p>
    `;

    await sendEmail(appointment.tutorEmail, "❌ Tutoring Session Cancelled", cancelHtml);

    res.json({ message: "Appointment cancelled and tutor notified" });
  } catch (err) {
    res.status(500).json({ message: "Cancellation failed", error: err.message });
  }
});

export default router;
