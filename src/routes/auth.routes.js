
import express from "express";
import { findAccount, login, logout, register, updatePassword, verifyAccount, verifyOtp, resendOtp } from "../controllers/auth.controller.js";
import upload from "../middleware/upload.middleware.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import rateLimit from "express-rate-limit";

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 mins
  max: 5, // 5 OTPs per 10 mins per IP
  message: { message: "Too many OTP requests, try again later." },
  // Be explicit about how we identify clients. In some hosted
  // environments the X-Forwarded-For header is set by a proxy
  // and express-rate-limit will validate trust proxy; to avoid
  // the middleware raising a validation error if headers are
  // present but trust proxy isn't enabled for some reason,
  // use a small, robust keyGenerator that prefers req.ip but
  // falls back to other headers/socket address.
  keyGenerator: (req /*, res*/) => {
    // standard Express IP (honors trust proxy when enabled)
    const ip = req.ip;
    if (ip) return ip;
    // if IP not available, try X-Forwarded-For header (first value)
    const xff = req.headers['x-forwarded-for'];
    if (xff && typeof xff === 'string') return xff.split(',')[0].trim();
    // fallback to socket remote address
    return req.socket?.remoteAddress || 'unknown';
  },
});



const router = express.Router();

// Use upload.none() to accept multipart/form-data without files (text fields).
// If you expect a file, replace upload.none() with upload.single('fieldName')
router.post("/register", upload.none(), register);
router.post("/verify-account", upload.none(), verifyAccount);
router.post("/login", upload.none(), login);
router.post("/logout", verifyToken, upload.none(), logout);
router.post("/find-account",otpLimiter,  upload.none(), findAccount);
router.post("/verify-otp", otpLimiter, upload.none(), verifyOtp);
router.post("/update-password", upload.none(), updatePassword);
router.post("/resend-otp", otpLimiter, upload.none(), resendOtp);



export default router;