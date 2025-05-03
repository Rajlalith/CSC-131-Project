import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import cron from "node-cron";
import jwt from "jsonwebtoken";
import http from "http";
import { Server } from "socket.io";
import multer from "multer";
import path from "path";
import fs from "fs";

import Message from "./models/Messages.js";

import authRoutes from "./routes/auth.js";
import chatRoutes from "./routes/chat.js";
import appointmentRoutes from "./routes/appointments.js";
import paymentRoutes from "./routes/payment.js";
import adminRoutes from "./routes/admin.js";
import userRoutes from "./routes/userRoutes.js";
import payrollRoutes from "./routes/payroll.js";
import tutorRoutes from "./routes/tutors.js";
import reviewRoutes from "./routes/reviews.js";

import Appointment from "./models/Appointment.js";
import BlacklistedToken from "./models/BlacklistedToken.js";
import { sendEmail } from "./utils/emailsender.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const server = http.createServer(app);

// 🔌 Socket.io Setup
const io = new Server(server, {
  cors: { origin: "*" }
});

// 🧠 Track online users
const onlineUsers = new Map();

// 📦 Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static("uploads"));

// 🛡️ Optional Request Logger (for dev/debug)
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  next();
});

// ✅ Multer Storage Config for Uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = "uploads";
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

// ✅ Dynamic Upload Route for Images and Files
app.post("/api/chat/upload", (req, res, next) => {
  const field = req.headers["upload-type"] === "file" ? "file" : "image";
  const dynamicUpload = multer({ storage }).single(field);
  dynamicUpload(req, res, (err) => {
    if (err || !req.file) {
      console.error("❌ Upload error:", err?.message || "No file");
      return res.status(400).json({ message: "Upload failed", error: err?.message });
    }
    const fileUrl = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    res.json({ imageUrl: fileUrl });
  });
});

// 📁 Routes
app.use("/api/auth", authRoutes);         // 🔐 Includes OTP logic
app.use("/api/chat", chatRoutes);
app.use("/api/appointment", appointmentRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tutors", tutorRoutes);
app.use("/api", payrollRoutes);
app.use("/api/reviews", reviewRoutes);

// ✅ Root Route
app.get("/", (req, res) => {
  res.send("✅ EzPremium Tutors Backend is running!");
});

// 🌐 MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log("✅ MongoDB connected");
  server.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
  startReminderCron();
})
.catch(err => console.error("❌ MongoDB connection error:", err.message));

// 🔔 Cron Job to Send Session Reminders
function startReminderCron() {
  cron.schedule("*/10 * * * *", async () => {
    console.log("⏰ Checking upcoming appointments...");
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    try {
      const appointments = await Appointment.find({ reminderSent: false });
      for (const appt of appointments) {
        const appointmentDateTime = new Date(`${appt.date}T${appt.time}`);
        if (appointmentDateTime >= now && appointmentDateTime <= oneHourLater) {
          const subject = "⏰ Reminder: Your Tutoring Session is Coming Up!";
          const html = `
            <h2>Reminder</h2>
            <p><strong>Student:</strong> ${appt.studentName}</p>
            <p><strong>Tutor:</strong> ${appt.tutorName}</p>
            <p><strong>Date:</strong> ${appt.date}</p>
            <p><strong>Time:</strong> ${appt.time}</p>`;
          await sendEmail(appt.tutorEmail, subject, html);
          appt.reminderSent = true;
          await appt.save();
          console.log(`✅ Reminder sent to tutor ${appt.tutorName}`);
        }
      }
    } catch (error) {
      console.error("❌ Reminder error:", error.message);
    }
  });
}

// 📡 SOCKET.IO EVENTS
io.on("connection", (socket) => {
  const userEmail = socket.handshake.query?.email;

  if (userEmail) {
    if (!onlineUsers.has(userEmail)) {
      onlineUsers.set(userEmail, new Set());
    }
    onlineUsers.get(userEmail).add(socket.id);
    io.emit("user-status", { email: userEmail, online: true });
    console.log(`🟢 ${userEmail} connected (${socket.id})`);
  }

  socket.on("sendMessage", async ({ senderId, receiverId, content, type = "text" }) => {
    try {
      const savedMessage = await Message.create({ senderId, receiverId, content, type });
      io.emit("receiveMessage", savedMessage);
    } catch (err) {
      console.error("❌ Failed to save message:", err.message);
    }
  });

  socket.on("typing", ({ senderId, receiverId }) => {
    io.emit("showTyping", { senderId, receiverId });
  });

  socket.on("stopTyping", ({ senderId, receiverId }) => {
    io.emit("hideTyping", { senderId, receiverId });
  });

  socket.on("disconnect", () => {
    if (userEmail && onlineUsers.has(userEmail)) {
      const socketSet = onlineUsers.get(userEmail);
      socketSet.delete(socket.id);
      if (socketSet.size === 0) {
        onlineUsers.delete(userEmail);
        io.emit("user-status", { email: userEmail, online: false });
        console.log(`🔴 ${userEmail} fully disconnected`);
      } else {
        console.log(`🔴 ${userEmail} closed tab (${socket.id})`);
      }
    }
  });
});
