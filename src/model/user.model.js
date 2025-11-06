import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },

    email: {
      type: String,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true,
    },

    phoneNumber: { type: String, unique: true, sparse: true },

    password: { type: String, required: true },

    bio: { type: String, default: "" },

    profilePic: {
      type: String,
      default: "https://www.example.com/default-profile-pic.jpg",
    },

    status: { type: String, default: "Hey there! I'm using ChatApp." },

    isOnline: { type: Boolean, default: false },
    lastSeen: { type: Date, default: Date.now },
    isVerified: { type: Boolean, default: false },

    // Login security
    loginAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },

    // Contacts list
    contacts: [
      {
        name: String,
        phoneNumber: String,
        isUser: { type: Boolean, default: false },
        userRef: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],

    // Friends (confirmed connections)
    friends: [
      {
        userRef: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      },
    ],
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

export default User;
