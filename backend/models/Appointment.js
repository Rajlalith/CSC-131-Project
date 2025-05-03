import mongoose from "mongoose";

const appointmentSchema = new mongoose.Schema({
  studentName: { type: String, required: true },
  studentEmail: { type: String, required: true },
  tutorName: { type: String, required: true },
  date: { type: String, required: true },   
  time: { type: String, required: true },   
  notes: { type: String },
  tutorEmail: { type: String, required: true },
  reminderSent: { type: Boolean, default: false },
  status: { type: String, enum: ["upcoming", "completed", "cancelled"], default: "upcoming" }, 
});

export default mongoose.model("Appointment", appointmentSchema);

