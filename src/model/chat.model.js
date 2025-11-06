import mongoose from "mongoose";

const chatSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ["single", "group"],
      default: "single",
    },

    isGroup: {
      type: Boolean,
      default: false,
    },

    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    groupName: {
      type: String,
      default: "",
      trim: true,
    },

    groupIcon: {
      type: String,
      default: "",
    },

    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Message",
      default: null,
    },
  },
  { timestamps: true }
);

// ⚡ index for faster chat lookup
chatSchema.index({ participants: 1 });

const Chat = mongoose.model("Chat", chatSchema);
export default Chat;
