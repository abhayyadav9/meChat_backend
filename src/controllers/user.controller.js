import cloudinary from "../config/cloudinary.js";
import User from "../model/user.model.js";

//update user profile
export const updateUserProfile = async (req, res) => {
  try {
  
    const userId =
      typeof req.user === "string"
        ? req.user
        : req.user?.userId || req.user?._id || req.user?.id;

    if (!userId || typeof userId !== "string") {
      console.error("Invalid user id in token payload:", req.user);
      return res.status(400).json({ message: "Invalid token payload" });
    }
    const { name, email, phoneNumber, bio } = req.body;
    let profilePic = req.body.profilePic;

    const updatedUser = await User.findById(userId);
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update basic fields
    if (name) updatedUser.name = name;
    if (email) updatedUser.email = email;
    if (bio) updatedUser.bio = bio;
    if (phoneNumber) updatedUser.phoneNumber = phoneNumber;

 
    if (req.file && req.file.buffer) {
      try {
        // Convert buffer to data URL so Cloudinary can accept it directly
        const mime = req.file.mimetype || "image/jpeg";
        const base64 = `data:${mime};base64,${req.file.buffer.toString("base64")}`;
        const uploadResult = await cloudinary.uploader.upload(base64, {
          folder: "user_profiles",
          public_id: `${userId}_profile`,
          overwrite: true,
        });
        updatedUser.profilePic = uploadResult.secure_url;
      } catch (uploadErr) {
        console.error("Cloudinary upload failed:", uploadErr);
        return res.status(500).json({ message: "Image upload failed" });
      }
    } else if (profilePic && typeof profilePic === "string") {
      // If frontend sends a base64/data URL string, upload it
      if (profilePic.startsWith("data:")) {
        try {
          const uploadResult = await cloudinary.uploader.upload(profilePic, {
            folder: "user_profiles",
            public_id: `${userId}_profile`,
            overwrite: true,
          });
          updatedUser.profilePic = uploadResult.secure_url;
        } catch (uploadErr) {
          console.error("Cloudinary upload failed:", uploadErr);
          return res.status(500).json({ message: "Image upload failed" });
        }
      } else {
        // If the frontend already gives a URL, just save it
        updatedUser.profilePic = profilePic;
      }
    }

    await updatedUser.save();

    res.status(200).json({
      status: "success",
      message: "Profile updated successfully!",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};


const getAllUsers = async (req, res) => {
  try {
    // Safely extract user ID from token payload
    const userId =
      typeof req.user === "string"
        ? req.user
        : req.user?.userId || req.user?._id || req.user?.id;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ message: "Invalid token payload" });
    }

    // Fetch the current user to build an exclusion list (self + friends)
    const currentUser = await User.findById(userId).select("friends");

    const friendIds = (currentUser?.friends || [])
      .map((f) => {
        if (!f) return null;
        if (typeof f.userRef === "string") return f.userRef;
        if (f.userRef && f.userRef._id) return f.userRef._id.toString();
        if (f.userRef && f.userRef.toString) return f.userRef.toString();
        return null;
      })
      .filter(Boolean);

    const excludeIds = [userId, ...friendIds];

    // Pagination params (defaults)
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
    const skip = (page - 1) * limit;

    const baseFilter = {
      isVerified: true,
      _id: { $nin: excludeIds },
    };

    // Total matching count (for client to determine hasMore)
    const total = await User.countDocuments(baseFilter);

    // Get paginated users
    const users = await User.find(baseFilter)
      .select("-password")
      .skip(skip)
      .limit(limit)
      .lean();

    res.status(200).json({ results: users, total, page, limit });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// get all friends for the current user (or a provided userId param)
const getAllFriends = async (req, res) => {
  try {
    // Prefer explicit param for admin-like requests, but fall back to authenticated user
    let userId = req.params?.userId;

    if (!userId) {
      userId =
        typeof req.user === "string"
          ? req.user
          : req.user?.userId || req.user?._id || req.user?.id;
    }

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ message: "Invalid user ID" });
    }

    // Populate the nested userRef inside friends so we return full user objects
    const user = await User.findById(userId).populate({
      path: "friends.userRef",
      select: "-password",
    });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Normalize to an array of user objects
    const friends = (user.friends || []).map((f) => f.userRef).filter(Boolean);

    res.status(200).json({ friends });
  } catch (error) {
    console.error("Error fetching friends:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

//get all invitations requests







export { getAllUsers, getAllFriends,  };

// Search users by name, email, or phone number with simple relevance and pagination
export const searchUsers = async (req, res) => {
  try {
    const userId =
      typeof req.user === "string"
        ? req.user
        : req.user?.userId || req.user?._id || req.user?.id;

    if (!userId || typeof userId !== "string") {
      return res.status(400).json({ message: "Invalid token payload" });
    }

    const q = (req.query.q || "").trim();
    const page = Math.max(parseInt(req.query.page || "1", 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || "20", 10), 1), 100);
    const category = req.query.category || "all"; // reserved for future filters

    if (!q) {
      return res.status(200).json({ results: [], total: 0 });
    }

    // Build a case-insensitive regex for searching. Escape special regex chars.
    const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const safeQ = escapeRegex(q);

    // We try to prefer prefix matches by looking for '^' first for each field, then fallback to contains
    const prefixRegex = new RegExp(`^${safeQ}`, "i");
    const containsRegex = new RegExp(safeQ, "i");

    // Exclude current user
    const exclude = { _id: { $ne: userId } };

    // We'll run a two-stage query: prefix matches first (higher relevance), then contains matches.
    const baseQuery = {
      isVerified: true,
      ...exclude,
    };

    // Compose OR conditions across name, email, phoneNumber
    const prefixConditions = [
      { name: prefixRegex },
      { email: prefixRegex },
      { phoneNumber: prefixRegex },
    ];

    const containsConditions = [
      { name: containsRegex },
      { email: containsRegex },
      { phoneNumber: containsRegex },
    ];

    // First get prefix matches
    const prefixQuery = { ...baseQuery, $or: prefixConditions };
    const containsQuery = { ...baseQuery, $or: containsConditions };

    // Find prefix matches
    const prefixMatches = await User.find(prefixQuery)
      .select("name email phoneNumber profilePic")
      .limit(limit)
      .skip((page - 1) * limit)
      .lean();

    // If fewer than limit, fetch additional contains matches excluding ids already included
    let results = prefixMatches || [];
    if (results.length < limit) {
      const alreadyIds = results.map((r) => r._id);
      const extraQuery = { ...containsQuery, _id: { $nin: alreadyIds.concat([userId]) } };
      const extra = await User.find(extraQuery)
        .select("name email phoneNumber profilePic")
        .limit(limit - results.length)
        .lean();
      results = results.concat(extra);
    }

    // A simple total count (could be optimized)
    const total = await User.countDocuments(containsQuery);

    res.status(200).json({ results, total, page, limit, query: q, category });
  } catch (error) {
    console.error("Error searching users:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
