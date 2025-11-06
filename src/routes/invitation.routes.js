import express from "express";

import { verifyToken } from "../middleware/auth.middleware.js";
import { addToFriendList, rejectChatInvitation, getAllInvitations, sendInvitation } from "../controllers/invitation.controller.js";

const router = express.Router();


router.post("/invite/:receiverId", verifyToken, sendInvitation);
router.post("/reject-invite/:senderId", verifyToken, rejectChatInvitation);
router.get("/all-invitations/:userId", verifyToken, getAllInvitations);
router.post("/add-friend/:receiverId", verifyToken, addToFriendList);


export default router;
