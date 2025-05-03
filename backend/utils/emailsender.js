import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config(); // Load .env

export const sendEmail = async (to, subject, html) => {
  const { GMAIL_USER, GMAIL_PASS } = process.env;

  if (!GMAIL_USER || !GMAIL_PASS) {
    console.error("❌ Missing Gmail credentials in environment variables.");
    throw new Error("Email credentials not configured");
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: GMAIL_USER,
        pass: GMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"EzPremium Tutors" <${GMAIL_USER}>`,
      to,
      subject,
      html,
    };

    const info = await transporter.sendMail(mailOptions);

    if (process.env.NODE_ENV !== "production") {
      console.log("✅ Email sent to:", to);
      console.log("📨 Message ID:", info.messageId);
    }
  } catch (error) {
    console.error("❌ Failed to send email:");
    console.error("Error code:", error.code);
    console.error("Response:", error.response);
    throw new Error("Failed to send email");
  }
};
