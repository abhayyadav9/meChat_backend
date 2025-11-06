import User from "../model/user.model.js";
import AuthToken from "../model/authtoken.model.js";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import {
  sendResetPasswordEmail,
  sendVerificationCode,
  sendWelcomeEmail,
} from "../middleware/emailService/email.js";


 const register = async (req, res) => {
  try {
    const { name, email, phoneNumber, password } = req.body;

    // 🔹 Validate required fields
    if (!name || !password || (!email && !phoneNumber)) {
      return res
        .status(400)
        .json({ message: "Insufficient details provided" });
    }

    // 🔹 Check if user already exists
    const existingUser = await User.findOne({ email });

    if (existingUser && existingUser.isVerified) {
      return res
        .status(409)
        .json({ status: false, message: "User already exists" });
    }

    // 🔹 If old unverified user exists, delete it safely
    if (existingUser && !existingUser.isVerified) {
      try {
        await User.findByIdAndDelete(existingUser._id);
      } catch (err) {
        console.error("Error deleting unverified user:", err);
        return res
          .status(500)
          .json({ message: "Server error, try again later" });
      }
    }

    // 🔹 Hash password securely
    const hashedPassword = await bcrypt.hash(password, 10);

    // 🔹 Create new user
    const user = new User({
      name,
      email,
      phoneNumber,
      password: hashedPassword,
      isVerified: false,
    });
    await user.save();

    // 🔹 Generate a 6-digit OTP
    const generateOtp = () => {
      const n = crypto.randomInt(0, 1000000);
      return String(n).padStart(6, "0");
    };
    const otp = generateOtp();

    // 🔹 Define token details
    const purpose = email ? "emailVerification" : "phoneVerification";
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

    // 🔹 Remove any old token for same user (cleanup)
    await AuthToken.deleteMany({ email, purpose });

    // 🔹 Hash OTP before saving (for security)
    // const hashedOtp = await bcrypt.hash(otp, 10);

    // 🔹 Save new OTP token
    const authToken = new AuthToken({
      userId: user._id,
      otp,
      email,
      purpose,
      expiresAt,
    });
    await authToken.save();

    // 🔹 Send OTP via email (async safe)
    await sendVerificationCode(email, otp, user.name);

    console.log(`✅ OTP sent to ${email}: ${otp}`);

    return res.status(201).json({
      status: true,
      message: "User registered successfully. OTP sent for verification.",
      userId: user._id,
    });
  } catch (error) {
    console.error("Registration Error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};






//account verification
const verifyAccount = async (req, res) => {
  try {
    const { email, otp } = req.body;
    console.log(email,otp)
    if (!email || !otp) {
      return res.status(400).json({ message: "Insufficient details provided" });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const authToken = await AuthToken.findOne({
      userId: user._id,
      purpose: "emailVerification",
      verified: false,
    });

    if (!authToken) {
      return res.status(400).json({ message: "OTP not found" });
    }

    if (authToken.expiresAt < Date.now()) {
      return res.status(400).json({ message: "OTP has expired" });
    }

    if (authToken.verificationAttempts >= 5) {
      return res.status(400).json({
        message:
          "Maximum verification attempts exceeded. Please try again later.",
      });
    }


        const isMatch = authToken.otp === otp;
      

    // 🧩 FIX: type-safe comparison
    if (!isMatch) {
      authToken.verificationAttempts += 1;
      await authToken.save();
      return res.status(400).json({ message: "Invalid OTP. Please try again." });
    }

        user.isVerified = true;
            await user.save();


    await AuthToken.findOneAndDelete({
      userId: user._id,
      purpose: "emailVerification",
    });


    await sendWelcomeEmail(email, user.name);

    return res.status(200).json({ message: "Account verified successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


//login

const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: "Insufficient details provided" });

    // 🔍 Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) return res.status(404).json({ message: "User not found" });
if(!user.isVerified){
  return res.status(404).json({message: "please register your account"})
}
    // 🔑 Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid credentials" });

    // 🪪 Create JWT
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    //    res.cookie("token", token, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production", // true for HTTPS
    //   sameSite: "Strict", // safer than 'None' unless you need cross-origin
    //   maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    // });

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "None", // must be "None" for cross-site cookies
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // 🍪 Set cookie
    // res.cookie("token", token, {
    //   httpOnly: true,
    //   secure: process.env.NODE_ENV === "production", // true for HTTPS
    //   sameSite: process.env.NODE_ENV === "production" ? 'None' : 'Lax',
    //   maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    // });

    // 🧹 Remove password before sending
    const { password: _, ...userData } = user._doc;

    // ✅ Response
    return res.status(200).json({
      status: true,
      message: "Login successful! You are now logged in.",
      user: userData,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//logout

const logout = (req, res) => {
  try {
    const { userId } = req.user;
    if (!userId) {
      return res.status(400).json({ message: "Invalid request" });
    }
    // Clear the token cookie

    res.clearCookie("token");
    return res.status(200).json({ message: "Logout successful" });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//forgot password

/**
 * STEP 1: Find Account & Send OTP
 */
const findAccount = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user)
      return res.status(200).json({
        message: "If this email exists, an OTP has been sent",
      }); // privacy safe

    // Generate 6-digit OTP
    const otp = String(crypto.randomInt(0, 1000000)).padStart(6, "0");
    console.log("Generated OTP:", otp);

    const hashedOtp = await bcrypt.hash(otp, 10);

    const existingToken = await AuthToken.findOne({
      userId: user._id,
      purpose: "passwordReset",
    });

    if (existingToken) {
      existingToken.otp = hashedOtp;
      existingToken.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await existingToken.save();
    } else {
      // Create OTP token (valid for 10 minutes)
      const authToken = new AuthToken({
        userId: user._id,
        otp: hashedOtp,
        purpose: "passwordReset",
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
      await authToken.save();
    }

    // Send OTP via email (you can hook Nodemailer or SendGrid here)
    // await sendEmail(user.email, `Your OTP code is ${otp}`);
    await sendResetPasswordEmail(email, otp);

    return res.status(200).json({
      status: true,
      userId: user._id,

      message: "If this email exists, an OTP has been sent",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
};

/**
 * STEP 2: Verify OTP
 */
const verifyOtp = async (req, res) => {
  try {
    const { email, otp, userId } = req.body;
    if (!email || !otp || !userId)
      return res.status(400).json({ message: "Insufficient details provided" });

    const user = await User.findOne({
      email: email.toLowerCase().trim(),
      _id: userId,
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    const authToken = await AuthToken.findOne({
      userId,
      purpose: "passwordReset",
    });

    if (!authToken || authToken.expiresAt < Date.now())
      return res.status(400).json({ message: "OTP expired or not found" });

    if (authToken.verificationAttempts >= 5)
      return res.status(400).json({
        message: "Maximum verification attempts exceeded. Try again later.",
      });
    console.log(otp);

    const isOtpValid = await bcrypt.compare(otp, authToken.otp);
    if (!isOtpValid) {
      authToken.verificationAttempts += 1;
      await authToken.save();
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // OTP valid — delete token and issue temporary reset token
    await AuthToken.findByIdAndDelete(authToken._id);

    const resetToken = jwt.sign(
      { userId: user._id, purpose: "reset" },
      process.env.JWT_SECRET,
      { expiresIn: "10m" }
    );

    const cookieOptions = {
      httpOnly: true, // prevents JS access to cookie
      secure: process.env.NODE_ENV === "production", // only https in prod
      sameSite: "Strict", // prevents CSRF
      maxAge: 10 * 60 * 1000, // 10 min for reset token
    };

    res.cookie("resetToken", resetToken, cookieOptions).status(200).json({
      message: "OTP verified successfully",
    });

    return res.status(200).json({
      message: "OTP verified successfully",
      resetToken,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * STEP 3: Update Password (using reset token)
 */
const updatePassword = async (req, res) => {
  try {

    // 1️⃣ Get token from cookies
    const token = req.cookies.resetToken;
    if (!token)
      return res.status(401).json({ message: "Missing authorization token" });

    // 2️⃣ Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 3️⃣ Check token purpose
    if (decoded.purpose !== "reset")
      return res.status(401).json({ message: "Invalid token purpose" });

    // 4️⃣ Extract password
    const { password } = req.body;
    if (!password)
      return res.status(400).json({ message: "Password is required" });

    // 5️⃣ Find user
    const user = await User.findById(decoded.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    // 6️⃣ Hash and update password
    user.password = await bcrypt.hash(password, 10);
    await user.save();

    // 7️⃣ Clear reset token cookie (security 🔒)
    res.clearCookie("resetToken");

    // 8️⃣ Respond success
    return res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Error updating password:", error);
    if (
      error.name === "JsonWebTokenError" ||
      error.name === "TokenExpiredError"
    ) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

//password update











//resend otp
const resendOtp = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });
    const user = await User.findOne({
      email: email.toLowerCase().trim(),
    })
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    const generateOtp = () =>{
      const n = crypto.randomInt(0,1000000);
      return String(n).padStart(6,"0");
    }
    const createOtp = generateOtp();
    const hashedOtp = await bcrypt.hash(createOtp, 10);
    console.log("Resent OTP:", createOtp);
    
    const existingToken = await AuthToken.findOne({
      userId: user._id,
      purpose: "passwordReset",
    });
    if (existingToken) {
      existingToken.otp = hashedOtp;
      existingToken.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await existingToken.save();
    } else {
      // Create OTP token (valid for 10 minutes)
      const authToken = new AuthToken({
        userId: user._id,
        purpose: "passwordReset",
        otp: hashedOtp,
        expiresAt: new Date(Date.now() + 10 * 60 * 1000),
      });
      await authToken.save();
    }

   // Send OTP via email (implementation not shown)
   await sendResetPasswordEmail(user.email, createOtp);

   return res.status(200).json({ message: "OTP resent successfully" });
  } catch (error) {
    console.error("Error resending OTP:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};






 







export {
  register,
  verifyAccount,
  login,
  logout,
  findAccount,
  verifyOtp,
  updatePassword,
  resendOtp,
};
