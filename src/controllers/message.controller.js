import Chat from "../model/chat.model.js";
import Message from "../model/message.model.js";
import cloudinary from "../config/cloudinary.js";
import { getIO } from "../config/socket.js";

// ✅ Send Message API

export const sendMessage = async (req, res) => {
  try {
    const { senderId, receiverId, content, replyTo } = req.body;
    let media = req.body.media;
    console.log("mesg", replyTo);

    // allow messages that have either text content or media/file
    if (!senderId || !receiverId || (!content && !media && !req.file)) {
      return res.status(400).json({
        message: "senderId, receiverId and content or media required",
      });
    }

    // 1️⃣ Find existing chat or create a new one
    let chat = await Chat.findOne({
      type: "single",
      participants: { $all: [senderId, receiverId] },
    });

    if (!chat) {
      chat = await Chat.create({
        type: "single",
        participants: [senderId, receiverId],
      });
    }

    // derive a fallback userId for public_id naming (prefer authenticated user if present)
    const userId =
      typeof req.user === "string"
        ? req.user
        : req.user?.userId || req.user?._id || req.user?.id || senderId;

    // Handle media upload (if any) BEFORE creating the DB message so we don't leave orphan messages
    let mediaUrl = null;
    let messageType = "text";

    if (req.file && req.file.buffer) {
      try {
        const mime = req.file.mimetype || "image/jpeg";
        const base64 = `data:${mime};base64,${req.file.buffer.toString(
          "base64"
        )}`;
        const uploadResult = await cloudinary.uploader.upload(base64, {
          folder: "media",
          public_id: `${userId}_media_${Date.now()}`,
          overwrite: true,
        });
        mediaUrl = uploadResult.secure_url;
        messageType = "image";
      } catch (uploadErr) {
        console.error("Cloudinary upload failed:", uploadErr);
        return res.status(500).json({ message: "Image upload failed" });
      }
    } else if (media && typeof media === "string") {
      if (media.startsWith("data:")) {
        try {
          const uploadResult = await cloudinary.uploader.upload(media, {
            folder: "media",
            public_id: `${userId}_media_${Date.now()}`,
            overwrite: true,
          });
          mediaUrl = uploadResult.secure_url;
          messageType = "image";
        } catch (uploadErr) {
          console.error("Cloudinary upload failed:", uploadErr);
          return res.status(500).json({ message: "Image upload failed" });
        }
      } else {
        // frontend provided a hosted URL
        mediaUrl = media;
        // rudimentary type inference from URL extension
        if (/(jpg|jpeg|png|gif|webp|svg)$/i.test(media.split("?")[0]))
          messageType = "image";
        else messageType = "file";
      }
    }

    // 2️⃣ Create the message (include mediaUrl/messageType if present)
    const message = await Message.create({
      chatId: chat._id,
      sender: senderId,
      content: content || "",
      fromMe: true,
      status: "sent",
      replyTo: replyTo || null,
      messageType,
      mediaUrl,
    });

    // 3️⃣ Update last message reference
    chat.lastMessage = message._id;
    await chat.save();

    // 4️⃣ Populate sender info for frontend display
    const populatedMessage = await message.populate([
      { path: "sender", select: "name profilePic" },
      {
        path: "replyTo",
        select: "content messageType mediaUrl sender",
        populate: { path: "sender", select: "name profilePic" },
      },
    ]);
    // emit via socket io
    const io = getIO();
    io.emit("newMessage", populatedMessage);

    res.status(201).json({
      success: true,
      message: "Message sent successfully!",
      data: populatedMessage,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMessagesInChat = async (req, res) => {
  try {
    const receiverId = req.params.activeChatUserId;
    const userId = req.user?.userId || req.user?._id || req.user?.id;

    if (!receiverId || !userId)
      return res
        .status(400)
        .json({ message: "User ID and Receiver ID required!" });

    let chat = await Chat.findOne({
      type: "single",
      participants: { $all: [userId, receiverId] },
    });

    if (!chat) {
      chat = await Chat.create({
        type: "single",
        participants: [userId, receiverId],
      });
    }

    const page = Math.max(parseInt(req.query.page || "1"), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20"), 1), 200);
    const q = (req.query.q || "").trim();

    const baseFilter = { chatId: chat._id };
    if (q)
      baseFilter.content = new RegExp(
        q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );

    const total = await Message.countDocuments(baseFilter);
    const skip = Math.max(0, total - page * limit);

    const results = await Message.find(baseFilter)
      .populate("sender", "name profilePic")
      .populate({
        path: "replyTo",
        select: "content messageType mediaUrl sender",
        populate: { path: "sender", select: "name profilePic" },
      })
      // .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    const hasMore = skip > 0;

    // auto mark seen
    await Message.updateMany(
      { chatId: chat._id, sender: { $ne: userId }, status: { $ne: "seen" } },
      { $set: { status: "seen" }, $addToSet: { readBy: userId } }
    );

    res.status(200).json({ results, total, page, limit, hasMore });
  } catch (error) {
    console.error("❌ Error getting messages in chat:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

//react on the message,
export const reactOnMessage = async (req, res) => {
  try {
    const { messageId, reaction } = req.body;
    const userId = req.user?._id || req.user?.userId;

    if (!messageId || !reaction) {
      return res.status(400).json({
        message: "Message ID and reaction are required",
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    // ✅ Find if this user already reacted
    const existingReactionIndex = message.reactions.findIndex(
      (r) => r.user.toString() === userId.toString()
    );

    if (existingReactionIndex !== -1) {
      // 👀 User already reacted
      if (message.reactions[existingReactionIndex].emoji === reaction) {
        // 🗑️ Same emoji -> remove (toggle off)
        message.reactions.splice(existingReactionIndex, 1);
      } else {
        // 🔁 Different emoji -> update it
        message.reactions[existingReactionIndex].emoji = reaction;
      }
    } else {
      // ✨ New reaction
      message.reactions.push({ user: userId, emoji: reaction });
    }

    await message.save();

    // 🧩 Emit real-time update (to sender + receiver if you’re not using rooms)
    const io = getIO();
    io.emit("messageReacted", {
      messageId,
      userId,
      reaction,
      reactions: message.reactions,
    });

    res.status(200).json({
      message: "Reaction updated successfully",
      data: message.reactions,
    });
  } catch (error) {
    console.error("❌ Error reacting to message:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


//delete the message;

export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user?._id || req.user?.userId;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });
    if (message.sender.toString() !== userId)
      return res.status(403).json({ message: "Not authorized" });

    message.content = "This message has been deleted";
    await message.save();

    // emit socket event
    const io = getIO();
    io.emit("messageDeleted", { messageId }); // broadcast to all participants

    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Internal server error" });
  }
};
