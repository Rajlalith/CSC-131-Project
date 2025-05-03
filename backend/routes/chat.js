import express from "express";
import Message from "../models/Messages.js";

const router = express.Router();

// Send a message
router.post("/send", async (req, res) => {
  try {
    const { sender, receiver, content, type } = req.body;

    const newMsg = new Message({
      senderId: sender,
      receiverId: receiver,
      content,
      type: type || "text"
    });

    await newMsg.save();
    res.status(201).json({ message: "Message sent", data: newMsg });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get conversation between two users
router.get("/conversations/:user1/:user2", async (req, res) => {
  const { user1, user2 } = req.params;

  try {
    const messages = await Message.find({
      $or: [
        { senderId: user1, receiverId: user2 },
        { senderId: user2, receiverId: user1 },
      ],
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Last message between two users 
router.get("/last", async (req, res) => {
  const { user1, user2 } = req.query;

  try {
    const msg = await Message.findOne({
      $or: [
        { senderId: user1, receiverId: user2 },
        { senderId: user2, receiverId: user1 },
      ],
    }).sort({ createdAt: -1 });

    res.json(msg || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Edit message
router.put("/edit/:id", async (req, res) => {
  try {
    const updated = await Message.findByIdAndUpdate(
      req.params.id,
      { content: req.body.content },
      { new: true }
    );
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete message
router.delete("/delete/:id", async (req, res) => {
  try {
    await Message.findByIdAndDelete(req.params.id);
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

