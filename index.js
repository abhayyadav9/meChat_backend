import http from "http"
import express from 'express';
import connectDb from './src/config/db.js';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './src/routes/auth.routes.js';
import userRoutes from './src/routes/user.routes.js';
import googleRoutes from './src/routes/google.routes.js';
import invitationRoutes from './src/routes/invitation.routes.js';
import messageRoutes from './src/routes/message.routes.js';
import chatRoutes from './src/routes/chat.routes.js';


import cookieParser from 'cookie-parser';
import { setupSocket } from './src/config/socket.js';
import { sendResetPasswordEmail, sendVerificationCode, sendWelcomeEmail } from "./src/middleware/emailService/email.js";

dotenv.config();

const app = express();

// When running behind a proxy (Render, Heroku, Nginx, etc.),
// Express needs `trust proxy` set so middleware that reads
// the client IP (like express-rate-limit) will use the
// X-Forwarded-For header correctly. Set to true so Express
// trusts the proxy headers in hosted environments (Render).
// Using `true` is safe here because we expect the app to run
// behind a trusted reverse proxy in production.
app.set('trust proxy', true);
sendVerificationCode("yadav45abhay@gmail.com", "123456","abhay")
sendWelcomeEmail("yadav45abhay@gmail.com", "abhay")
sendResetPasswordEmail("yadav45abhay@gmail.com", "123456")

// const test = async () => {
//   try {
//     const result = await apiInstance.getSmtpStatus();
//     console.log(result);
//   } catch(err) {
//     console.error(err.response?.body || err);
//   }
// };
// test();


// Middleware
const corsOptions = {
    origin: process.env.FRONTEND_ORIGIN || 'https://me-chat-one.vercel.app',
    credentials: true,
};
app.use(cors(corsOptions));
app.use(express.json()); // MUST be before routes
app.use(express.urlencoded({ extended: true })); 

app.use(cookieParser());


// Test route
app.get('/', (req, res) => {
    res.send('Hello World!');
});

// Auth routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/invitations', invitationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/chats', chatRoutes);

app.use('/api/google', googleRoutes);
// Also mount under legacy path used by Google redirect URI in .env
app.use('/auth/google', googleRoutes);


//create HTTP server for socketio

const server = http.createServer(app);
setupSocket(server)


// Start server using the created HTTP server so Socket.IO is attached correctly
const PORT = process.env.PORT || 8080; // fallback is optional

server.listen(PORT, async () => {
    await connectDb(); // ensure DB connects before logging
    console.log(`Server is running at http://localhost:${PORT}`);
});
