import Chat from "../model/chat.model.js";

export const getUserChats = async (req, res) => {
  try {
    const userId =
      typeof req.user === "string"
        ? req.user
        : req.user?.userId || req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(400).json({ message: "Invalid token payload" });
    }

    // fetch chats
    const chats = await Chat.find({ participants: userId })
      .populate({
        path: "participants",
        select: "name email profilePic", // only the fields you need
      })
      .populate({
        path: "lastMessage",
        select: "content createdAt  messageType status",
      })
      .sort({ updatedAt: -1 })
      .select("participants lastMessage updatedAt isGroup");

    // map to only include other participant + last message
    const formattedChats = chats.map((chat) => {
      const otherParticipant = chat.participants.find(
        (p) => p._id.toString() !== userId.toString()
      );

      return {
        _id: chat._id,
        isGroup: chat.isGroup,
        updatedAt: chat.updatedAt,
        otherParticipant: otherParticipant || null, // now includes name/email/profilePic
        lastMessage: chat.lastMessage
          ? {
              content: chat.lastMessage.content,
              createdAt: chat.lastMessage.createdAt,
              messageType: chat.lastMessage.messageType,
              status: chat.lastMessage.status,
            }
          : null,
      };
    });

    res.status(200).json({ success: true, chats: formattedChats });
  } catch (err) {
    console.error("Error fetching chats:", err.message);
    res.status(500).json({ success: false, message: err.message });
  }
};
