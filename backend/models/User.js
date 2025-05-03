import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ["student", "tutor", "admin"],
    default: "student",
  },
  bio: {
    type: String,
    default: "",
  },
  subjects: {
    type: [String],
    default: [],
  },
  rating: {
    type: Number,
    default: null,
  },
  photoUrl: {
    type: String,
    default: "",
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },

  // OTP fields
  otp: {
    type: String,
  },
  otpCreatedAt: {
    type: Date,
  },
  otpResendCount: {
    type: Number,
    default: 0, // optional tracker for abuse prevention
  },
  verified: {
    type: Boolean,
    default: false,
  }
}, { timestamps: true });

// TTL index (optional for ops visibility, doesn't auto-clear individual fields)
userSchema.index({ otpCreatedAt: 1 }, { expireAfterSeconds: 600 }); // 10 min

const User = mongoose.model("User", userSchema);

export default User;
