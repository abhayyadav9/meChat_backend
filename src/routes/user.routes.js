import express from "express";
import { getAllFriends, getAllUsers, updateUserProfile, searchUsers } from "../controllers/user.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";

const router = express.Router();

// 🧍‍♂️ Get all users (optional)
router.get("/all-users", verifyToken, getAllUsers);

// Search users by query (name / email / phone) with pagination and suggestions
router.get("/search", verifyToken, searchUsers);

// ✏️ Update profile route
// 'upload.single("profilePic")' handles multipart form data
router.put("/update-profile", verifyToken, upload.single("profilePic"), updateUserProfile);

//get all friend
router.get("/all-friends/:userId", verifyToken, getAllFriends);




export default router;
