import express from "express";
import Message from "../models/Message.js";

const router = express.Router();

// Send a message (text, image, or file)
router.post("/", async (req, res) => {
  const { senderId, receiverId, content, type = "text" } = req.body;

  if (!senderId || !receiverId || !content) {
    return res.status(400).json({ message: "Missing fields" });
  }

  try {
    const message = await Message.create({ senderId, receiverId, content, type });
    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Fetch all messages between two users
router.get("/:user1Id/:user2Id", async (req, res) => {
  const { user1Id, user2Id } = req.params;
  try {
    const messages = await Message.find({
      $or: [
        { senderId: user1Id, receiverId: user2Id },
        { senderId: user2Id, receiverId: user1Id },
      ],
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get last message preview
router.get("/last", async (req, res) => {
  const { user1, user2 } = req.query;

  try {
    const lastMessage = await Message.findOne({
      $or: [
        { senderId: user1, receiverId: user2 },
        { senderId: user2, receiverId: user1 },
      ],
    }).sort({ createdAt: -1 });

    res.json(lastMessage || {});
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
