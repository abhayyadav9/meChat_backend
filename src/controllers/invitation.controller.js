import Invitation from "../model/Invitation.js";
import User from "../model/user.model.js";


const sendInvitation = async (req, res) => {
  try {
    const { receiverId } = req.params;

    const userId = typeof req.user === "string"
      ? req.user
      : req.user?.userId || req.user?._id || req.user?.id;

    console.log(receiverId, userId);

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ message: "Receiver not found" });
    }

    const existingInvitation = await Invitation.findOne({
      sender: userId,
      receiver: receiverId,
    });
    console.log(existingInvitation);

    if (existingInvitation && existingInvitation.isActiveInvitation) {
      return res.status(400).json({ message: "Invitation already sent" });
    }

    const newInvitation = new Invitation({
      sender: userId,
      receiver: receiverId,
      message: "You have a new friend request!",
    });

    await newInvitation.save();

    return res.status(201).json({
      invitation: newInvitation,
      message: "Invitation sent successfully",
    });
  } catch (error) {
    console.error("Error sending invitation:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


 const getAllInvitations = async (req, res) => {
  try {
    // ✅ Extract logged-in user ID safely
    const { userId } = req.params;

    if (!userId) {
      return res.status(400).json({ success: false, message: "Invalid or missing user ID" });
    }

    // ✅ Fetch all pending invitations where the current user is the receiver
    const invitations = await Invitation.find({
      receiver: userId,
      status: "pending",
      isActiveInvitation:true
    })
      .populate("sender", "name profilePic email") // Include only necessary fields
      .sort({ createdAt: -1 }); // Sort newest first

    // ✅ Handle empty state gracefully
    if (!invitations || invitations.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        invitations: [],
        message: "No pending invitations found",
      });
    }

    // ✅ Return consistent structured response
    return res.status(200).json({
      success: true,
      count: invitations.length,
      invitations,
    });
  } catch (error) {
    console.error("❌ Error fetching invitations:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};


//cancel invitation
const rejectChatInvitation = async (req, res) => {
  console.log("rejection")
  try {
    const { senderId } = req.params;
    const userId =
      typeof req.user === "string"
        ? req.user
        : req.user?.userId || req.user?._id || req.user?.id;

    // Validate userId
    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ message: "Invalid user ID" });
    }
    const invitation = await Invitation.findOne({
      sender: senderId,
      receiver: userId,
    });

    console.log("sender",senderId,"receiver",userId)

    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    invitation.isActiveInvitation=false;
    await invitation.save();

    if(invitation.status==="accepted"){
      return res.status(400).json({
        message:"all ready accepted"
      })
    }

    // if(invitation.status==="rejected"){
    //   return res.status(400).json({
    //     message:"all ready rejected"
    //   })
    // }

    if (invitation) {
      invitation.status = "rejected";
      await invitation.save();
    }

    return res
      .status(200)
      .json({
        invitation: invitation,
        message: "Invitation canceled successfully",
      });
  } catch (error) {
    console.error("Error canceling invitation:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};



// Accept friend request and add to friend list
const addToFriendList = async (req, res) => {
  try {
    const { receiverId } = req.params; // the sender of the original invite
  const userId =
      typeof req.user === "string"
        ? req.user
        : req.user?.userId || req.user?._id || req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Invalid user ID" });
    }

    // Find invitation (the sender is the one who originally sent it)
    const invitation = await Invitation.findOne({
      sender: receiverId,
      receiver: userId,
    });

    if (!invitation) {
      return res.status(404).json({ message: "Invitation not found" });
    }

    // Find both users
    const currentUser = await User.findById(userId);
    const senderUser = await User.findById(receiverId);

    if (!currentUser || !senderUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if already friends
    const alreadyFriends =
      currentUser.friends.some(
        (f) => f.userRef.toString() === receiverId.toString()
      ) ||
      senderUser.friends.some(
        (f) => f.userRef.toString() === userId.toString()
      );

    if (alreadyFriends) {
      return res.status(400).json({ message: "You are already friends" });
    }



    // Add each other as friends
    currentUser.friends.push({ userRef: receiverId });
    senderUser.friends.push({ userRef: userId });

    // Update invitation status
    invitation.status = "accepted";

    // Save all changes
    await Promise.all([currentUser.save(), senderUser.save(), invitation.save()]);

    return res.status(200).json({
      success: true,
      message: "Friend added successfully!",
      friend: {
        id: senderUser._id,
        name: senderUser.name,
        profilePic: senderUser.profilePic,
        email: senderUser.email,
      },
    });
  } catch (error) {
    console.error("Error adding to friend list:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export { sendInvitation, getAllInvitations, rejectChatInvitation, addToFriendList };
