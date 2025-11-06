import { transporter } from "./email.config.js";
import { Reset_Password_Email_Template, Verification_Email_Template, Welcome_Email_Template } from "./EmailTemplate.js";
import dotenv from 'dotenv';
dotenv.config();



// ✅ 1. Send Verification Code
export const sendVerificationCode = async (email, verificationCode, name) => {
  try {
    const response = await transporter.sendMail({
      from: `"meChat" <${process.env.BREVO_FROM}>`, // ✅ use your verified sender from Brevo
      to: email,
      subject: "Verify Your Email",
      text: `Hi ${name}! Your verification code is: ${verificationCode}`,
      html: Verification_Email_Template.replace(
        "{verificationCode}",
        verificationCode
      ),
      replyTo: process.env.BREVO_FROM, // optional but clean practice
    });


    console.log("✅ Verification email sent:", response.messageId);
  } catch (error) {
    console.error("❌ Error sending verification email:", error);
  }
};

// ✅ 1. Send Welcome Email
export const sendWelcomeEmail = async (email, name) => {
  try {
    const response = await transporter.sendMail({
      from: `"meChat Team" <${process.env.BREVO_FROM}>`,
      to: email,
      subject: "Welcome to meChat 🎉",
      text: `Hi ${name}, welcome to meChat! We're excited to have you onboard.`,
      html: Welcome_Email_Template.replace("{name}", name),
      replyTo: process.env.BREVO_FROM,
    });

    // console.log("✅ Welcome email sent:", {
    //   to: email,
    //   messageId: response?.messageId,
    // });
  } catch (error) {
    console.error(
      "❌ Error sending welcome email:",
      error?.response || error
    );
  }
};

// ✅ 2. Send Reset Password Email
export const sendResetPasswordEmail = async (email, verificationCode) => {
  try {
    const response = await transporter.sendMail({
      from: `"meChat Support" <${process.env.BREVO_FROM}>`,
      to: email,
      subject: "Reset Your meChat Password 🔐",
      text: `Your password reset code is: ${verificationCode}`,
      html: Reset_Password_Email_Template.replace(
        "{verificationCode}",
        verificationCode
      ),
      replyTo: process.env.BREVO_FROM,
    });

    // console.log("✅ Reset password email sent:", {
    //   to: email,
    //   messageId: response?.messageId,
    // });
  } catch (error) {
    console.error(
      "❌ Error sending reset password email:",
      error?.response || error
    );
  }
};
