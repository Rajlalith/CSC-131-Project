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
    default: 0,
  },
  verified: {
    type: Boolean,
    default: false,
  },

  // Password reset fields
  resetToken: {
    type: String,
  },
  tokenExpiry: {
    type: Date,
  },
}, { timestamps: true });

// TTL index for OTP (10 minutes)
userSchema.index({ otpCreatedAt: 1 }, { expireAfterSeconds: 600 });

const User = mongoose.model("User", userSchema);

export default User;

