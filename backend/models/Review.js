import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema({
  tutorEmail: {
    type: String,
    required: true,
    match: /.+\@.+\..+/
  },
  studentEmail: {
    type: String,
    required: true,
    match: /.+\@.+\..+/
  },
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Appointment",
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  comment: {
    type: String,
    default: "",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

// Prevent duplicate reviews per session by same student/tutor
reviewSchema.index({ sessionId: 1, studentEmail: 1 }, { unique: true });
reviewSchema.index({ sessionId: 1, tutorEmail: 1 }, { unique: true });

export default mongoose.models.Review || mongoose.model("Review", reviewSchema);