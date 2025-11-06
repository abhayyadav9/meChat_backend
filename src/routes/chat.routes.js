import express from "express";
import { verifyToken } from "../middleware/auth.middleware.js";
import { getUserChats } from "../controllers/chat.controller.js";


const router = express.Router();

// tiny logger to confirm the request reaches this router (helps debug client/network issues)

router.get("/all-chats", verifyToken, getUserChats);

export default router;