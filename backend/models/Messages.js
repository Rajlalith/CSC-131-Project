// models/Message.js
import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    senderId: { type: String, required: true },
    receiverId: { type: String, required: true },
    content: { type: String, required: true },
    type: { type: String, enum: ["text", "image", "file", "gif"], default: "text" },
    createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

const Message = mongoose.model("Message", messageSchema);
export default Message;
