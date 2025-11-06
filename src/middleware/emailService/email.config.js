import nodemailer from "nodemailer";
import dotenv from 'dotenv';
dotenv.config();


export const transporter = nodemailer.createTransport({
  host: process.env.BREVO_HOST, // smtp-relay.brevo.com
  port: 587, // 587
  secure: false, // Brevo uses STARTTLS, not SSL
  auth: {
    user: process.env.BREVO_USER, // e.g. 902842003@smtp-brevo.com
    pass: process.env.BREVO_PASS, // your Brevo SMTP key
  },
  // make failures more deterministic and fail fast when SMTP is unreachable
  connectionTimeout: parseInt(process.env.SMTP_CONNECTION_TIMEOUT || '10000', 10),
  greetingTimeout: parseInt(process.env.SMTP_GREETING_TIMEOUT || '5000', 10),
  // optional: enable pooling if sending many messages (not necessary for few emails)
  // pool: true,
});


