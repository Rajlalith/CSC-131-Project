import Appointment from "../models/Appointment.js";
import nodemailer from "nodemailer";

// ✉️ Sends a review email with a unique link
export const sendReviewEmail = async (recipientEmail, role, sessionId, tutorEmail, studentEmail) => {
  const reviewLink = `https://yourdomain.com/review.html?sessionId=${sessionId}&tutorEmail=${tutorEmail}&studentEmail=${studentEmail}&role=${role}`;
  
  const transporter = nodemailer.createTransport({
    service: "Gmail",
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASSWORD
    }
  });

  await transporter.sendMail({
    to: recipientEmail,
    subject: "⭐ We'd love your feedback!",
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>${role === "student" ? "Hope you enjoyed your session!" : "Thanks for tutoring with us!"}</h2>
        <p>Please take a moment to leave a review:</p>
        <p><a href="${reviewLink}" style="color:#1a73e8; font-weight:bold;" target="_blank">Leave a Review</a></p>
        <p>Thank you for using EzPremium Tutors.</p>
      </div>
    `
  });
};

// ✅ Completes an appointment and sends review links to both parties
export const completeAppointmentAndRequestReview = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Appointment.findById(sessionId);
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    // Optional: Enforce only student or admin can mark as complete
    const currentUser = req.user; // Comes from protect middleware
    if (!currentUser || !["student", "admin"].includes(currentUser.role)) {
      return res.status(403).json({ message: "Unauthorized to complete the session." });
    }

    session.status = "completed";
    await session.save();

    await sendReviewEmail(session.studentEmail, "student", session._id, session.tutorEmail, session.studentEmail);
    await sendReviewEmail(session.tutorEmail, "tutor", session._id, session.tutorEmail, session.studentEmail);

    res.json({ message: "Session completed and review emails sent." });
  } catch (err) {
    console.error("❌ Error completing session:", err.message);
    res.status(500).json({ message: "Server error while completing session." });
  }
};
