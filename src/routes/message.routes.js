import express from "express";
import { deleteMessage, getMessagesInChat, reactOnMessage, sendMessage } from "../controllers/message.controller.js";
import { verifyToken } from "../middleware/auth.middleware.js";
import upload from "../middleware/upload.middleware.js";


const router = express.Router();

// tiny logger to confirm the request reaches this router (helps debug client/network issues)

router.post("/send-message", verifyToken,upload.single("mediaUrl") , sendMessage);
router.get("/chat-messages/:activeChatUserId", verifyToken, getMessagesInChat);
router.post("/react-message", verifyToken, reactOnMessage);
router.post("/delete-message/:messageId", verifyToken, deleteMessage);

export default router;