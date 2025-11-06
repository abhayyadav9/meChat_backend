import mongoose from "mongoose";

const authTokenSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    otp: { type: String },
    purpose: {
      type: String,
      enum: ["emailVerification", "phoneVerification", "passwordReset"],
      required: true,
    },
    email: { type: String },
    verificationAttempts: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

// 🔥 TTL index → auto delete expired OTPs after expiry time
authTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const AuthToken = mongoose.model("AuthToken", authTokenSchema);

export default AuthToken;
